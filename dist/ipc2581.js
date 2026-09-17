/* IPC-2581C USERDEF geometry exchange. No inferred components, nets or profile. */
(function(root){
 'use strict';
 const gerber=typeof module!=='undefined'&&module.exports?require('./exporter.js'):root.CAMExporter;
 const SCHEMA='https://webstds.ipc.org/2581/IPC-2581C.xsd';
 const num=n=>{if(!Number.isFinite(n)||Math.abs(n)>=10000)throw new Error('座標或尺寸超出 Gerber 4.6 格式範圍。');return Number(n.toFixed(6)).toString();};
 function esc(value){const s=String(value);for(const c of s){const n=c.codePointAt(0);if((n<32&&![9,10,13].includes(n))||(n>=0xd800&&n<=0xdfff)||n===0xfffe||n===0xffff)throw new Error('文字含 XML 不允許的字元。');}return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/\r/g,'&#13;').replace(/\n/g,'&#10;').replace(/\t/g,'&#9;');}
 const tag=(name,attrs={},body)=>'<'+name+Object.entries(attrs).map(([k,v])=>' '+k+'="'+esc(v)+'"').join('')+(body===undefined?'/>' :'>'+body+'</'+name+'>');
 const attr=(name,value,type='STRING')=>tag('NonstandardAttribute',{name:'CAMLens:'+name,type,value});
 const location=(x,y)=>tag('Location',{x:num(x),y:num(y)});
 const fill=()=>tag('FillDesc',{fillProperty:'FILL'});
 const lineDesc=width=>tag('LineDesc',{lineEnd:'ROUND',lineWidth:num(width)});
 const features=(body,x=0,y=0,rotation=0)=>tag('Features',{},(rotation?tag('Xform',{rotation:num((rotation%360+360)%360)}):'')+location(x,y)+body);
 const polygon=(points,name='Polygon')=>{const ps=points.slice();if(ps[0][0]!==ps.at(-1)[0]||ps[0][1]!==ps.at(-1)[1])ps.push(ps[0]);return tag(name,{},tag('PolyBegin',{x:num(ps[0][0]),y:num(ps[0][1])})+ps.slice(1).map(([x,y])=>tag('PolyStepSegment',{x:num(x),y:num(y)})).join(''));};
 function contains(points,p){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0));
 function glyph(g){
  const outers=g.contours.filter(c=>c.dark).map(c=>({...c,holes:[]}));
  for(const hole of g.contours.filter(c=>!c.dark)){const candidates=outers.filter(c=>contains(c.points,hole.points[0])).sort((a,b)=>area(a.points)-area(b.points));if(!candidates.length)throw new Error('文字挖空輪廓無法對應外框。');candidates[0].holes.push(hole);}
  return outers.map(c=>features(tag('Contour',{},polygon(c.points)+c.holes.map(h=>polygon(h.points,'Cutout')).join('')),g.x,g.y)).join('');
 }
 function primitive(a){
  if(a.shape==='Round')return tag('Circle',{diameter:num(a.w)},fill());
  if(a.shape==='Donut')return tag('Donut',{shape:'ROUND',outerDiameter:num(a.w),innerDiameter:num(a.h)},fill());
  if(a.shape==='Oblong')return tag('RectRound',{width:num(a.w),height:num(a.h),radius:num(Math.min(a.w,a.h)/2),upperRight:true,upperLeft:true,lowerLeft:true,lowerRight:true},fill());
  return tag('RectCenter',{width:num(a.w),height:num(a.h)},fill());
 }
 function layerFunction(role){return role.startsWith('copper_')||role.startsWith('inner_')?'CONDUCTOR':role.startsWith('mask_')?'SOLDERMASK':role.startsWith('legend_')?'LEGEND':role.startsWith('paste_')?'SOLDERPASTE':'DOCUMENT';}
 const side=role=>role.endsWith('_top')?'TOP':role.endsWith('_bottom')?'BOTTOM':role.startsWith('inner_')?'INTERNAL':'NONE';
 function buildExport(model,options={}){
  // Reuse the existing fail-closed geometry checks and exact XNC writer.
  const checked=gerber.buildExport(model,options);
  if(Object.values(model.sourceData||{}).some(n=>n>0))throw new Error('元件或網路資料尚未支援 IPC-2581 匯出。');
  const layers=options.layerIds?model.layers.filter(l=>options.layerIds.includes(l.id)):model.layers;
  const names=new Map(layers.map((l,i)=>[l.id,'L'+(i+1)])),defs=new Map(),layerXML=[],featureXML=[],layerInfo=[];
  let omittedText=0,textObjects=0,drillReferences=0;
  const standard=(key,shape)=>{if(!defs.has(key))defs.set(key,{id:'P'+(defs.size+1),shape});return tag('StandardPrimitiveRef',{id:defs.get(key).id});};
  for(const layer of layers){
   const a=gerber.layerAttributes(layer,options),name=names.get(layer.id),sets=[];
   layerXML.push(tag('Layer',{name,layerFunction:layerFunction(a.role),side:side(a.role),polarity:a.filePolarity.toUpperCase()}));
   let geometry='';
   for(const item of layer.items){
    const aperture=model.apertures[item.aperture];
    if(item.kind==='pad')geometry+=features(standard('A'+item.aperture,primitive(aperture)),item.x,item.y,aperture.rotation||0);
    else if(item.kind==='line'){
     if(item.fill===1)geometry+=features(tag('Contour',{},polygon(item.points)));
     else geometry+=features(tag('Polyline',{},tag('PolyBegin',{x:num(item.points[0][0]),y:num(item.points[0][1])})+item.points.slice(1).map(([x,y])=>tag('PolyStepSegment',{x:num(x),y:num(y)})).join('')+lineDesc(item.width>=0?item.width:aperture.w)));
    }else if(item.kind==='circle'){
     if(item.fill===1)geometry+=features(standard('C'+num(item.r*2),tag('Circle',{diameter:num(item.r*2)},fill())),item.x,item.y);
     else {const w=lineDesc(item.width>=0?item.width:aperture.w);for(const sign of [1,-1])geometry+=features(tag('Arc',{startX:num(item.x+sign*item.r),startY:num(item.y),endX:num(item.x-sign*item.r),endY:num(item.y),centerX:num(item.x),centerY:num(item.y),clockwise:false},w));}
    }else if(item.kind==='text'){
     if(options.includeText===false){omittedText++;continue;}
     sets.push(tag('Set',{geometryUsage:'TEXT'},attr('SourceText',item.text)+attr('SourceTextStyle',item.style,'INTEGER')+gerber.textGlyphs(model,item).map(glyph).join('')));textObjects++;
    }
   }
   sets.unshift(tag('Set',{geometryUsage:'GRAPHIC'},attr('SourceLayerName',layer.name)+attr('SourceLayerId',layer.id,'INTEGER')+attr('LayerRole',a.role)+geometry));
   if(options.includeDrills!==false)for(const d of layer.drills){
    // Hole requires numeric +/- tolerance. Unknown is not zero. Keep NC as
    // reference graphics + explicit attributes and supply machining data as XNC.
    sets.push(tag('Set',{geometryUsage:'GRAPHIC'},attr('RecordType','NC_HIT_REFERENCE')+attr('ToolDiameterMM',num(d.diameter),'DOUBLE')+attr('SourceToolTable',d.table,'INTEGER')+attr('SourceToolId',d.tool,'INTEGER')+attr('SourceToolNumber',d.toolNumber,'INTEGER')+attr('Plated',d.plated,'BOOLEAN')+attr('DrawingDiametersMM',JSON.stringify(d.designDiameters||[]))+features(standard('C'+num(d.diameter),tag('Circle',{diameter:num(d.diameter)},fill())),d.x,d.y)));drillReferences++;
   }
   featureXML.push(tag('LayerFeature',{layerRef:name},sets.join('\n')));
   layerInfo.push({sourceId:layer.id,sourceName:layer.name,ipcName:name,function:layerFunction(a.role),side:side(a.role),polarity:a.filePolarity.toUpperCase(),role:a.role,sourceObjects:layer.items.length,ncReferenceHits:options.includeDrills===false?0:layer.drills.length});
  }
  const notes=[
   'Partial IPC-2581C USERDEF geometry exchange, not a complete fabrication or assembly package.',
   'No components, packages, BOM, part numbers, placement, pin/net assignments, verified Profile, V-cut intent or material stackup are inferred.',
   'Mixed drill/outline drawings remain DOCUMENT layers. Drawing bounds are not a board Profile.',
   'NC hits are reference circles with CAMLens nonstandard attributes, not standard Hole elements: source hole tolerances are unknown. No zero tolerance is invented. Consumers may ignore these attributes.',
   options.includeDrills===false?'NC references and Excellon files intentionally excluded.':'Use the accompanying Excellon / XNC files for NC tool diameters and hit locations. Drawing diameters remain unchanged; they may differ from compensated NC tool diameters.',
   'Text is preserved as source text metadata and embedded-font outlines; quadratic curves are approximated within 0.001 mm.',
   'Layer roles are user-confirmed suggestions. Copper layer count does not define dielectric thicknesses or a material stackup.',
   'Coordinates, units and orientation are preserved without scaling or mirroring. Original layer names are retained in attributes and manifest; XML layer IDs are unique.',
  ];
  if(omittedText)notes.push(omittedText+' text object(s) intentionally excluded.');
  const date=new Date().toISOString(),manifest={format:'IPC-2581C',mode:'USERDEF',scope:'Geometry and NC references; partial exchange',source:model.name,created:date,units:'MILLIMETER',copperLayerCount:options.copperLayers??2,schema:SCHEMA,layers:layerInfo,textObjects,omittedTextObjects:omittedText,ncReferenceHits:drillReferences,components:'not available',bom:'not available',nets:'not available',profile:'not inferred',stackup:'not available',holeTolerances:'unknown; standard Hole elements omitted',sourceData:model.sourceData||null,notes};
  const content=tag('Content',{roleRef:'CAMLensExport'},tag('FunctionMode',{mode:'USERDEF',comment:notes[0]})+tag('StepRef',{name:'BOARD'})+layerInfo.map(l=>tag('LayerRef',{name:l.ipcName})).join('')+tag('DictionaryStandard',{units:'MILLIMETER'},[...defs.values()].map(d=>tag('EntryStandard',{id:d.id},d.shape)).join('')));
  const logistics=tag('LogisticHeader',{},tag('Role',{id:'CAMLensExport',roleFunction:'SENDER',description:'Software-generated local conversion; original author not identified'})+tag('Enterprise',{id:'CAMLens',name:'CAM Lens converter',code:'NOT_PROVIDED'})+tag('Person',{name:'Not provided',enterpriseRef:'CAMLens',roleRef:'CAMLensExport'}));
  const history=tag('HistoryRecord',{number:1,origination:date,lastChange:date,software:'CAM Lens',lifecyclePhase:'CAM conversion'},tag('FileRevision',{fileRevisionId:'1',comment:notes[0]},tag('SoftwarePackage',{name:'CAM Lens',vendor:'CAM Lens contributors',revision:'1.2'},tag('Certification',{certificationStatus:'SELFTEST'}))));
  const metadata=attr('SourceFileName',model.name)+attr('SourceCAMVersion',model.version||'')+attr('CopperLayerCount',options.copperLayers??2,'INTEGER')+attr('ExportScope',notes.join(' '))+attr('OmittedTextObjects',omittedText,'INTEGER');
  const ecad=tag('Ecad',{name:'CAM_LENS'},tag('CadHeader',{units:'MILLIMETER'})+tag('CadData',{},layerXML.join('\n')+tag('Step',{name:'BOARD'},metadata+tag('Datum',{x:'0',y:'0'})+featureXML.join('\n'))));
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+tag('IPC-2581',{xmlns:'http://webstds.ipc.org/2581','xmlns:xsi':'http://www.w3.org/2001/XMLSchema-instance','xsi:schemaLocation':'http://webstds.ipc.org/2581 '+SCHEMA,revision:'C'},content+logistics+history+ecad)+'\n';
  if(xml.length>80*1024*1024)throw new Error('匯出資料過大，請分批選取圖層。');
  const prefix=checked.name.replace(/-gerber-x2\.zip$/,''),files=[{name:prefix+'-ipc2581.xml',data:xml},...checked.files.filter(f=>f.name.endsWith('.drl'))];
  manifest.drillFiles=checked.manifest.files.filter(f=>f.format==='Excellon / XNC');
  files.push({name:'manifest.json',data:JSON.stringify(manifest,null,2)+'\n'},{name:'README.txt',data:[
   'CAM Lens · IPC-2581C / English / 繁體中文','',...notes,'',
   '此為 IPC-2581C USERDEF 圖形與鑽孔參考資料，不是完整製板／組裝資料。',
   '原檔沒有可靠的元件、料號、BOM、座標、網路、純板框或材料疊構，匯出不會補造。',
   'NC 孔位以參考圓形及 CAMLens 屬性保存；未填入不明孔徑公差，因此不輸出標準 Hole 元素。其他軟體可能忽略自訂屬性。',
   options.includeDrills===false?'已依選項排除 NC 參考資料及鑽孔檔。':'實際刀徑與孔位另附於 Excellon 鑽孔檔；孔圖保留原值，可能與刀徑不同。',
   '混合圖層保留為 DOCUMENT，不會自動視為板框或 V-cut。文字曲線近似容差為 0.001 mm。',
   '請查看 manifest.json 的圖層對照、匯出範圍與排除項目。',
   'XML 結構驗證不代表設計完整、可直接製造或所有 CAM 軟體均可匯入。',''
  ].join('\n')});
  return {name:prefix+'-ipc2581.zip',files,manifest};
 }
 root.CAMIPC2581={buildExport,SCHEMA};if(typeof module!=='undefined'&&module.exports)module.exports=root.CAMIPC2581;
})(typeof globalThis!=='undefined'?globalThis:this);
