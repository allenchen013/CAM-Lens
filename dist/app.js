/* No network requests: board files remain in this page's memory. */
'use strict';
const $ = id => document.getElementById(id);
const trn = (key,values) => CAMI18n.t(key,values);
try { CAMI18n.setLanguage(CAMI18n.initialLanguage(window.localStorage,navigator.language),false); }
catch { CAMI18n.setLanguage(CAMI18n.initialLanguage(null,navigator.language),false); }
CAMI18n.apply(document);
const canvas = $('board'), ctx = canvas.getContext('2d'), wrap = $('canvasWrap');
const colors = ['#efb968','#73b4ee','#64d7a3','#b28aeb','#d8e5f1','#f199ac','#a49bf1','#64ccda','#efbb78','#edf7ff'];
const state = { model:null, scale:1, fitScale:1, cx:0, cy:0, width:1, height:1, mode:'pan', points:[], selected:null, filter:null, grid:true, demo:true, frame:0, groups:[], drag:null };
const fmt = n => Number.isFinite(n) ? n.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') : '—';
const htmlNode = (tag, text, className) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text;if(className)n.className=className;return n; };
function notify(text) { $('toast').textContent=text; $('toast').hidden=false; clearTimeout(notify.timer); notify.timer=setTimeout(()=>$('toast').hidden=true,6500); }
function screen(x,y){return [(x-state.cx)*state.scale+state.width/2, state.height/2-(y-state.cy)*state.scale];}
function world(x,y){return [(x-state.width/2)/state.scale+state.cx, (state.height/2-y)/state.scale+state.cy];}
function drawSoon(){if(!state.frame)state.frame=requestAnimationFrame(()=>{state.frame=0;render();});}
function fit(){if(!state.model)return;const b=state.model.bounds;state.cx=(b[0]+b[2])/2;state.cy=(b[1]+b[3])/2;state.scale=Math.min((state.width-100)/Math.max(b[2]-b[0],1),(state.height-120)/Math.max(b[3]-b[1],1));state.scale=Math.max(.02,state.scale);state.fitScale=state.scale;drawSoon();}
function zoom(factor,x=state.width/2,y=state.height/2){const before=world(x,y);state.scale=Math.max(state.fitScale*.15,Math.min(state.fitScale*300,state.scale*factor));const after=world(x,y);state.cx+=before[0]-after[0];state.cy+=before[1]-after[1];drawSoon();}
function shapePath(a,x,y){
  const p=new Path2D(),w=a.w,h=a.h;
  if(a.shape==='Round'||a.shape==='Donut'){p.arc(0,0,w/2,0,Math.PI*2);if(a.shape==='Donut'&&h>0){p.moveTo(h/2,0);p.arc(0,0,h/2,0,Math.PI*2,true);}}
  else if(a.shape==='Square'||a.shape==='Rectangle'){p.rect(-w/2,-h/2,w,h);}
  else if(a.shape==='Oblong'){
    const r=Math.min(w,h)/2;
    if(w>=h){p.moveTo(-(w-h)/2,-r);p.lineTo((w-h)/2,-r);p.arc((w-h)/2,0,r,-Math.PI/2,Math.PI/2);p.lineTo(-(w-h)/2,r);p.arc(-(w-h)/2,0,r,Math.PI/2,Math.PI*1.5);}
    else {p.moveTo(r,-(h-w)/2);p.lineTo(r,(h-w)/2);p.arc(0,(h-w)/2,r,0,Math.PI);p.lineTo(-r,-(h-w)/2);p.arc(0,-(h-w)/2,r,Math.PI,Math.PI*2);}p.closePath();
  } else return null;
  const out=new Path2D();out.addPath(p,new DOMMatrix().translate(x,y).rotate(a.rotation||0));return out;
}
function compile(){
 state.groups=state.model.layers.map((l,index)=>{
  l.color=colors[index%colors.length];const fills=new Path2D(),clears=new Path2D(),strokes=new Map(),texts=[],glyphPaths=[];
  function stroke(path,width,cap='round'){const key=width+':'+cap;if(!strokes.has(key))strokes.set(key,{path:new Path2D(),width,cap});strokes.get(key).path.addPath(path);}
  for(const item of l.items){
   const a=state.model.apertures[item.aperture];
   if(item.kind==='pad'){const p=shapePath(a,item.x,item.y);if(p)fills.addPath(p);}
   if(item.kind==='line'){
    const p=new Path2D();item.points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));
    if(item.fill===1||item.fill===3){p.closePath();(item.fill===3?clears:fills).addPath(p);}else stroke(p,item.width>=0?item.width:(a?.w||0),a?.shape==='Square'?'square':'round');
   }
   if(item.kind==='circle'){const p=new Path2D();p.arc(item.x,item.y,item.r,0,Math.PI*2);if(item.fill===1||item.fill===3)(item.fill===3?clears:fills).addPath(p);else stroke(p,item.width>=0?item.width:a?.w||0);}
   if(item.kind==='text'){
    try {for(const g of CAMExporter.textGlyphs(state.model,item)){const p=new Path2D();for(const c of g.contours){c.points.forEach(([x,y],i)=>i?p.lineTo(g.x+x,g.y+y):p.moveTo(g.x+x,g.y+y));p.closePath();}glyphPaths.push(p);}}
    catch {texts.push(item);}
   }
  }
  return {layer:l,fills,clears,strokes:[...strokes.values()],texts,glyphPaths};
 });
}
function niceStep(target){const base=10**Math.floor(Math.log10(target));for(const n of [1,2,5,10])if(base*n>=target)return base*n;return base*10;}
function render(){
 if(!state.model)return;const dpr=Math.min(window.devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,state.width,state.height);
 if(state.grid){
  const step=niceStep(30/state.scale),[minX,maxY]=world(0,0),[maxX,minY]=world(state.width,state.height);
  ctx.strokeStyle='#1b283b';ctx.lineWidth=1;ctx.beginPath();
  for(let x=Math.ceil(minX/step)*step;x<=maxX;x+=step){const px=screen(x,0)[0];ctx.moveTo(px,0);ctx.lineTo(px,state.height);}
  for(let y=Math.ceil(minY/step)*step;y<=maxY;y+=step){const py=screen(0,y)[1];ctx.moveTo(0,py);ctx.lineTo(state.width,py);}ctx.stroke();
 }
 ctx.save();ctx.translate(state.width/2,state.height/2);ctx.scale(state.scale,-state.scale);ctx.translate(-state.cx,-state.cy);
 for(const group of state.groups){
  const l=group.layer;if(!l.visible)continue;ctx.globalAlpha=l.type===21?1:.85;ctx.fillStyle=l.color;ctx.strokeStyle=l.color;ctx.fill(group.fills);
  for(const st of group.strokes){ctx.lineWidth=st.width||.8/state.scale;ctx.lineCap=st.cap;ctx.lineJoin='round';ctx.stroke(st.path);}
  // Clear geometry is currently not present in the verified sample; warn in the parser before relying on it.
  for(const path of group.glyphPaths)ctx.fill(path,'evenodd');
  for(const t of group.texts){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(Math.atan2(t.y2-t.y,t.x2-t.x));ctx.scale(1,-1);const length=Math.hypot(t.x2-t.x,t.y2-t.y);ctx.font='2px sans-serif';const tw=ctx.measureText(t.text).width;if(tw>0)ctx.scale(length/tw,1);ctx.fillText(t.text,0,0);ctx.restore();}
  for(const d of l.drills){if(!Number.isFinite(d.diameter))continue;ctx.beginPath();ctx.arc(d.x,d.y,d.diameter/2,0,Math.PI*2);ctx.fillStyle='#0a111c';ctx.fill();ctx.lineWidth=1.15/state.scale;ctx.strokeStyle=l.color;ctx.stroke();if(d.diameter*state.scale>12){const r=Math.min(d.diameter*.16,3/state.scale);ctx.beginPath();ctx.moveTo(d.x-r,d.y);ctx.lineTo(d.x+r,d.y);ctx.moveTo(d.x,d.y-r);ctx.lineTo(d.x,d.y+r);ctx.stroke();}}
 }
 ctx.globalAlpha=1;
 const highlighted=state.filter?state.model.drills.filter(d=>drillKey(d)===state.filter):[];
 if(state.selected&&!highlighted.includes(state.selected))highlighted.push(state.selected);
 for(const d of highlighted){ctx.strokeStyle='#69ffe0';ctx.lineWidth=2/state.scale;ctx.beginPath();ctx.arc(d.x,d.y,Math.max((d.diameter||.5)/2+3/state.scale,5/state.scale),0,Math.PI*2);ctx.stroke();}
 if(state.points.length){ctx.strokeStyle='#fbd083';ctx.fillStyle='#fbd083';ctx.lineWidth=1.5/state.scale;ctx.beginPath();state.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();for(const [x,y]of state.points){ctx.beginPath();ctx.arc(x,y,3/state.scale,0,Math.PI*2);ctx.fill();}}
 ctx.restore();
 const ruler=niceStep(70/state.scale);$('scaleBar').firstElementChild.style.width=ruler*state.scale+'px';$('scaleBar').lastElementChild.textContent=fmt(ruler)+' mm';$('zoomStatus').textContent=Math.round(state.scale/state.fitScale*100)+'%';
}
function drillKey(d){return d.table+':'+d.tool;}
function renderLayers(){
 $('layers').replaceChildren();
 for(const l of state.model.layers){
  const row=htmlNode('div',undefined,'layer-row'),check=document.createElement('input');check.type='checkbox';check.checked=l.visible;check.id='layer-'+l.id;check.setAttribute('aria-label',trn('showLayer',{name:l.name}));check.onchange=()=>{l.visible=check.checked;drawSoon();};
  const swatch=htmlNode('span',undefined,'swatch');swatch.style.background=l.color;const label=htmlNode('label',l.name,'layer-name');label.htmlFor=check.id;
  const role=l.type===21?'nc':l.isDrillDrawing?'drillDrawing':({COMP:'copper_top',SOLD:'copper_bottom',CMSK:'mask_top',SMSK:'mask_bottom',CILK:'legend_top',SILK:'legend_bottom'})[l.name];if(role)label.append(htmlNode('small',trn('role.'+role)));
  const solo=htmlNode('button',trn('solo'),'solo');solo.setAttribute('aria-label',trn('soloLayer',{name:l.name}));solo.onclick=()=>{state.model.layers.forEach(o=>o.visible=o===l);renderLayers();drawSoon();};row.append(check,swatch,label,solo);$('layers').append(row);
 }
}
function renderDrills(){
 $('drillRows').replaceChildren();const used=state.model.tools.filter(t=>t.hits>0).sort((a,b)=>a.diameter-b.diameter);
 for(const t of used){const key=t.table+':'+t.id,ds=state.model.drills.filter(d=>drillKey(d)===key),designs=[...new Set(ds.flatMap(d=>d.designDiameters))].sort((a,b)=>a-b),tr=htmlNode('tr');tr.classList.toggle('selected',state.filter===key);
  const td=htmlNode('td'),button=htmlNode('button','T'+t.number,'tool-link');button.setAttribute('aria-label',trn('highlightTool',{tool:t.number,drawing:designs.map(fmt).join('/')||'—',diameter:fmt(t.diameter),count:t.hits}));button.setAttribute('aria-pressed',String(state.filter===key));td.append(button);tr.append(td,htmlNode('td',designs.length?designs.map(fmt).join(' / '):'—'),htmlNode('td',fmt(t.diameter)),htmlNode('td',String(t.hits)));
  tr.onclick=()=>{state.filter=state.filter===key?null:key;state.selected=null;$('selection').hidden=true;renderDrills();drawSoon();};$('drillRows').append(tr);
 }
 if(!used.length){const tr=htmlNode('tr'),td=htmlNode('td',trn('noNC'));td.colSpan=4;tr.append(td);$('drillRows').append(tr);}
 $('clearFilter').hidden=!state.filter;
}
function renderMetadata(){
 const m=state.model,b=m.bounds,name=state.demo?trn('demoName'):m.name;
 $('fileName').textContent=name;$('fileMeta').textContent=trn('fileMeta',{version:m.version||'ASCII',count:m.entityCount.toLocaleString(CAMI18n.language)});
 $('demoBadge').hidden=!state.demo;$('viewLabel').textContent=state.demo?trn('demoView'):name;$('layerCount').textContent=trn('layerCount',{count:m.layers.length});$('holeCount').textContent=trn('holeCount',{count:m.drills.length.toLocaleString(CAMI18n.language)});
 $('boardSize').textContent=trn('boardSize',{width:fmt(b[2]-b[0]),height:fmt(b[3]-b[1])});$('renderStatus').textContent=m.warnings.length?trn('displayNotes',{count:m.warnings.length}):trn('loaded');$('warnings').replaceChildren();
 for(const w of m.warnings)$('warnings').append(htmlNode('p',CAMI18n.message(w.message)+(w.count>1?trn('warningCount',{count:w.count}):'')));
 $('sourceDataInfo').textContent=trn(m.sourceData.componentRecords||m.sourceData.footprintRecords||m.sourceData.netRecords?'sourceDataUnsupported':'sourceDataAbsent');
}
function loadText(text,name,demo=false){
 const parsed=CAMParser.parseCAM(text,name);if($('exportDialog').open)$('exportDialog').close();
 state.model=parsed;state.demo=demo;state.filter=null;state.selected=null;state.points=[];$('selection').hidden=true;$('measurement').hidden=true;
 const preferred=parsed.layers.filter(l=>l.name==='COMP'||l.type===21||l.name==='CILK');parsed.layers.forEach(l=>l.visible=preferred.length?preferred.includes(l):true);
 compile();renderLayers();renderDrills();renderMetadata();$('formatInfo').open=parsed.warnings.some(w=>!w.message.includes('文字需覆核'));fit();
 if(!demo)notify(trn('loadedFile',{name,count:parsed.drills.length}));
}
async function openFile(file){if(!file)return;if(file.size>30*1024*1024){notify(CAMI18n.message('檔案太大，請使用 30 MB 以下的檔案。'));return;}try{notify(trn('reading'));loadText(await file.text(),file.name);}catch(e){notify(CAMI18n.errorMessage(e)||trn('readFailed'));}}
function setMode(mode){state.mode=mode;state.points=[];$('measurement').hidden=true;wrap.classList.toggle('measuring',mode==='measure');for(const [id,m]of [['panTool','pan'],['measureTool','measure']]){$(id).classList.toggle('active',m===mode);$(id).setAttribute('aria-pressed',String(m===mode));}if(mode==='measure')notify(trn('measureHint'));drawSoon();}
function renderMeasurement(){
 $('measurement').hidden=!state.points.length;if(!state.points.length)return;
 if(state.points.length===1){$('measurement').textContent=trn('measureStart');return;}
 const [a,b]=state.points;$('measurement').textContent=trn('measurement',{distance:fmt(Math.hypot(b[0]-a[0],b[1]-a[1])),dx:fmt(Math.abs(b[0]-a[0])),dy:fmt(Math.abs(b[1]-a[1]))});
}
function renderSelection(){
 const d=state.selected;$('selection').hidden=!d;if(!d)return;
 $('selection').replaceChildren(htmlNode('strong',trn('selectedDrill',{tool:d.toolNumber})),htmlNode('div',trn('drawingValue',{value:d.designDiameters.length?d.designDiameters.map(fmt).join(' / ')+' mm':trn('noMatch')})),htmlNode('div',trn('toolValue',{value:fmt(d.diameter)})),htmlNode('span',`X ${fmt(d.x)}  Y ${fmt(d.y)} mm`,'muted'));
}
function selectAt(px,py){
 const [x,y]=world(px,py);if(state.mode==='measure'){if(state.points.length===2)state.points=[];state.points.push([x,y]);renderMeasurement();drawSoon();return;}
 let best=null,dist=Infinity;for(const d of state.model.drills){const l=state.model.layers.find(l=>l.id===d.layer);if(!l.visible&&!(state.filter&&drillKey(d)===state.filter))continue;const distance=Math.hypot(x-d.x,y-d.y);if(distance<=Math.max((d.diameter||0)/2,8/state.scale)&&distance<dist){best=d;dist=distance;}}
 state.selected=best;renderSelection();drawSoon();
}
const pointers=new Map();let pinch=null;
wrap.addEventListener('pointerdown',e=>{if(e.button!==0)return;wrap.focus({preventScroll:true});wrap.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.offsetX,e.offsetY]);state.drag={x:e.clientX,y:e.clientY,cx:state.cx,cy:state.cy,moved:false};if(pointers.size===2){const p=[...pointers.values()];pinch={distance:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]),scale:state.scale};state.drag.moved=true;}});
wrap.addEventListener('pointermove',e=>{const rect=wrap.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;const [x,y]=world(px,py);$('coordinates').textContent=`X ${x.toFixed(3)}　Y ${y.toFixed(3)} mm`;if(pointers.has(e.pointerId))pointers.set(e.pointerId,[px,py]);
 if(pointers.size===2&&pinch){const p=[...pointers.values()],distance=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);zoom((pinch.scale*distance/Math.max(pinch.distance,1))/state.scale,(p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2);return;}
 if(!state.drag||!pointers.has(e.pointerId))return;const dx=e.clientX-state.drag.x,dy=e.clientY-state.drag.y;if(Math.hypot(dx,dy)>4)state.drag.moved=true;if(state.drag.moved){state.cx=state.drag.cx-dx/state.scale;state.cy=state.drag.cy+dy/state.scale;drawSoon();}});
wrap.addEventListener('pointerup',e=>{if(state.drag&&!state.drag.moved&&!pinch){const r=wrap.getBoundingClientRect();selectAt(e.clientX-r.left,e.clientY-r.top);}pointers.delete(e.pointerId);state.drag=null;if(pointers.size<2)pinch=null;});
wrap.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);state.drag=null;pinch=null;});
wrap.addEventListener('wheel',e=>{e.preventDefault();const r=wrap.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
wrap.addEventListener('dblclick',fit);
wrap.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'){e.preventDefault();fit();}if(e.key==='+'||e.key==='=')zoom(1.3);if(e.key==='-')zoom(1/1.3);if(e.key==='Escape'){state.points=[];state.selected=null;state.filter=null;$('selection').hidden=true;$('measurement').hidden=true;renderDrills();drawSoon();}});
$('openFile').onclick=()=>$('fileInput').click();$('fileInput').onchange=e=>{openFile(e.target.files[0]);e.target.value='';};
$('fitView').onclick=fit;$('zoomIn').onclick=()=>zoom(1.4);$('zoomOut').onclick=()=>zoom(1/1.4);$('gridToggle').onchange=e=>{state.grid=e.target.checked;drawSoon();};$('panTool').onclick=()=>setMode('pan');$('measureTool').onclick=()=>setMode('measure');
function layerPreset(mode){state.model.layers.forEach(l=>l.visible=mode==='all'||(mode==='copper'?['COMP','SOLD'].includes(l.name):l.type===21||l.isDrillDrawing));renderLayers();drawSoon();}
$('allLayers').onclick=()=>layerPreset('all');$('copperOnly').onclick=()=>layerPreset('copper');$('holesOnly').onclick=()=>layerPreset('holes');$('clearFilter').onclick=()=>{state.filter=null;renderDrills();drawSoon();};
let dragDepth=0;document.addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();dragDepth++;document.body.classList.add('drag-over');}});document.addEventListener('dragleave',e=>{if(--dragDepth<=0){dragDepth=0;document.body.classList.remove('drag-over');}});document.addEventListener('dragover',e=>{e.preventDefault();});document.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;document.body.classList.remove('drag-over');openFile(e.dataTransfer.files[0]);});
new ResizeObserver(()=>{const r=wrap.getBoundingClientRect();state.width=r.width;state.height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);fit();}).observe(wrap);
function demoBoard(){
 const u=n=>Math.round(n*CAMParser.SCALE);const out=['*STATUSB','MODE Cam','VERSION 6.0','DB_EXT 0 0 '+u(64)+' '+u(46),'*END_STATUS','*LAYERSWID3','0 COMP 4 8 8 0 0 0','1 SOLD 4 9 9 0 0 0','2 CILK 4 2 2 0 0 0','6 Hole_Drawing 4 14 14 0 0 0','9 NC_Drill 21 11 11 0 0 4','*END_LAYERS','*APERTURES1 5','10 Round '+u(2.2)+':'+u(2.2)+' 0 0 NA 0:0 0','11 Round '+u(.9)+':'+u(.9)+' 0 0 NA 0:0 0','12 Round '+u(.45)+':'+u(.45)+' 0 0 NA 0:0 0','13 Rectangle '+u(2.5)+':'+u(1.3)+' 1 0 NA 0:0 0','14 Round '+u(.2)+':'+u(.2)+' 0 0 NA 0:0 0','*END_APERTURES','*NC_TOOL_TBLS','NC_TOOL_TBL 4 3 0 Demo','NC_TOOL 1 1 3 '+u(1)+' 0 0 0 0 0 0 1 0 1 1 '+u(1),'*END_NC_TOOL_TBLS','*GRAPHIC','LAYER 0','WIDTH -1','APERID 2','FILL 0'];
 const holes=[];for(let i=0;i<8;i++){const x=10+i*6;holes.push([x,7],[x,39]);out.push(`LINE 4 ${u(x)} ${u(7)} ${u(x)} ${u(11+i%3)} ${u(23+i*.9)} ${u(18)} ${u(23+i*.9)} ${u(20)} 0`,`LINE 4 ${u(x)} ${u(39)} ${u(x)} ${u(34-i%3)} ${u(23+i*.9)} ${u(28)} ${u(23+i*.9)} ${u(26)} 0`);}
 out.push('LAYER 1','LINE 5 '+[10,7,5,7,5,39,54,39,54,7].map(u).join(' ')+' 0','LAYER 2','APERID 4','LINE 5 '+[2,2,62,2,62,44,2,44,2,2].map(u).join(' ')+' 0','LINE 5 '+[20,17,35,17,35,29,20,29,20,17].map(u).join(' ')+' 0','*END_GRAPHIC','*PADS '+(holes.length*2+16));
 for(const [x,y]of holes)out.push(`${u(x)} ${u(y)} 0 0 0`,`${u(x)} ${u(y)} 6 1 0`);for(let i=0;i<8;i++)out.push(`${u(20)} ${u(18+i*1.35)} 0 3 0`,`${u(35)} ${u(18+i*1.35)} 0 3 0`);
 out.push('*END_PADS','*NC_PATHS','PLATED_DRILL_PATH 9 1 0 0 0 0 0 0','NC_LOCS');holes.forEach(([x,y])=>out.push(`NC_LOC HIT ${u(x)} ${u(y)}`));out.push('END_NC_LOCS','*END_NC_PATHS');return out.join('\n');
}
// Export choices and board state survive locale changes.
let exportReady=null,exportTimer=0,exportFormat='gerber';
function localizeExportFormat(){
 const ipc=exportFormat==='ipc2581';$('exportFormatSelect').value=exportFormat;
 for(const [id,key] of [['exportTitle',ipc?'exportIPC':'exportGerber'],['exportIntro',ipc?'ipcIntro':'exportIntro'],['includeDrillsLabel',ipc?'ipcIncludeDrills':'includeDrills'],['exportCaution',ipc?'ipcCaution':'exportCaution'],['downloadGerber',ipc?'downloadIPC':'downloadZip']]){$(id).dataset.i18n=key;$(id).textContent=trn(key);}
 $('exportFormatLabel').textContent=ipc?'IPC-2581C · USERDEF + EXCELLON':'GERBER X2 + EXCELLON';
 $('exportDialog').classList.toggle('ipc-export',ipc);
}
function exportOptions(){const ids=[],roles={},polarities={};for(const row of $('exportLayerRows').children){const id=Number(row.dataset.layer);if(row.querySelector('input').checked)ids.push(id);roles[id]=row.querySelector('.export-role').value;polarities[id]=row.querySelector('.export-polarity').value;}return {layerIds:ids,roles,polarities,copperLayers:Number($('copperLayerCount').value),includeDrills:$('includeDrills').checked,includeText:$('includeText').checked};}
function refreshExport(){
 clearTimeout(exportTimer);exportReady=null;$('downloadGerber').disabled=true;$('exportError').hidden=true;$('exportSummary').textContent=trn('checking');
 exportTimer=setTimeout(()=>{try{exportReady=(exportFormat==='ipc2581'?CAMIPC2581:CAMExporter).buildExport(state.model,exportOptions());if(exportFormat==='ipc2581'){const m=exportReady.manifest;$('exportSummary').textContent=trn('ipcSummary',{layers:m.layers.length,holes:m.ncReferenceHits})+(m.omittedTextObjects?trn('omittedText',{count:m.omittedTextObjects}):'')+(state.demo?trn('demoExport'):'');$('downloadGerber').disabled=false;return;}const fs=exportReady.manifest.files,gs=fs.filter(f=>f.format==='Gerber X2'),ds=fs.filter(f=>f.format==='Excellon / XNC'),omitted=gs.reduce((s,f)=>s+f.omittedTextObjects,0);$('exportSummary').textContent=trn('exportSummary',{gerbers:gs.length,drills:ds.length,holes:ds.reduce((s,f)=>s+f.hits,0)})+(omitted?trn('omittedText',{count:omitted}):'')+(state.demo?trn('demoExport'):'');$('downloadGerber').disabled=false;}catch(e){$('exportSummary').textContent=trn('adjustExport');$('exportError').textContent=CAMI18n.errorMessage(e);$('exportError').hidden=false;}},60);
}
function roleOptions(select,current){
 select.replaceChildren();const roles=['copper_top','copper_bottom','mask_top','mask_bottom','legend_top','legend_bottom','paste_top','paste_bottom','drillmap','fabrication','other'];
 for(let i=2;i<Math.min(Number($('copperLayerCount').value),65);i++)roles.splice(i-1,0,'inner_'+i);
 for(const value of roles){const inner=value.startsWith('inner_'),n=inner?Number(value.slice(6)):value==='copper_top'?1:value==='copper_bottom'?Number($('copperLayerCount').value):null,label=trn('role.'+(inner?'inner':value))+(n?' · L'+n:'');const option=htmlNode('option',label);option.value=value;select.append(option);}
 select.value=roles.includes(current)?current:'other';select.title=select.selectedOptions[0]?.textContent||'';
}
function localizeExportRows(){
 for(const row of $('exportLayerRows').children){const layer=state.model.layers.find(l=>l.id===Number(row.dataset.layer)),role=row.querySelector('.export-role'),polarity=row.querySelector('.export-polarity');row.querySelector('input').setAttribute('aria-label',trn('exportLayer',{name:layer.name}));role.setAttribute('aria-label',trn('layerFunction',{name:layer.name}));roleOptions(role,role.value);polarity.setAttribute('aria-label',trn('layerPolarity',{name:layer.name}));for(const option of polarity.options)option.textContent=trn(option.value==='Positive'?'positive':'negative');}
}
function showExport(format='gerber'){
 exportFormat=format;localizeExportFormat();
 $('exportLayerRows').replaceChildren();$('copperLayerCount').value=2;$('includeDrills').checked=true;$('includeText').checked=true;
 for(const layer of state.model.layers){
  const row=htmlNode('tr');row.dataset.layer=layer.id;const td=htmlNode('td'),label=htmlNode('label'),check=document.createElement('input');check.type='checkbox';check.checked=true;check.onchange=refreshExport;label.append(check,htmlNode('span',layer.name));td.append(label);
  const role=htmlNode('select',undefined,'export-role');roleOptions(role,CAMExporter.defaultRole(layer));role.disabled=layer.type===21;
  const polarity=htmlNode('select',undefined,'export-polarity');for(const value of ['Positive','Negative']){const option=htmlNode('option');option.value=value;polarity.append(option);}polarity.value=role.value.startsWith('mask_')?'Negative':'Positive';polarity.disabled=layer.type===21;
  role.onchange=()=>{role.title=role.selectedOptions[0]?.textContent||'';polarity.value=role.value.startsWith('mask_')?'Negative':'Positive';refreshExport();};polarity.onchange=refreshExport;const rtd=htmlNode('td'),ptd=htmlNode('td');rtd.append(role);ptd.append(polarity);row.append(td,rtd,ptd);$('exportLayerRows').append(row);
 }
 localizeExportRows();if(!$('exportDialog').open)$('exportDialog').showModal();refreshExport();
}
function changeLanguage(language){
 CAMI18n.setLanguage(language);CAMI18n.apply(document);$('toast').hidden=true;
 if(state.model){renderLayers();renderDrills();renderMetadata();renderMeasurement();renderSelection();if($('exportDialog').open){localizeExportFormat();localizeExportRows();refreshExport();}drawSoon();}
}
for(const select of document.querySelectorAll('.language-select'))select.onchange=()=>changeLanguage(select.value);
$('exportButton').onclick=()=>showExport(exportFormat);$('exportFormatSelect').onchange=()=>{exportFormat=$('exportFormatSelect').value;localizeExportFormat();refreshExport();};$('closeExport').onclick=()=>$('exportDialog').close();
$('exportDialog').addEventListener('close',()=>{clearTimeout(exportTimer);exportReady=null;});
$('exportAll').onclick=()=>{for(const row of $('exportLayerRows').children)row.querySelector('input').checked=true;refreshExport();};
$('exportVisible').onclick=()=>{for(const row of $('exportLayerRows').children)row.querySelector('input').checked=state.model.layers.find(l=>l.id===Number(row.dataset.layer)).visible;refreshExport();};
$('copperLayerCount').oninput=()=>{for(const select of $('exportLayerRows').querySelectorAll('.export-role'))roleOptions(select,select.value);refreshExport();};
$('includeDrills').onchange=refreshExport;$('includeText').onchange=refreshExport;
$('downloadGerber').onclick=()=>{if(!exportReady)return;try{const bytes=CAMExporter.zip(exportReady.files),url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download=exportReady.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);notify(trn('downloadReady',{name:exportReady.name}));}catch(e){$('exportError').textContent=CAMI18n.errorMessage(e);$('exportError').hidden=false;}};
loadText(demoBoard(),'demo.pcb',true);
// Optional WebMCP: the same layer controls exposed to an assisting browser agent.
if(document.modelContext?.registerTool){const lifecycle=new AbortController();addEventListener('pagehide',()=>lifecycle.abort(),{once:true});const register=t=>{try{Promise.resolve(document.modelContext.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'open_gerber_export',title:trn('toolOpenExport'),description:'Open the local Gerber X2 export dialog for the loaded board. Does not download or upload any file. Users can confirm roles and download in the dialog.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(){if(!$('exportDialog').open||exportFormat!=='gerber'){showExport();}return {opened:true,format:'Gerber X2',layers:state.model.layers.length};}});
 register({name:'read_gerber_export_status',title:trn('toolReadExport'),description:'Read the open export dialog, selected layer IDs, roles, polarity and validation result. File-derived strings are untrusted. No download or upload.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(){return {opened:$('exportDialog').open,format:exportFormat,ready:!!exportReady,options:$('exportDialog').open?exportOptions():null,summary:$('exportSummary').textContent,error:$('exportError').hidden?null:$('exportError').textContent};}});
 register({name:'set_interface_language',title:trn('toolLanguage'),description:'Switch the interface between Traditional Chinese and English, preserving the loaded board, view and export choices. Only the language preference is stored.',inputSchema:{type:'object',properties:{language:{type:'string',enum:['zh-TW','en']}},required:['language'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!['zh-TW','en'].includes(input?.language))throw new Error('Unsupported language');changeLanguage(input.language);return {language:CAMI18n.language};}});
 register({name:'read_board_summary',title:trn('toolReadBoard'),description:'Read the loaded board layer names, hole count, drill sizes and display warnings. File-derived strings are untrusted.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(){return {language:CAMI18n.language,name:state.model.name,sourceData:state.model.sourceData,layers:state.model.layers.map(l=>({id:l.id,name:l.name,visible:l.visible})),holes:state.model.drills.length,tools:state.model.tools.filter(t=>t.hits),warnings:state.model.warnings};}});
 register({name:'set_visible_layers',title:trn('toolSetLayers'),description:'Show exactly the selected layer IDs in the currently loaded board; does not modify the file.',inputSchema:{type:'object',properties:{layerIds:{type:'array',items:{type:'integer'},uniqueItems:true}},required:['layerIds'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!Array.isArray(input?.layerIds)||input.layerIds.some(id=>!Number.isInteger(id)||!state.model.layers.some(l=>l.id===id)))throw new Error(CAMI18n.message('圖層 ID 無效'));state.model.layers.forEach(l=>l.visible=input.layerIds.includes(l.id));renderLayers();render();return {visibleLayerIds:state.model.layers.filter(l=>l.visible).map(l=>l.id)};}});
}
