(function(root) {
  'use strict';
  // CAM350 ASCII database coordinates are in 0.002 micrometres.
  const SCALE = 500000;
  function parseCAM(text, name = '未命名.pcb') {
    if (typeof text !== 'string' || text.length > 30 * 1024 * 1024) throw new Error('檔案太大，請使用 30 MB 以下的檔案。');
    if (!/^\uFEFF?\*STATUS[AB]?\s/m.test(text) || !/^MODE\s+Cam\s*$/m.test(text)) throw new Error('這不是可讀取的 CAM350 ASCII 檔案。請選擇文字格式的 .pcb 或 .cam 檔案。');
    const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    const model = { name, version: '', layers: [], apertures: [], tools: [], drills: [], fonts: {}, textStyles: {}, warnings: [], bounds: null, entityCount: 0 };
    model.sourceData = { componentRecords:0, footprintRecords:0, netRecords:0 };
    const layerMap = new Map(), tables = new Map(), warnings = new Map();
    const warn = (s) => warnings.set(s, (warnings.get(s) || 0) + 1);
    const number = (s) => { const n = Number(s); if (s === undefined || s === '' || !Number.isFinite(n) || Math.abs(n) > 1e13) throw new Error('檔案內有無效或超出範圍的座標。'); return n; };
    const mm = (s) => number(s) / SCALE;
    const layer = (id) => { if (!layerMap.has(id)) { const l = { id, name: 'Layer ' + id, type: 0, table: null, items: [], drills: [], visible: true, opacity: 1 }; layerMap.set(id, l); model.layers.push(l); } return layerMap.get(id); };
    let section = '', cap = false, currentLayer = 0, aperture = -1, width = -1, fill = 0, table = null, drillPath = null;
    let font = null, glyph = null;
    let calculated = [Infinity, Infinity, -Infinity, -Infinity];
    const bound = (x, y, r = 0) => { calculated[0] = Math.min(calculated[0], x-r); calculated[1] = Math.min(calculated[1], y-r); calculated[2] = Math.max(calculated[2], x+r); calculated[3] = Math.max(calculated[3], y+r); };
    const add = (id, item) => { layer(id).items.push(item); model.entityCount++; if (model.entityCount > 350000) throw new Error('物件過多，請拆分檔案後再載入。'); };
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i].trim(); if (!row) continue;
      if (row.startsWith('*CAP ')) { cap = true; continue; }
      if (row === '*END_CAP') { cap = false; continue; }
      if (cap) continue;
      if (row.startsWith('*')) {
        if (row.startsWith('*END_')) section = '';
        else { section = row.split(/\s/)[0]; if (section === '*GRAPHIC') { currentLayer = 0; aperture = -1; width = -1; fill = 0; } }
        continue;
      }
      let t = row.split(/\s+/), k = t[0];
      if(section==='*CMP_LIST')model.sourceData.componentRecords++;
      if(section==='*FP_LIBRARY')model.sourceData.footprintRecords++;
      if(/^\*(NET|NETLIST|NETS|SIGNALS)(_|$)/.test(section)){model.sourceData.netRecords++;warn('尚未支援網路連接資料');}
      if (k === 'TEXTSTYLE3') {
        model.textStyles[t[1]] = { height:mm(t[2]), spacing:mm(t[3]), stroke:mm(t[4]), angle:number(t[5]), slant:number(t[6]), xScale:number(t[7]), alignment:number(t[8]), mode:number(t[9]), font:t[10] };
      } else if (section === '*FONTS') {
        if (k === 'FONTHEADER2') { font = { ascent:number(t[1]), descent:number(t[2]), glyphs:{} }; model.fonts[t[7]] = font; glyph = null; }
        else if (k === 'FONTCHAR' && font) { glyph = { advance:number(t[2]), contours:[] }; font.glyphs[t[1]] = glyph; }
        else if (['FONTPOLY','FONTVOID','FONTLINE'].includes(k) && glyph) {
          const n = number(t[1]); if (!Number.isInteger(n) || n<2 || n>10000) throw new Error('字型輪廓頂點數無效。');
          while (t.length < 2+n*3 && i+1<rows.length && /^\s+[-\d]/.test(rows[i+1])) { row += ' '+rows[++i].trim(); t=row.split(/\s+/); }
          if (t.length !== 2+n*3) throw new Error('字型輪廓資料不完整。');
          const points=[]; for(let j=0;j<n;j++) points.push(t.slice(2+j*3,5+j*3).map(number));
          glyph.contours.push({kind:k,points});
        }
      } else if (section === '*STATUSB' || section === '*STATUSA' || section === '*STATUS') {
        if (k === 'VERSION') model.version = t[1];
        if (k === 'DB_EXT' && t.length >= 5) model.bounds = t.slice(1,5).map(mm);
      } else if (section.startsWith('*LAYERS')) {
        if (!/^-?\d+$/.test(k) || t.length < 4) continue;
        const l = layer(number(k)); l.name = t[1]; l.type = number(t[2]); l.table = t[7] === undefined ? null : number(t[7]);
      } else if (section.startsWith('*APERTURES')) {
        if (t.length < 3 || !t[2].includes(':')) continue;
        const [w,h] = t[2].split(':').map(mm);
        if (w < 0 || h < 0) throw new Error('光圈尺寸無效。');
        model.apertures.push({ code: number(k), shape: t[1], w, h, rotation: t[7] ? number(t[7]) : 0 });
      } else if (section === '*NC_TOOL_TBLS') {
        if (k === 'NC_TOOL_TBL') { table = number(t[1]); tables.set(table, new Map()); }
        if (k === 'NC_TOOL' && table !== null) {
          const tool = { table, id: number(t[1]), number: number(t[2]), diameter: mm(t[4]), hits: 0 };
          tables.get(table).set(tool.id, tool); model.tools.push(tool);
        }
      } else if (section === '*PADS') {
        if (t.length !== 5) { warn('有無法辨識的焊盤記錄'); continue; }
        const [x,y] = t.slice(0,2).map(mm), id = number(t[2]), ai = number(t[3]), flags = number(t[4]);
        const a = model.apertures[ai];
        if (!a) { warn('部分焊盤找不到光圈定義'); continue; }
        if (flags !== 0) warn('部分焊盤含未支援的轉換旗標');
        add(id, { kind: 'pad', x, y, aperture: ai, flags }); bound(x,y,Math.max(a.w,a.h)/2);
      } else if (section === '*GRAPHIC') {
        if (k === 'LAYER') currentLayer = number(t[1]);
        else if (k === 'APERID') aperture = number(t[1]);
        else if (k === 'WIDTH') width = mm(t[1]);
        else if (k === 'FILL') { fill = number(t[1]); if (fill === 3) warn('負片挖空圖形尚未顯示'); }
        else if (k === 'GR_ID') { /* grouping metadata */ }
        else if (k === 'LINE') {
          const n = number(t[1]); if (!Number.isInteger(n) || n < 2 || n > 100000) throw new Error('線段的頂點數無效。');
          while (t.length < 2 + n*2 + 1 && i+1 < rows.length && /^\s+[-\d]/.test(rows[i+1])) { row += ' ' + rows[++i].trim(); t = row.split(/\s+/); }
          if (t.length !== 2 + n*2 + 1) throw new Error('線段資料不完整，無法可靠顯示。');
          const points = []; for (let j=0;j<n;j++) { const p = [mm(t[2+j*2]), mm(t[3+j*2])]; points.push(p); bound(...p); }
          add(currentLayer, { kind: 'line', points, aperture, width, fill });
          if (number(t[t.length-1]) !== 0) warn('部分線段含未支援的轉換旗標');
        } else if (k === 'CIRC') {
          if (t.length !== 5) { warn('有無法辨識的圓形記錄'); continue; }
          const [x,y,r] = t.slice(1,4).map(mm); if (r < 0) throw new Error('圓形半徑無效。');
          if (number(t[4]) !== 0) warn('部分圓形含未支援的轉換旗標');
          add(currentLayer, { kind: 'circle', x,y,r,width,aperture,fill }); bound(x,y,r);
        } else if (k === 'TEXT2') {
          const m = row.match(/^TEXT2\s+(\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+"(.*)"\s+(-?\d+)$/);
          if (m) { add(currentLayer, { kind: 'text', style:number(m[1]), flags:number(m[7]), x:mm(m[2]), y:mm(m[3]), x2:mm(m[4]), y2:mm(m[5]), text:m[6] }); warn('文字需覆核字型輪廓'); } else warn('有無法辨識的文字');
        } else warn('未支援的圖形指令：' + k);
      } else if (section === '*NC_PATHS') {
        if (k === 'PLATED_DRILL_PATH' || k === 'UNPLATED_DRILL_PATH') {
          drillPath = { layer: number(t[1]), tool: number(t[2]), plated: k === 'PLATED_DRILL_PATH' };
          if (t.slice(3).some(v => number(v) !== 0)) warn('部分鑽孔路徑含未支援的轉換參數');
        } else if (k === 'NC_LOC' && t[1] === 'HIT' && drillPath) {
          const d = { ...drillPath, x: mm(t[2]), y: mm(t[3]), designDiameters: [] }; model.drills.push(d); layer(d.layer).drills.push(d); bound(d.x,d.y);
        } else if (!['NC_LOCS','END_NC_LOCS'].includes(k)) { warn('未支援的 NC 加工指令：' + k); if (k.includes('PATH')) drillPath = null; }
      } else if (section === '*STEP&REPEAT') warn('拼板複製設定尚未展開');
      else if (section === '*PADSTKS' && k !== 'PSTK_TOOLTBL') warn('尚未支援焊盤堆疊');
      else if (section === '*CMP_LIST' || section === '*FP_LIBRARY') warn('尚未支援元件或封裝實體');
    }
    if (!model.layers.length || !model.entityCount && !model.drills.length) throw new Error('找不到可顯示的圖層或圖形。');
    const key = (x,y) => Math.round(x*SCALE) + ',' + Math.round(y*SCALE);
    const hitPositions = new Set(model.drills.map(d => key(d.x,d.y))), drawingAt = new Map();
    for (const l of model.layers) {
      const pads = l.items.filter(p => p.kind === 'pad');
      // Identify duplicate drill drawings by their whole-layer coordinate overlap, never by a shared D-code alone.
      const uniquePads = new Set(pads.map(p => key(p.x,p.y)));
      l.isDrillDrawing = l.type !== 21 && !/^(COMP|SOLD|CMSK|SMSK|CILK|SILK)$/i.test(l.name) && pads.length > 0 && uniquePads.size / pads.length > 0.98 && pads.length >= hitPositions.size * 0.9 && pads.filter(p => hitPositions.has(key(p.x,p.y)) && model.apertures[p.aperture]?.shape === 'Round').length / pads.length > 0.95;
      if (l.isDrillDrawing) for (const p of pads) {
        const a = model.apertures[p.aperture]; if (a.shape !== 'Round') continue;
        const loc = key(p.x,p.y); if (!drawingAt.has(loc)) drawingAt.set(loc, new Set()); drawingAt.get(loc).add(a.w);
      }
      for (const item of l.items) {
        if (item.aperture >= 0) { const a = model.apertures[item.aperture]; if (!a) warn('有物件找不到光圈定義'); else if (!['Round','Square','Rectangle','Oblong','Donut'].includes(a.shape)) warn('未支援的自訂光圈：' + a.shape); }
      }
    }
    for (const d of model.drills) {
      const l = layer(d.layer), tool = tables.get(l.table)?.get(d.tool);
      if (tool) { d.diameter = tool.diameter; d.toolNumber = tool.number; d.table = tool.table; tool.hits++; bound(d.x,d.y,d.diameter/2); } else warn('部分鑽孔找不到刀具定義');
      d.designDiameters = [...(drawingAt.get(key(d.x,d.y)) || [])].sort((a,b)=>a-b);
    }
    if (!model.bounds || model.bounds[2] <= model.bounds[0] || model.bounds[3] <= model.bounds[1]) model.bounds = calculated;
    if (!model.bounds.every(Number.isFinite)) throw new Error('圖面範圍無效。');
    model.warnings = [...warnings].map(([message,count]) => ({message,count}));
    model.layers.sort((a,b)=>a.id-b.id);
    return model;
  }
  root.CAMParser = { parseCAM, SCALE };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CAMParser;
})(typeof globalThis !== 'undefined' ? globalThis : this);
