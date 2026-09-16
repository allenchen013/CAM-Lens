const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {parseCAM} = require('./dist/parser.js');
const fixture = `*STATUSB
MODE Cam
VERSION 6.0
*END_STATUS
*LAYERSWID3
0 COMP 4 8 8 0 0 0
6 Drill_Drawing 4 14 14 0 0 0
9 NC 21 11 11 0 0 7
*END_LAYERS
*APERTURES1 2
99 Round 450000:450000 0 0 NA 0:0 0
12 Round 750000:750000 0 0 NA 0:0 0
*END_APERTURES
*NC_TOOL_TBLS
NC_TOOL_TBL 7 3 0 Test
NC_TOOL 3 18 3 500000 0 0 0 0 0 0 0 0 1 1 500000
*END_NC_TOOL_TBLS
*GRAPHIC
LAYER 0
WIDTH -1
APERID 1
LINE 3 0 0 500000 0
 500000 1000000 0
*END_GRAPHIC
*PADS 2
500000 1000000 0 1 0
500000 1000000 6 0 0
*END_PADS
*NC_PATHS
PLATED_DRILL_PATH 9 3 0 0 0 0 0 0
NC_LOCS
NC_LOC HIT 500000 1000000
END_NC_LOCS
*END_NC_PATHS`;
test('resolves aperture indices separately from D-codes, table ID and tool number',()=>{
 const m=parseCAM(fixture);assert.equal(m.drills.length,1);const d=m.drills[0];assert.deepEqual([d.x,d.y,d.diameter,d.toolNumber],[1,2,1,18]);assert.deepEqual(d.designDiameters,[.9]);assert.equal(m.tools[0].hits,1);assert.deepEqual(m.layers.filter(l=>l.isDrillDrawing).map(l=>l.id),[6]);assert.deepEqual(m.layers[0].items[0].points,[[0,0],[1,0],[1,2]]);
});
test('rejects invalid file types and incomplete polyline records',()=>{
 assert.throws(()=>parseCAM('not a CAM350 file'),/CAM350/);assert.throws(()=>parseCAM(fixture.replace(' 500000 1000000 0\n*END_GRAPHIC','*END_GRAPHIC')),/不完整/);
});
test('reports unsupported geometry rather than silently claiming full fidelity',()=>{
 const m=parseCAM(fixture.replace('*END_GRAPHIC','ARC 0 0 500000 0 180\n*END_GRAPHIC'));assert(m.warnings.some(w=>w.message.includes('ARC')));
});
test('missing NC tool does not produce a fabricated drill size',()=>{
 const m=parseCAM(fixture.replace('PLATED_DRILL_PATH 9 3','PLATED_DRILL_PATH 9 8'));assert.equal(m.drills[0].diameter,undefined);assert(m.warnings.some(w=>w.message.includes('刀具')));
});
if(process.argv[2])test('verified RX-345 file: all entities, 384 hits and 168 changed holes',()=>{
 const m=parseCAM(readFileSync(process.argv[2],'utf8'));assert.equal(m.layers.length,9);assert.equal(m.entityCount,16697);assert.equal(m.drills.length,384);assert.equal(m.tools.reduce((n,t)=>n+t.hits,0),384);const changed=m.drills.filter(d=>d.designDiameters.includes(.9));assert.equal(changed.length,168);assert(changed.every(d=>d.diameter===1));assert.deepEqual(m.layers.filter(l=>l.isDrillDrawing).map(l=>l.id),[6,8]);assert.deepEqual(m.warnings,[{message:'文字需覆核字型輪廓',count:1}]);
});
