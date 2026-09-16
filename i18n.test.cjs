const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const i18n=require('./dist/i18n');
test('all UI strings have Chinese/English translations with identical placeholders',()=>{
 for(const [key,values] of Object.entries(i18n.strings)){
  assert.equal(values.length,2,key);assert(values.every(v=>typeof v==='string'&&v.length),key);
  const params=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();assert.deepEqual(params(values[0]),params(values[1]),key);
 }
 const html=fs.readFileSync('dist/index.html','utf8');for(const m of html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g))assert(Object.hasOwn(i18n.strings,m[1]),m[1]);
});
test('language preference overrides browser language; blocked storage has a safe fallback',()=>{
 assert.equal(i18n.initialLanguage({getItem:()=> 'en'},'zh-TW'),'en');assert.equal(i18n.initialLanguage({getItem:()=> 'zh-TW'},'en-US'),'zh-TW');
 assert.equal(i18n.initialLanguage({getItem(){throw new Error('blocked');}},'zh-HK'),'zh-TW');assert.equal(i18n.initialLanguage(null,'de-DE'),'en');
 assert.equal(i18n.initialLanguage({getItem:()=> 'invalid'},'en-GB'),'en');assert.throws(()=>i18n.setLanguage('invalid',false));
});
test('localized status interpolates values and preserves source-derived strings verbatim',()=>{
 i18n.setLanguage('en',false);assert.equal(i18n.t('showLayer',{name:'正面銅箔.pcb'}),'Show 正面銅箔.pcb');assert.equal(i18n.t('layerCount',{count:9}),'9 layers');
 i18n.setLanguage('zh-TW',false);assert.equal(i18n.t('layerCount',{count:9}),'9 層');
});
test('all parser/exporter literal errors and warnings have English messages',()=>{
 for(const name of ['parser','exporter']){const text=fs.readFileSync('dist/'+name+'.js','utf8');for(const match of text.matchAll(/(?:new Error\(|warn\()'([^']*[\u4e00-\u9fff][^']*)'/g))assert(Object.hasOwn(i18n.messages,match[1]),match[1]);}
 i18n.setLanguage('en',false);
 assert.equal(i18n.message('未支援的圖形指令：ARC'),'Unsupported graphic command: ARC');
 assert.equal(i18n.message('檔案含未支援的資料，無法完整匯出：未支援的圖形指令：ARC；部分鑽孔找不到刀具定義'),'Unsupported data prevents a complete export: Unsupported graphic command: ARC; Some drills have no tool definition');
 assert.equal(i18n.errorMessage({layerName:'圖層一',detail:'圓形半徑必須大於零。'}),'圖層一 — Circle radius must be greater than zero.');
 i18n.setLanguage('zh-TW',false);
});
