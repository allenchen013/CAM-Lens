/* UI translations only. Board coordinates, names and export geometry never depend on locale. */
(function(root) {
 'use strict';
 const strings = {
  export:['匯出','Export'],exportFormat:['匯出格式','Export format'],
  exportIPC:['匯出 IPC-2581','Export IPC-2581'],
  ipcIntro:['匯出 IPC-2581C XML，並附資料保留清單與鑽孔檔。僅包含現有圖形及 NC 參考資料；不包含 BOM、元件座標、網路、材料疊構或已確認的板框。','Export IPC-2581C XML with a data manifest and drill files. Contains existing graphics and NC references only; no BOM, component placement, nets, material stackup or verified board profile.'],
  ipcIncludeDrills:['包含 NC 孔位參考資料及 Excellon 鑽孔檔','Include NC references and Excellon drill files'],
  ipcCaution:['這是部分資料交換，不是完整製板或組裝資料。因孔徑公差未知，XML 以參考圓形及自訂屬性保存 NC 資料，不產生標準 Hole 元素；加工資料請使用附上的鑽孔檔。混合圖層不會自動拆成板框或 V-cut。文字曲線容差為 0.001 mm。','This is a partial exchange, not a complete fabrication or assembly package. With hole tolerances unknown, XML keeps NC data as reference circles and custom attributes, not standard Hole elements; use the accompanying drill files for machining data. Mixed layers are not split into Profile or V-cut. Text curve tolerance is 0.001 mm.'],
  downloadIPC:['下載 IPC-2581 ZIP','Download IPC-2581 ZIP'],
  ipcSummary:['IPC-2581C · {layers} 層 · {holes} 個 NC 參考孔位','IPC-2581C · {layers} layers · {holes} NC reference hits'],
  sourceDataAbsent:['未找到元件清單、封裝實體或網路記錄；圖形不能還原為 BOM 或元件座標。','No component, footprint or net records found; graphics cannot reconstruct a BOM or component placement.'],
  sourceDataUnsupported:['檔案含元件、封裝或網路記錄，但本工具尚未解析，匯出會被阻擋以免遺失資料。','Component, footprint or net records were detected but are not parsed. Export is blocked to prevent data loss.'],
  title:['CAM Lens · PCB 檢視器','CAM Lens · PCB Viewer'],
  description:['在瀏覽器內檢視 CAM350 ASCII 電路板檔案、圖層與鑽孔尺寸，匯出 Gerber X2。檔案不會上傳。','View CAM350 ASCII PCB files, layers and drill sizes, and export Gerber X2 locally in your browser.'],
  viewerName:['PCB 檢視器','PCB Viewer'], privacy:['檔案只在本機讀取','Files stay on your device'], exportGerber:['匯出 Gerber','Export Gerber'],openFile:['＋ 開啟檔案','＋ Open file'],
  currentBoard:['目前圖面','Current board'],demoName:['範例板.pcb','Demo board.pcb'],demoBadge:['範例板 · 請載入你的檔案','Demo board · Open your file'],demoView:['範例板 · 非你的檔案','Demo board · Not your file'],
  layers:['圖層','Layers'],allLayers:['全部顯示','Show all'],copper:['銅箔','Copper'],holes:['孔位','Holes'],drills:['鑽孔','Drills'],drillHint:['點選一列，標出同尺寸的孔。','Select a row to highlight matching holes.'],
  tool:['刀具','Tool'],drawingMM:['孔圖 mm','Drawing mm'],drillMM:['鑽孔 mm','Drill mm'],count:['數量','Count'],clearFilter:['取消孔徑標示','Clear highlight'],formatInfo:['格式與顯示說明','Format & display notes'],
  formatHelp:['支援 CAM350 ASCII 文字格式；已以 6.0 版檔案驗證。其他版本、二進位檔與特殊圖形可能無法完整顯示。','Supports CAM350 ASCII text files, verified with version 6.0. Other versions, binary files and special graphics may not display completely.'],
  drillHelp:['「孔圖」來自孔位圖層；「鑽孔」來自 NC 刀具表，兩者可能因加工補償而不同。可另外匯出 Gerber X2 與 Excellon；不會修改原檔。','Drawing diameters come from drill drawings; drill diameters come from NC tools and may include compensation. Export Gerber X2 and Excellon without changing the source file.'],
  viewerAria:['電路板檢視區','PCB viewer'],pan:['移動','Pan'],measure:['量測','Measure'],grid:['網格','Grid'],zoomOut:['縮小','Zoom out'],zoomIn:['放大','Zoom in'],fit:['全圖','Fit'],
  canvasAria:['圖面。拖曳移動，滾輪縮放，F 鍵顯示全圖。','Board canvas. Drag to pan, scroll to zoom, press F to fit.'],drop:['放開以檢視檔案','Drop to open file'],gestures:['拖曳移動 · 滾輪縮放 · 點選鑽孔','Drag to pan · Scroll to zoom · Select a hole'],
  closeExport:['關閉匯出','Close export'],exportIntro:['每個圖層各存成一份 Gerber X2，打包成 ZIP。座標、比例與孔徑保持原值。','Save each layer as Gerber X2 in a ZIP. Coordinates, scale and diameters are preserved.'],
  selectAll:['選取全部','Select all'],visibleOnly:['目前顯示','Visible layers'],copperLayerCount:['銅箔層數','Copper layers'],exportLayers:['匯出圖層','Export layers'],function:['圖層用途 / Function','Layer function'],polarity:['圖形代表 / Polarity','Image polarity'],
  exportHelp:['用途依圖層名稱預選，請確認分類與銅箔層數。防焊預設為開窗；孔位圖含有框線時，請選「製作參考圖」。','Roles are suggested from layer names. Check roles and copper layer count. Soldermask defaults to openings; use Fabrication Drawing for a mixed drill/outline drawing.'],
  includeDrills:['附上 Excellon 鑽孔檔（NC 刀具直徑）','Include Excellon drills (NC tool diameters)'],includeText:['包含文字（依檔內字型轉成輪廓）','Include text (embedded font outlines)'],
  exportCaution:['文字曲線以 0.001 mm 容差近似，請覆核外觀。匯出不會自動建立純板框檔；交付製板前仍需確認板框。','Text curves are approximated within 0.001 mm; check their appearance. A standalone board profile is not generated and must be verified before fabrication.'],
  localConversion:['全程在本機轉換','Converted on your device'],downloadZip:['下載 Gerber ZIP','Download Gerber ZIP'],showLayer:['顯示 {name}','Show {name}'],solo:['單獨','Solo'],soloLayer:['單獨顯示 {name}','Show only {name}'],
  'role.copper_top':['正面銅箔 / Top Copper','Top Copper'],'role.copper_bottom':['背面銅箔 / Bottom Copper','Bottom Copper'],'role.inner':['內層銅箔 / Inner Copper','Inner Copper'],
  'role.mask_top':['正面防焊 / Top Soldermask','Top Soldermask'],'role.mask_bottom':['背面防焊 / Bottom Soldermask','Bottom Soldermask'],
  'role.legend_top':['正面文字 / Top Legend','Top Legend'],'role.legend_bottom':['背面文字 / Bottom Legend','Bottom Legend'],
  'role.paste_top':['正面錫膏 / Top Paste','Top Paste'],'role.paste_bottom':['背面錫膏 / Bottom Paste','Bottom Paste'],
  'role.drillmap':['鑽孔示意 / Drillmap','Drillmap'],'role.fabrication':['製作參考 / Fabrication Drawing','Fabrication Drawing'],'role.other':['其他參考 / Other Drawing','Other Drawing'],
  'role.nc':['鑽孔刀具 / NC Drill','NC Drill'],'role.drillDrawing':['孔位圖 / Drill Drawing','Drill Drawing'],
  positive:['材料 / Positive','Material / Positive'],negative:['移除 / Negative','Removal / Negative'],
  highlightTool:['標示 T{tool}，孔圖 {drawing} mm，鑽孔 {diameter} mm，{count} 孔','Highlight T{tool}: drawing {drawing} mm, drill {diameter} mm, {count} holes'],noNC:['沒有 NC 鑽孔資料','No NC drill data'],
  fileMeta:['CAM350 {version} · {count} 個圖形','CAM350 {version} · {count} objects'],layerCount:['{count} 層','{count} layers'],holeCount:['{count} 孔','{count} holes'],boardSize:['圖面範圍 {width} × {height} mm','Drawing bounds {width} × {height} mm'],
  displayNotes:['有 {count} 項顯示說明','{count} display notes'],loaded:['圖面已載入','Board loaded'],warningCount:['（{count} 筆）',' ({count} records)'],loadedFile:['已載入 {name} · {count} 個鑽孔','Loaded {name} · {count} drill hits'],reading:['正在讀取圖面…','Reading board…'],readFailed:['無法讀取檔案。','Unable to read the file.'],
  measureHint:['依序點選兩個位置以量測距離；再點一下可重新量測。','Select two points to measure. Select again to start a new measurement.'],measureStart:['已選取起點，請點選終點。','Start selected. Select the end point.'],measurement:['距離 {distance} mm　｜　ΔX {dx}　ΔY {dy}','Distance {distance} mm | ΔX {dx}  ΔY {dy}'],
  selectedDrill:['T{tool} · 鑽孔','T{tool} · Drill'],drawingValue:['孔圖　{value}','Drawing  {value}'],toolValue:['刀具　{value} mm','Tool  {value} mm'],noMatch:['無對應資料','No matching drawing'],
  checking:['正在檢查圖層…','Checking layers…'],exportSummary:['{gerbers} 份 Gerber X2 · {drills} 份 Excellon · {holes} 個鑽孔','Gerber X2: {gerbers} · Excellon: {drills} · Holes: {holes}'],omittedText:[' · 已排除 {count} 筆文字',' · {count} text objects excluded'],demoExport:[' · 目前是範例板',' · Demo board'],adjustExport:['請調整選項後再匯出','Adjust the settings before exporting'],
  exportLayer:['匯出 {name}','Export {name}'],layerFunction:['{name} 的圖層用途','Layer function for {name}'],layerPolarity:['{name} 的極性','Polarity for {name}'],downloadReady:['已產生 {name} · 請查看下載項目','Created {name} · Check your downloads'],
  toolOpenExport:['開啟 Gerber 匯出設定','Open Gerber export'],toolReadExport:['讀取 Gerber 匯出狀態','Read Gerber export status'],toolReadBoard:['讀取圖面摘要','Read board summary'],toolSetLayers:['設定顯示圖層','Set visible layers'],toolLanguage:['切換介面語言','Set interface language']
 };
 const messages = {
  '文字含 XML 不允許的字元。':'Text contains characters that XML cannot represent.',
  '文字挖空輪廓無法對應外框。':'A text cutout could not be matched to its outer contour.',
  '元件或網路資料尚未支援 IPC-2581 匯出。':'Component or net records are not yet supported by IPC-2581 export.',
  '尚未支援網路連接資料':'Net connectivity records are not supported',
  '檔案太大，請使用 30 MB 以下的檔案。':'Use a file smaller than 30 MB.',
  '這不是可讀取的 CAM350 ASCII 檔案。請選擇文字格式的 .pcb 或 .cam 檔案。':'This is not a readable CAM350 ASCII file. Choose a text-format .pcb or .cam file.',
  '檔案內有無效或超出範圍的座標。':'The file contains invalid or out-of-range coordinates.',
  '物件過多，請拆分檔案後再載入。':'Too many objects. Split the file before loading it.',
  '字型輪廓頂點數無效。':'Invalid font contour vertex count.', '字型輪廓資料不完整。':'Incomplete font contour data.', '光圈尺寸無效。':'Invalid aperture dimensions.',
  '有無法辨識的焊盤記錄':'Unrecognized pad records', '部分焊盤找不到光圈定義':'Some pads have no aperture definition', '部分焊盤含未支援的轉換旗標':'Some pads use unsupported transform flags',
  '負片挖空圖形尚未顯示':'Negative clear geometry is not displayed', '線段的頂點數無效。':'Invalid polyline vertex count.', '線段資料不完整，無法可靠顯示。':'Incomplete line data cannot be displayed reliably.',
  '部分線段含未支援的轉換旗標':'Some lines use unsupported transform flags', '有無法辨識的圓形記錄':'Unrecognized circle records', '圓形半徑無效。':'Invalid circle radius.', '部分圓形含未支援的轉換旗標':'Some circles use unsupported transform flags',
  '文字需覆核字型輪廓':'Check the reconstructed text outlines', '有無法辨識的文字':'Unrecognized text records', '未支援的圖形指令：':'Unsupported graphic command: ',
  '部分鑽孔路徑含未支援的轉換參數':'Some drill paths use unsupported transform parameters', '未支援的 NC 加工指令：':'Unsupported NC command: ', '拼板複製設定尚未展開':'Step-and-repeat is not expanded',
  '尚未支援焊盤堆疊':'Pad stacks are not supported', '尚未支援元件或封裝實體':'Component and footprint instances are not supported', '找不到可顯示的圖層或圖形。':'No displayable layers or geometry found.',
  '有物件找不到光圈定義':'Some objects have no aperture definition', '未支援的自訂光圈：':'Unsupported custom aperture: ', '部分鑽孔找不到刀具定義':'Some drills have no tool definition', '圖面範圍無效。':'Invalid drawing bounds.',
  '座標或尺寸超出 Gerber 4.6 格式範圍。':'Coordinates or dimensions exceed the Gerber 4.6 range.', '座標超出 Gerber 4.6 格式範圍。':'Coordinates exceed the Gerber 4.6 range.',
  '銅箔層數必須是 2 至 64 的整數。':'Copper layer count must be an integer from 2 to 64.', '內層銅箔的層號必須介於 2 與總層數減 1。':'Inner copper layer numbers must be between 2 and the total layer count minus 1.',
  '無效的 X2 圖層用途。':'Invalid X2 layer function.', 'NC 圖層須標示為鑽孔示意圖；實際加工資料在 Excellon 檔。':'NC layers must be labeled Drillmap; machining data is in the Excellon file.', '無效的 X2 圖層極性。':'Invalid X2 layer polarity.',
  '文字輪廓過於複雜。':'The text outline is too complex.', '字型含未支援的曲線旗標。':'The font uses unsupported curve flags.', '字型輪廓不完整。':'Incomplete font outline.', '字型曲線未封閉。':'The font curve is not closed.',
  '字型輪廓超出 Gerber 巨集頂點限制。':'The font outline exceeds the Gerber macro vertex limit.', '找不到文字的內嵌字型；可取消「包含文字」後匯出。':'Embedded font not found. Uncheck “Include text” to export without it.',
  '這種文字樣式尚未支援匯出；可取消「包含文字」。':'This text style cannot be exported. Uncheck “Include text” to exclude it.', '內嵌字型缺少字元：':'The embedded font is missing character: ',
  '文字尺寸無效。':'Invalid text dimensions.', '文字的字型尺寸與端點不一致，暫不匯出。':'Text font dimensions and end points disagree; export is blocked.', '線條字型尚未支援匯出；可取消「包含文字」。':'Stroke fonts cannot be exported. Uncheck “Include text” to exclude them.',
  '光圈數量過多。':'Too many apertures.', '圓形光圈尺寸無效。':'Invalid circular aperture dimensions.', '找不到有效的焊盤光圈。':'No valid pad aperture found.', '未支援的光圈：':'Unsupported aperture: ', '填色區域的頂點不足。':'The filled region has too few vertices.',
  '焊盤含未支援的轉換旗標。':'The pad uses unsupported transform flags.', '此圖層含未支援的填色或負片模式。':'This layer uses an unsupported fill or clear mode.', '此圖層含零寬度或非圓形光圈的線條，暫不匯出。':'This layer has zero-width or non-circular-aperture lines; export is blocked.',
  '圓形半徑必須大於零。':'Circle radius must be greater than zero.', '圖層含未支援的物件：':'Unsupported object in layer: ', '鑽孔缺少有效的刀具直徑。':'A drill has no valid tool diameter.', '同一刀具出現不一致的直徑。':'A tool has inconsistent diameters.', '鑽孔刀具超過 XNC 的 99 把限制。':'The drill tool count exceeds the XNC limit of 99.',
  '檔案含未支援的資料，無法完整匯出：':'Unsupported data prevents a complete export: ', '請至少勾選一個圖層。':'Select at least one layer.', '匯出的圖層 ID 無效。':'Invalid export layer ID.', '匯出檔案太多。':'Too many export files.', '匯出資料過大，請分批選取圖層。':'Export is too large. Select fewer layers at a time.', '圖層 ID 無效':'Invalid layer ID'
 };
 let language='zh-TW';
 function normalize(value){return /^en(?:-|$)/i.test(value)?'en':/^zh(?:-|$)/i.test(value)?'zh-TW':null;}
 function initialLanguage(storage,browserLanguage){try{const saved=storage?.getItem('cam-lens-language');if(normalize(saved))return normalize(saved);}catch{}return normalize(browserLanguage)||'en';}
 function setLanguage(value,persist=true){const normalized=normalize(value);if(!normalized)throw new Error('Unsupported language');language=normalized;if(persist)try{root.localStorage?.setItem('cam-lens-language',language);}catch{}return language;}
 function t(key,values={}){const entry=strings[key];if(!entry)throw new Error('Missing translation: '+key);return entry[language==='en'?1:0].replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??'{'+name+'}'));}
 function message(value){const text=String(value);if(language!=='en')return text;if(Object.hasOwn(messages,text))return messages[text];const block='檔案含未支援的資料，無法完整匯出：';if(text.startsWith(block))return messages[block]+text.slice(block.length).split('；').map(message).join('; ');for(const [key,translation] of Object.entries(messages))if(key.endsWith('：')&&text.startsWith(key))return translation+text.slice(key.length);return text;}
 function errorMessage(error){const translated=message(error.detail||error.message||error);return error.layerName?error.layerName+' — '+translated:translated;}
 function apply(doc){doc.documentElement.lang=language==='en'?'en':'zh-Hant';doc.title=t('title');doc.querySelector('meta[name="description"]')?.setAttribute('content',t('description'));for(const node of doc.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n);for(const node of doc.querySelectorAll('[data-i18n-aria]'))node.setAttribute('aria-label',t(node.dataset.i18nAria));for(const select of doc.querySelectorAll('.language-select'))select.value=language;}
 root.CAMI18n={t,message,errorMessage,apply,setLanguage,initialLanguage,normalize,strings,messages,get language(){return language;}};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.CAMI18n;
})(typeof globalThis!=='undefined'?globalThis:this);
