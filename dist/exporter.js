/* Local-only Gerber X2 / XNC export. No external libraries or requests. */
(function(root) {
  'use strict';
  const TEXT_TOLERANCE = 0.001; // mm; quadratic outlines are flattened to this tolerance.
  const decimal = n => {
    if (!Number.isFinite(n) || Math.abs(n)>=10000) throw new Error('座標或尺寸超出 Gerber 4.6 格式範圍。');
    return Number(n.toFixed(6)).toString();
  };
  const coordinate = n => { decimal(n); const value=Math.round(n*1e6); if(Math.abs(value)>=1e10)throw new Error('座標超出 Gerber 4.6 格式範圍。'); return String(value); };
  const xy = (x,y) => 'X'+coordinate(x)+'Y'+coordinate(y);
  const safeName = value => String(value).replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64)||'board';
  const rotate = (x,y,angle) => { const a=angle*Math.PI/180; return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]; };
  const same = (a,b) => Math.abs(a[0]-b[0])<1e-10 && Math.abs(a[1]-b[1])<1e-10;
  const midpoint = (a,b) => [(a[0]+b[0])/2,(a[1]+b[1])/2];
  function defaultRole(layer) {
    return ({COMP:'copper_top',SOLD:'copper_bottom',CMSK:'mask_top',SMSK:'mask_bottom',CILK:'legend_top',SILK:'legend_bottom'})[layer.name.toUpperCase()] || (layer.type===21?'drillmap':layer.isDrillDrawing?(layer.items.some(i=>i.kind!=='pad')?'fabrication':'drillmap'):'other');
  }
  function layerAttributes(layer,options={}) {
    const role=options.roles?.[layer.id]||defaultRole(layer),n=options.copperLayers??2;
    if(!Number.isInteger(n)||n<2||n>64)throw new Error('銅箔層數必須是 2 至 64 的整數。');
    const roles={copper_top:'Copper,L1,Top',copper_bottom:'Copper,L'+n+',Bot',mask_top:'Soldermask,Top',mask_bottom:'Soldermask,Bot',legend_top:'Legend,Top',legend_bottom:'Legend,Bot',paste_top:'Paste,Top',paste_bottom:'Paste,Bot',drillmap:'Drillmap',fabrication:'FabricationDrawing',other:'OtherDrawing,'+safeName(layer.name)};
    if(/^inner_\d+$/.test(role)){const p=Number(role.slice(6));if(p<2||p>=n)throw new Error('內層銅箔的層號必須介於 2 與總層數減 1。');roles[role]='Copper,L'+p+',Inr';}
    if(!roles[role])throw new Error('無效的 X2 圖層用途。');
    if(layer.type===21&&role!=='drillmap')throw new Error('NC 圖層須標示為鑽孔示意圖；實際加工資料在 Excellon 檔。');
    const polarity=options.polarities?.[layer.id]||(role.startsWith('mask_')?'Negative':'Positive');
    if(!['Positive','Negative'].includes(polarity)||(role==='drillmap'&&polarity!=='Positive'))throw new Error('無效的 X2 圖層極性。');
    return {role,fileFunction:roles[role],filePolarity:polarity};
  }
  function flattenQuadratic(a,b,c,out,depth=0) {
    const dx=c[0]-a[0],dy=c[1]-a[1],den=dx*dx+dy*dy;
    const t=den?Math.max(0,Math.min(1,((b[0]-a[0])*dx+(b[1]-a[1])*dy)/den)):0;
    const error=Math.hypot(b[0]-a[0]-t*dx,b[1]-a[1]-t*dy);
    if(error<=TEXT_TOLERANCE){out.push(c);return;}
    if(depth>=20)throw new Error('文字輪廓過於複雜。');
    const ab=midpoint(a,b),bc=midpoint(b,c),m=midpoint(ab,bc);
    flattenQuadratic(a,ab,m,out,depth+1);flattenQuadratic(m,bc,c,out,depth+1);
  }
  function flattenContour(contour,sx,sy) {
    let pts=contour.points.map(([x,y,f])=>[x*sx,y*sy,f]);
    if(pts.some(p=>p[2]!==0&&p[2]!==3))throw new Error('字型含未支援的曲線旗標。');
    if(pts.length>1&&same(pts[0],pts.at(-1)))pts.pop();
    if(pts.length<2)throw new Error('字型輪廓不完整。');
    // Embedded TrueType contours use on-curve (0) and off-curve (3) points.
    if(pts[0][2]!==0){if(pts.at(-1)[2]===0)pts.unshift(pts.pop());else pts.unshift([...midpoint(pts[0],pts.at(-1)),0]);}
    pts.push(pts[0]);const out=[pts[0].slice(0,2)];let last=out[0];
    for(let i=1;i<pts.length;i++) {
      const p=pts[i];
      if(p[2]===0){last=p.slice(0,2);out.push(last);}
      else {const next=pts[i+1];if(!next)throw new Error('字型曲線未封閉。');const end=next[2]===0?next.slice(0,2):midpoint(p,next);flattenQuadratic(last,p,end,out);last=end;if(next[2]===0)i++;}
    }
    if(!same(out[0],out.at(-1)))out.push(out[0]);
    if(out.length>5001)throw new Error('字型輪廓超出 Gerber 巨集頂點限制。');
    return out;
  }
  function textGlyphs(model,item) {
    const style=model.textStyles?.[item.style],font=style&&model.fonts?.[style.font];
    if(!font||!style)throw new Error('找不到文字的內嵌字型；可取消「包含文字」後匯出。');
    if(item.flags!==0||style.spacing!==0||style.slant!==0||style.angle!==0||style.alignment!==33||style.mode!==4||style.xScale!==1)throw new Error('這種文字樣式尚未支援匯出；可取消「包含文字」。');
    const glyphs=Array.from(item.text,c=>{const g=font.glyphs[c.codePointAt(0)];if(!g)throw new Error('內嵌字型缺少字元：'+c);return g;});
    const advance=glyphs.reduce((s,g)=>s+g.advance,0),length=Math.hypot(item.x2-item.x,item.y2-item.y);
    const sy=style.height/(font.ascent+font.descent),sx=advance?length/advance:sy;
    if(!Number.isFinite(sy)||sy<=0||!Number.isFinite(sx)||sx<=0)throw new Error('文字尺寸無效。');
    if(Math.abs(sx/sy-1)>.001)throw new Error('文字的字型尺寸與端點不一致，暫不匯出。');
    const angle=Math.atan2(item.y2-item.y,item.x2-item.x)*180/Math.PI;
    let offset=0;const result=[];
    for(const glyph of glyphs){
      const contours=glyph.contours.map(c=>{if(c.kind==='FONTLINE')throw new Error('線條字型尚未支援匯出；可取消「包含文字」。');return {dark:c.kind==='FONTPOLY',points:flattenContour(c,sx,sy).map(([x,y])=>rotate(x,y,angle))};});
      const [dx,dy]=rotate(offset,0,angle);result.push({x:item.x+dx,y:item.y+dy,contours});offset+=glyph.advance*sx;
    }
    return result;
  }
  class GerberWriter {
    constructor() {this.defs=[];this.commands=[];this.apertures=new Map();this.selected=null;this.next=10;}
    aperture(key,definition,macro) {
      if(this.apertures.has(key))return this.apertures.get(key);
      const code=this.next++;if(code>99999)throw new Error('光圈數量過多。');
      if(macro){const name='CAM'+code;this.defs.push('%AM'+name+'*\n'+macro.join('\n')+'\n%');definition=name;}
      this.defs.push('%ADD'+code+definition+'*%');this.apertures.set(key,code);return code;
    }
    circle(d,inner=0){if(!(d>0)||inner<0||inner>=d)throw new Error('圓形光圈尺寸無效。');return this.aperture('C'+d+','+inner,'C,'+decimal(d)+(inner?'X'+decimal(inner):''));}
    pad(a) {
      if(!a||!(a.w>0))throw new Error('找不到有效的焊盤光圈。');
      if(a.shape==='Round')return this.circle(a.w);
      if(a.shape==='Donut')return this.circle(a.w,a.h);
      if(!['Rectangle','Square','Oblong'].includes(a.shape)||!(a.h>0))throw new Error('未支援的光圈：'+a.shape);
      const key=JSON.stringify(a),rotation=a.rotation||0;
      if(rotation%360===0)return this.aperture(key,(a.shape==='Oblong'?'O':'R')+','+decimal(a.w)+'X'+decimal(a.h));
      let primitives=[];
      if(a.shape!=='Oblong')primitives=['21,1,'+decimal(a.w)+','+decimal(a.h)+',0,0,'+decimal(rotation)+'*'];
      else {
        const d=Math.min(a.w,a.h),delta=(Math.max(a.w,a.h)-d)/2;
        if(delta>0)primitives.push('21,1,'+decimal(a.w>a.h?2*delta:d)+','+decimal(a.w>a.h?d:2*delta)+',0,0,'+decimal(rotation)+'*');
        for(const sign of [-1,1]){const [x,y]=rotate(a.w>a.h?delta*sign:0,a.h>=a.w?delta*sign:0,rotation);primitives.push('1,1,'+[d,x,y,0].map(decimal).join(',')+'*');}
      }
      return this.aperture(key,'',primitives);
    }
    select(code){if(this.selected!==code){this.commands.push('D'+code+'*');this.selected=code;}}
    flash(code,x,y){this.select(code);this.commands.push(xy(x,y)+'D03*');}
    region(points){
      if(points.length<3)throw new Error('填色區域的頂點不足。');
      this.select(this.circle(.001));this.commands.push('G36*',xy(...points[0])+'D02*');
      for(const p of points.slice(1))this.commands.push(xy(...p)+'D01*');
      if(!same(points[0],points.at(-1)))this.commands.push(xy(...points[0])+'D01*');
      this.commands.push('G37*');
    }
    glyph(g){
      if(!g.contours.length)return;
      const primitives=g.contours.filter(c=>c.dark).concat(g.contours.filter(c=>!c.dark)).map(c=>'4,'+(c.dark?1:0)+','+(c.points.length-1)+','+c.points.flatMap(p=>p.map(decimal)).join(',')+',0*');
      this.flash(this.aperture(primitives.join(''),' ',primitives),g.x,g.y);
    }
    finish(attributes,date,coordinateId){return ['G04 Generated by CAM Lens - Gerber X2*','%TF.GenerationSoftware,CAMLens,CAMLens,1.1*%','%TF.CreationDate,'+date+'*%','%TF.FileFunction,'+attributes.fileFunction+'*%','%TF.FilePolarity,'+attributes.filePolarity+'*%','%TF.SameCoordinates,'+coordinateId+'*%','%FSLAX46Y46*%','%MOMM*%',...this.defs,'%LPD*%','G01*',...this.commands,'M02*',''].join('\n');}
  }
  function exportLayer(model,layer,options={}) {
    const w=new GerberWriter();let textCount=0,omittedText=0;
    for(const item of layer.items){
      const a=model.apertures[item.aperture];
      if(item.kind==='pad') {if(item.flags)throw new Error('焊盤含未支援的轉換旗標。');w.flash(w.pad(a),item.x,item.y);}
      else if(item.kind==='line'||item.kind==='circle') {
        if(item.fill!==0&&item.fill!==1)throw new Error('此圖層含未支援的填色或負片模式。');
        let width=item.width>=0?item.width:a?.w;
        if(item.fill===0&&(!(width>0)||(item.width<0&&a?.shape!=='Round')))throw new Error('此圖層含零寬度或非圓形光圈的線條，暫不匯出。');
        if(item.kind==='line'){
          if(item.fill===1)w.region(item.points);
          else {w.select(w.circle(width));w.commands.push(xy(...item.points[0])+'D02*');for(const p of item.points.slice(1))w.commands.push(xy(...p)+'D01*');}
        } else {
          if(!(item.r>0))throw new Error('圓形半徑必須大於零。');
          w.select(w.circle(item.fill===1?.001:width));
          if(item.fill===1)w.commands.push('G36*');
          w.commands.push(xy(item.x+item.r,item.y)+'D02*','G75*','G03*',xy(item.x-item.r,item.y)+'I'+coordinate(-item.r)+'J0D01*',xy(item.x+item.r,item.y)+'I'+coordinate(item.r)+'J0D01*');
          if(item.fill===1)w.commands.push('G37*');
          w.commands.push('G01*');
        }
      } else if(item.kind==='text') {if(options.includeText===false){omittedText++;continue;}for(const g of textGlyphs(model,item))w.glyph(g);textCount++;}
      else throw new Error('圖層含未支援的物件：'+item.kind);
    }
    // NC layers also get a Gerber drill map; actual manufacturing hits are separate XNC files.
    for(const d of layer.drills)w.flash(w.circle(d.diameter),d.x,d.y);
    const attributes=layerAttributes(layer,options);
    return {data:w.finish(attributes,options.creationDate||new Date().toISOString(),safeName(options.coordinateId||'CAMLens')),textCount,omittedText,...attributes};
  }
  function exportDrills(drills) {
    const tools=new Map();
    for(const d of drills){if(!(d.diameter>0)||!Number.isFinite(d.diameter))throw new Error('鑽孔缺少有效的刀具直徑。');const key=d.table+':'+d.tool;if(!tools.has(key))tools.set(key,{sourceTable:d.table,sourceId:d.tool,sourceNumber:d.toolNumber,diameter:d.diameter,hits:0});const t=tools.get(key);if(t.diameter!==d.diameter)throw new Error('同一刀具出現不一致的直徑。');t.hits++;}
    if(tools.size>99)throw new Error('鑽孔刀具超過 XNC 的 99 把限制。');
    const used=new Set();for(const t of tools.values()){let n=t.sourceNumber;if(!Number.isInteger(n)||n<1||n>99||used.has(n)){n=1;while(used.has(n))n++;}used.add(n);t.exportNumber=n;}
    const tc=t=>'T'+String(t.exportNumber).padStart(2,'0');
    const rows=['M48','; CAM Lens - XNC metric decimal coordinates','METRIC'];for(const t of tools.values())rows.push(tc(t)+'C'+xncDecimal(t.diameter));rows.push('%','G05');
    for(const [key,t] of tools){rows.push(tc(t));for(const d of drills)if(d.table+':'+d.tool===key)rows.push('X'+xncDecimal(d.x)+'Y'+xncDecimal(d.y));}
    rows.push('M30','');return {data:rows.join('\n'),tools:[...tools.values()]};
  }
  function xncDecimal(n){const s=decimal(n);return s.includes('.')?s:s+'.0';}
  function buildExport(model,options={}) {
    const includeText=options.includeText!==false,includeDrills=options.includeDrills!==false;
    const blocking=model.warnings.filter(w=>w.message!=='文字需覆核字型輪廓');
    if(blocking.length)throw new Error('檔案含未支援的資料，無法完整匯出：'+blocking.map(w=>w.message).join('；'));
    const layers=options.layerIds?model.layers.filter(l=>options.layerIds.includes(l.id)):model.layers;
    if(!layers.length)throw new Error('請至少勾選一個圖層。');
    if(options.layerIds?.some(id=>!model.layers.some(l=>l.id===id)))throw new Error('匯出的圖層 ID 無效。');
    const prefix=safeName(model.name),files=[],creationDate=new Date().toISOString(),coordinateId=root.crypto?.randomUUID?.()||('CAMLens_'+Date.now()+'_'+Math.random().toString(36).slice(2)),manifest={format:'Gerber X2',exporter:'CAM Lens 1.1',source:model.name,created:creationDate,units:'mm',coordinateFormat:'4.6',coordinateId,origin:'Unchanged source coordinates',copperLayerCount:options.copperLayers??2,textCurveToleranceMM:TEXT_TOLERANCE,files:[],notes:[]};
    for(const layer of layers){
      let output;try{output=exportLayer(model,layer,{...options,includeText,creationDate,coordinateId});}catch(e){const error=new Error(layer.name+'：'+e.message);error.detail=e.message;error.layerName=layer.name;throw error;}
      const name=prefix+'_L'+layer.id+'_'+safeName(layer.name)+(layer.type===21?'_drill_map':'')+'.gbr';files.push({name,data:output.data});
      manifest.files.push({file:name,format:'Gerber X2',layerId:layer.id,layerName:layer.name,fileFunction:output.fileFunction,filePolarity:output.filePolarity,sourceObjects:layer.items.length,drillMapHits:layer.drills.length,textObjects:output.textCount,omittedTextObjects:output.omittedText});
      if(output.textCount)manifest.notes.push(name+': text reconstructed from embedded font; quadratic curves approximated within 0.001 mm. Verify appearance.');
      if(output.omittedText)manifest.notes.push(name+': '+output.omittedText+' text object(s) intentionally excluded.');
      if(includeDrills){for(const plated of [true,false]){const ds=layer.drills.filter(d=>d.plated===plated);if(!ds.length)continue;const nc=exportDrills(ds),ncName=prefix+'_L'+layer.id+(plated?'_PTH':'_NPTH')+'.drl';files.push({name:ncName,data:nc.data});manifest.files.push({file:ncName,format:'Excellon / XNC',plated,layerId:layer.id,hits:ds.length,tools:nc.tools});}}
    }
    manifest.notes.push('X2 roles default from common source layer names and can be changed in the export dialog. Copper layer count defaults to 2. No board profile is synthesized. Confirm assignments before fabrication.');
    manifest.notes.push('Drill drawings preserve design diameters; Excellon uses NC tool diameters including the source compensation.');
    if(!includeDrills)manifest.notes.push('Excellon files intentionally excluded. Gerber drill maps are reference drawings only.');
    const readme=['CAM Lens · Gerber X2 export', 'English / 繁體中文', '', 'Source: '+model.name, 'Units: mm. Original coordinates and layer names are preserved without scaling or mirroring.', 'Gerber X2: absolute 4.6 coordinates, file function and polarity, common coordinate ID and creation metadata.', 'Excellon / XNC: metric decimal coordinates, separate PTH / NPTH files, original NC tool diameters.', 'Drill maps are reference drawings; they do not replace NC drilling files.', 'Layer functions use the export settings. Soldermask defaults to Negative (openings). Verify layer assignments.', 'No standalone Profile file is synthesized. Supply a verified board outline before fabrication.', 'Text uses embedded font outlines, with curves approximated within 0.001 mm. Check appearance.', 'Unavailable source net, pin and component attributes are not invented.', 'See manifest.json for file roles, counts, text exclusions and NC tool mappings.', '', '--- 繁體中文 ---', '', 'CAM Lens · Gerber X2 圖層匯出','', '來源：'+model.name, '單位：mm。保留原點、座標及原始圖層名稱，不旋轉、不鏡像。', 'Gerber X2：4 位整數 / 6 位小數；含 FileFunction、FilePolarity、SameCoordinates、CreationDate、GenerationSoftware 屬性。', '鑽孔：Excellon / XNC，METRIC，明確小數座標，PTH / NPTH 分檔。','', '注意事項', '• 孔位圖保留孔圖直徑；.drl 保留 NC 刀具直徑（包含原檔補償）。', '• drill_map.gbr 是鑽孔示意圖，不能取代 .drl 鑽孔檔。', '• 層別按匯出設定寫入 X2；防焊預設為開窗（Negative）。請確認用途、銅箔層數與極性。', '• 未自動生成純板框 Profile 檔；製板仍需獨立、經確認的板框資料。', '• 文字使用檔內字型重建，曲線以 0.001 mm 容差轉成折線，請覆核文字外觀。', '• 原檔沒有可靠的元件／網路對應，因此未加入網路與腳位屬性。', '• 本工具支援 CAM350 ASCII 的部分圖形，不等同完整 CAM350 轉換器。','',...manifest.files.map(f=>f.file), '',...manifest.notes,''].join('\n');
    files.push({name:'README.txt',data:readme},{name:'manifest.json',data:JSON.stringify(manifest,null,2)+'\n'});
    return {name:prefix+'-gerber-x2.zip',files,manifest};
  }
  const crcTable=Array.from({length:256},(_,n)=>{for(let j=0;j<8;j++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function crc32(data){let n=0xffffffff;for(const b of data)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
  function zip(files) {
    if(files.length>65535)throw new Error('匯出檔案太多。');
    const encoder=new TextEncoder(),locals=[],centrals=[];let offset=0,total=0;
    const header=size=>{const bytes=new Uint8Array(size);return {bytes,v:new DataView(bytes.buffer)};};
    for(const file of files){
      const name=encoder.encode(file.name),data=typeof file.data==='string'?encoder.encode(file.data):file.data;
      if(name.length>65535||data.length>100*1024*1024||offset+data.length>200*1024*1024)throw new Error('匯出資料過大，請分批選取圖層。');
      const crc=crc32(data),l=header(30),c=header(46);
      l.v.setUint32(0,0x04034b50,true);l.v.setUint16(4,20,true);l.v.setUint16(6,0x800,true);l.v.setUint16(12,0x21,true);l.v.setUint32(14,crc,true);l.v.setUint32(18,data.length,true);l.v.setUint32(22,data.length,true);l.v.setUint16(26,name.length,true);
      c.v.setUint32(0,0x02014b50,true);c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);c.v.setUint16(8,0x800,true);c.v.setUint16(14,0x21,true);c.v.setUint32(16,crc,true);c.v.setUint32(20,data.length,true);c.v.setUint32(24,data.length,true);c.v.setUint16(28,name.length,true);c.v.setUint32(42,offset,true);
      locals.push(l.bytes,name,data);centrals.push(c.bytes,name);offset+=30+name.length+data.length;total+=46+name.length;
    }
    const e=header(22);e.v.setUint32(0,0x06054b50,true);e.v.setUint16(8,files.length,true);e.v.setUint16(10,files.length,true);e.v.setUint32(12,total,true);e.v.setUint32(16,offset,true);
    const result=new Uint8Array(offset+total+22);let pos=0;for(const part of [...locals,...centrals,e.bytes]){result.set(part,pos);pos+=part.length;}return result;
  }
  root.CAMExporter={buildExport,exportLayer,exportDrills,textGlyphs,zip,defaultRole,layerAttributes,TEXT_TOLERANCE};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.CAMExporter;
})(typeof globalThis!=='undefined'?globalThis:this);
