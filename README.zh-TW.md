# CAM Lens

**在本機瀏覽器中檢視 CAM350 ASCII 電路板，並匯出 Gerber X2。**

[English](README.md) | 繁體中文

CAM Lens 可以開啟舊版 CAM350 文字資料庫、查看圖層與鑽孔尺寸，並將各層匯出為 Gerber X2。所有轉換都在瀏覽器內進行，不需要帳號、上傳檔案、安裝套件或建置環境。

## 快速開始

1. 下載或複製這個專案。
2. 用新版桌面瀏覽器開啟 **`dist/index.html`**，或直接開啟單檔離線版 **`CAM-Lens.html`**。
3. 按「**開啟檔案**」，或拖入 CAM350 ASCII 的 `.pcb`、`.cam`、文字格式備份檔。
4. 使用「**繁體中文 / English**」選單切換語言。

初始畫面是程式產生的範例板，不含真實客戶圖面。`.pcb` 只是副檔名，不能保證檔案是 CAM350 格式；目前不支援 KiCad、其他 PCB 格式、CAM350 二進位資料庫，或將 Gerber 當作輸入檔。

也可在專案資料夾啟動本機伺服器：

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

再開啟 [localhost:8765](http://127.0.0.1:8765)。不需要安裝 npm 套件。

## 功能

- 繁體中文與英文介面，涵蓋錯誤訊息、操作提示、無障礙標籤與匯出設定，並記住語言偏好。
- 個別圖層顯示、單層檢視，以及銅箔／孔位預設篩選。
- 拖曳移動、滾輪／雙指縮放、按 **F** 顯示全圖。
- 以毫米為單位的兩點距離量測。
- 鑽孔尺寸表、同孔徑標示，以及單孔座標檢視。
- 分別顯示孔圖直徑與 NC 刀具直徑，保留原檔加工補償。
- 匯出全部或指定圖層為 Gerber X2，可設定圖層用途、極性與銅箔層數。
- 依鍍孔／非鍍孔分開輸出 Excellon / XNC 鑽孔檔。
- ZIP 下載，附檔案清單與轉換說明。
- 可選用的 WebMCP 工具，支援語言、顯示圖層、圖面摘要與匯出視窗；下載仍由使用者操作。

切換語言時，已載入的圖面、縮放位置、量測、選孔與匯出設定都會保留。中文模式保留英文圖層術語對照；英文模式使用英文說明。原始檔名、圖層名稱與板上文字不會被翻譯。

## 匯出 Gerber

1. 開啟支援的 CAM350 ASCII 檔，按「**匯出 Gerber**」。
2. 勾選圖層，確認「**銅箔層數**」、每層「**用途**」與「**極性**」。
3. 選擇是否附上 NC 鑽孔檔與檔內字型文字。
4. 按「**下載 Gerber ZIP**」。

每份 `.gbr` 都使用 **Gerber X2**，以毫米與 4.6 絕對座標輸出，含 `.FileFunction`、`.FilePolarity`、`.SameCoordinates`、`.CreationDate` 與 `.GenerationSoftware` 屬性。各層沿用原始座標與方向，不縮放、不鏡像。

預設用途對照：

| 原圖層 | 建議用途 | X2 FileFunction |
| --- | --- | --- |
| `COMP` | 正面銅箔 / Top Copper | `Copper,L1,Top` |
| `SOLD` | 背面銅箔 / Bottom Copper | `Copper,L<n>,Bot` |
| `CMSK` / `SMSK` | 正面／背面防焊 / Soldermask | `Soldermask,Top` / `Soldermask,Bot` |
| `CILK` / `SILK` | 正面／背面文字 / Legend | `Legend,Top` / `Legend,Bot` |
| NC 鑽孔圖層 | 鑽孔示意 / Drillmap | `Drillmap` |
| 其他圖層 | 孔位或製作參考圖 | `Drillmap`、`FabricationDrawing` 或 `OtherDrawing` |

`n` 代表銅箔總層數，預設 **2**，可設定 **2–64**，也可指定內層銅箔。防焊預設 **Negative**，代表圖形是防焊開窗；這個屬性描述材料用途，不會反轉圖形本身。

孔圖與刀具直徑可以不同。例如 **孔圖 0.9 mm／NC 刀具 1.0 mm**，匯出後仍會維持這個差值。`.drl` 使用 NC 刀具直徑及明確的毫米小數座標。`drill_map.gbr` 是參考圖，不能取代 Excellon 鑽孔檔。

## 支援格式與限制

已用 **CAM350 6.0 ASCII** 資料庫驗證，目前支援以下範圍：

| 資料 | 支援範圍 |
| --- | --- |
| 線與折線 | 基本圓形光圈線條、填色多邊形 |
| 焊盤 | 圓形、方形、矩形、長圓形、環形光圈 |
| 圓形 | 基本圓框與實心圓 |
| 鑽孔 | NC `HIT` 孔位與刀具表 |
| 文字 | 部分 `TEXT2` 樣式及內嵌 TrueType 輪廓 |

座標使用 CAM350 的 0.002 µm 資料庫單位，即每毫米 500,000 單位。光圈參照是表格索引，與 D-code 不同；NC 路徑則透過圖層指定的刀具表解析。

**這是支援部分格式的轉換工具，不能取代完整 CAM350，也不保證直接構成完整製板資料。**

- 自訂光圈、負片挖空、銑槽、轉換旗標、焊盤堆疊、元件實體與拼板複製等未支援內容，可能顯示警告並阻止匯出。
- 文字曲線以 0.001 mm 容差轉成折線，請覆核外觀。不支援的文字可以明確取消勾選，匯出清單會記錄省略的內容。
- 不會自動建立獨立的 **Profile／板框** 檔。製板前仍需確認並提供板框資料。
- 原檔缺乏的網路、元件、腳位、公差屬性不會被自行補造。
- 輸入上限為 30 MB、350,000 個圖形；大型輸出可能需要分批選取圖層。
- 不保證其他 CAM350 版本或二進位資料庫的相容性。

## 隱私

應用程式只將選取的檔案讀入瀏覽器記憶體，不上傳圖面、不寫回原檔、不發送分析追蹤，也不主動發出應用程式網路請求。使用網站版時，載入頁面資源仍會產生一般網頁請求。瀏覽器儲存空間只記錄介面語言；無法儲存偏好時，主要功能仍可使用。重新整理會清除載入的圖面。

公開版本只附程式產生的範例板及測試資料，不包含私人 PCB、匯出的製造檔、網站部署設定、憑證或私人版本歷史。內嵌字型從使用者自己的檔案讀取，專案不附商業字型檔。

## 開發與測試

原始碼是一般 HTML、CSS 與 JavaScript。測試及打包腳本需要 **Node.js 20 以上**，沒有外部套件依賴；單純使用檢視器不需要 Node。

```sh
node --test parser.test.cjs exporter.test.cjs i18n.test.cjs
node scripts/build-standalone.cjs
```

第二行會依目前 `dist` 內容重新產生 `CAM-Lens.html`，也可在最後傳入自訂輸出路徑。

測試涵蓋光圈索引、刀具對應、正負座標、X2 屬性與極性、鑽孔補償、文字排除、未支援格式、鍍孔／非鍍孔分離及翻譯完整性。解析器與匯出器另有需要私人參考檔的選用回歸測試，公開專案不附該檔案。

曾使用獨立的 Gerbonara 讀取器驗證匯出 Gerber／XNC、比對座標與光圈尺寸、檢查文字輪廓和 ZIP 校驗碼。這不代表所有 CAM350 檔案都通過製造認證。

```text
 dist/
   index.html       網頁與無障礙控制項
   style.css        自適應介面樣式
   i18n.js          中英文字典與語言偏好
   parser.js        CAM350 ASCII 解析器
   exporter.js      Gerber X2、XNC 與 ZIP 匯出器
   app.js           圖面繪製與操作
 scripts/
   build-standalone.cjs      建立離線單檔
   prepare-open-source.cjs  依明確清單整理公開原始碼
 *.test.cjs          不依賴外部套件的回歸測試
 LICENSE            MIT 授權
```

從開發資料夾整理新的公開版本：

```sh
node scripts/prepare-open-source.cjs ../cam-lens-public
```

目標資料夾必須尚未存在。腳本只複製明確列出的程式、文件與測試，再建立離線單檔；不會複製 `.git`、`.openai`、圖面或製造檔。

## 發布到 GitHub

建立名稱例如 `cam-lens` 的公開倉庫，再上傳**解壓縮後的專案內容**，保留 `dist` 與 `scripts` 資料夾結構，包含中英文 README 與 `LICENSE`。不要只將原始碼 ZIP 當成唯一的倉庫檔案。

命令列發布方式可參考 GitHub 的[將本機程式加入 GitHub 說明](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)。如果已有本機 Git 歷史，建立 GitHub 倉庫時不要再初始化另一份 README 或授權檔，避免歷史衝突。公開版本不需要任何私人網站設定。

## 參與開發

歡迎問題回報與範圍明確的 pull request。請提供介面語言、瀏覽器、預期行為，以及最小的**人工範例或可公開** CAM350 檔案，不要附上機密板圖。調整解析器或匯出器時，請增加能驗證圖形或錯誤處理的測試；介面文字則應同時加入 `dist/i18n.js` 的兩種語言。提交前請執行測試並重新產生離線版。

## 授權與參考

採用 [MIT 授權](LICENSE)，可依其條款使用、修改及散布。

- [Ucamco Gerber Layer Format 規格](https://www.ucamco.com/files/downloads/file_en/456/gerber-layer-format-specification-revision-2024-05_en.pdf)
- [Ucamco XNC Format 規格](https://www.ucamco.com/files/downloads/file_en/452/xnc-format-specification-revision-2021-11_en.pdf)
