const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {parseCAM}=require('./dist/parser');
const ex=require('./dist/exporter');
const layer=(id,name,items=[],drills=[])=>({id,name,items,drills,type:0});
const model=()=>({name:'test.pcb',apertures:[{shape:'Round',w:.9,h:.9,rotation:0}],layers:[layer(0,'COMP',[{kind:'pad',x:-1.000002,y:2.000004,aperture:0,flags:0},{kind:'line',points:[[0,0],[1,2],[3,4]],width:-1,aperture:0,fill:0}]),layer(1,'SOLD'),layer(2,'CMSK'),layer(3,'SMSK'),layer(4,'CILK'),layer(5,'SILK')],warnings:[]});
test('X2 attributes declare roles, correct soldermask polarity and common coordinates',()=>{
 const result=ex.buildExport(model());const gerbers=result.files.filter(f=>f.name.endsWith('.gbr'));
 const expected=['Copper,L1,Top','Copper,L2,Bot','Soldermask,Top','Soldermask,Bot','Legend,Top','Legend,Bot'];
 for(const [i,g] of gerbers.entries()){
  assert(g.data.includes('%TF.FileFunction,'+expected[i]+'*%'));
  assert(g.data.includes('%TF.FilePolarity,'+([2,3].includes(i)?'Negative':'Positive')+'*%'));
  assert(g.data.includes('%TF.SameCoordinates,'+result.manifest.coordinateId+'*%'));
  assert.match(g.data,/%TF.GenerationSoftware,[^,]+,[^,]+,[^*]+\*%/);
  assert.match(g.data,/%TF.CreationDate,\d{4}-\d\d-\d\dT[^*]+Z\*%/);
 }
 assert.match(gerbers[0].data,/X-1000002Y2000004D03\*/);assert.match(gerbers[0].data,/%ADD10C,0.9\*%/);assert.match(gerbers[0].data,/X3000000Y4000000D01\*/);
});
test('subset export uses full-board copper numbering; explicit roles and polarities are honored',()=>{
 const out=ex.buildExport(model(),{layerIds:[1,2],copperLayers:8,roles:{2:'inner_3'},polarities:{2:'Positive'}});
 assert.equal(out.manifest.files[0].fileFunction,'Copper,L8,Bot');assert.equal(out.manifest.files[1].fileFunction,'Copper,L3,Inr');assert.equal(out.manifest.files[1].filePolarity,'Positive');
 assert.throws(()=>ex.buildExport(model(),{copperLayers:2,roles:{2:'inner_3'}}),/內層/);
 assert.throws(()=>ex.buildExport(model(),{layerIds:[]}),/勾選/);
 assert.throws(()=>ex.buildExport(model(),{roles:{0:'Copper,L1,Top*%'}}),/無效/);
});
test('XNC uses explicit decimals, preserves compensated NC diameter and splits PTH/NPTH',()=>{
 const m=model(),drills=[{x:1,y:2,diameter:1,table:4,tool:2,toolNumber:6,plated:true,designDiameters:[.9]},{x:-1.000002,y:0,diameter:.75,table:4,tool:3,toolNumber:6,plated:false,designDiameters:[.65]}];m.layers.push({...layer(9,'NC',[],drills),type:21});
 const out=ex.buildExport(m),ds=out.files.filter(f=>f.name.endsWith('.drl'));assert.equal(ds.length,2);assert.match(ds[0].data,/T06C1.0\n/);assert.match(ds[0].data,/X1.0Y2.0/);assert.match(ds[1].data,/X-1.000002Y0.0/);
 const remapped=ex.exportDrills(drills);assert.equal(new Set(remapped.tools.map(t=>t.exportNumber)).size,2);
 assert.throws(()=>ex.exportDrills([{...drills[0],diameter:undefined}]),/直徑/);
 assert.throws(()=>ex.buildExport(m,{roles:{9:'copper_bottom'}}),/NC 圖層/);
});
test('unsupported shapes, missing tools and zero-width lines block download',()=>{
 let m=model();m.warnings=[{message:'未支援的圖形指令：ARC'}];assert.throws(()=>ex.buildExport(m),/ARC/);
 m=model();m.layers[0].items[1].width=0;assert.throws(()=>ex.buildExport(m),/零寬度/);
 m=model();m.layers[0].items[1].fill=3;assert.throws(()=>ex.buildExport(m),/負片/);
 m=model();m.apertures[0].shape='CUSTOM';assert.throws(()=>ex.buildExport(m),/光圈/);
 m=model();m.layers[0].items[0].x=10000;assert.throws(()=>ex.buildExport(m),/範圍/);
});
test('missing text fonts require an explicit exclusion and are recorded in manifest',()=>{
 const m=model();m.layers[0].items.push({kind:'text',text:'X',style:1,x:0,y:0,x2:1,y2:0});
 assert.throws(()=>ex.buildExport(m),/字型/);const out=ex.buildExport(m,{includeText:false});assert.equal(out.manifest.files[0].omittedTextObjects,1);assert(out.manifest.notes.some(n=>n.includes('excluded')));
});
test('rotated standard pads, circle outlines, filled polygons and empty layers generate valid commands',()=>{
 const m=model();m.apertures.push({shape:'Oblong',w:2,h:1,rotation:35});m.layers[0].items=[{kind:'pad',x:1,y:2,aperture:1,flags:0},{kind:'circle',x:0,y:0,r:1,width:.2,fill:0},{kind:'line',points:[[1,0],[2,0],[1,1]],fill:1}];
 const out=ex.buildExport(m);const g=out.files[0].data;assert.match(g,/%AMCAM10\*/);assert.match(g,/G03\*/);assert.match(g,/I-1000000J0D01/);assert.match(g,/G36\*/);assert.match(g,/G37\*/);assert(out.files.find(f=>f.name.includes('SILK')).data.endsWith('M02*\n'));
});
if(process.argv[2])test('RX-345: exports all layers and reconstructs embedded text; preserves 168 compensated holes',()=>{
 const m=parseCAM(fs.readFileSync(process.argv[2],'utf8'),'rx-345.pcb'),out=ex.buildExport(m);
 assert.equal(out.manifest.files.filter(f=>f.format==='Gerber X2').length,9);assert.equal(out.manifest.files.find(f=>f.format==='Excellon / XNC').hits,384);
 const t=out.manifest.files.find(f=>f.format==='Excellon / XNC').tools.find(t=>t.sourceNumber===6);assert.equal(t.hits,168);assert.equal(t.diameter,1);
 const text=m.layers.flatMap(l=>l.items).find(i=>i.kind==='text');assert.equal(ex.textGlyphs(m,text).length,text.text.length);assert(out.files.find(f=>f.name.includes('CILK')).data.includes('%AM'));
 assert.equal(out.manifest.files.find(f=>f.layerId===6).fileFunction,'FabricationDrawing');
});
