
# 時光歡迎看板

現代化的全螢幕歡迎看板系統，支援投影片輪播、圖片上傳與管理後台。

## 本地開發

**環境需求：** Node.js

1. 安裝依賴：
   `npm install`
2. 啟動開發伺服器：
   `npm run dev`

## Docker 離線佈署 (無外網環境)

針對無法連線外網的終端機環境，我們採用本地打包映像檔 (Image) 後匯入的方式進行佈署。

### 初始上線步驟：

1. **在有網路的開發主機上打包映像檔：**
   ```bash
   npm run docker:pack
   ```
   *這會自動建置 Docker Image，並打包輸出成 `welcome-board.tar` 檔案。*

2. **將需佈署的檔案轉移到終端機：**
   利用隨身碟或內網，將以下檔案複製到無網路的終端主機上同一個資料夾：
   - `welcome-board.tar`
   - `docker-compose.yml`
   - `./data/` (如果已有預設資料可一併複製)

3. **在終端機上匯入並啟動：**
   ```bash
   # 載入映像檔
   docker load -i welcome-board.tar

   # 啟動系統
   docker-compose up -d
   ```

## 版本更新 (過版) 流程

若系統有任何新功能或修正，請依照以下步驟替離線終端機「過版」更新：

1. **開發主機：** 取得最新程式碼後，重新封裝：
   ```bash
   npm run docker:pack
   ```
2. **轉移檔案：** 將新產生的 `welcome-board.tar` 複製覆蓋終端主機上的舊檔案。
3. **終端主機：** 執行以下指令進行關閉、更新與重啟：
   ```bash
   # 1. 停止舊服務
   docker-compose down

   # 2. 載入新的映像檔 (會覆寫或更新標籤為 latest 的 image)
   docker load -i welcome-board.tar

   # 3. 重新啟動服務
   docker-compose up -d
   ```
   *掛載的 `./data/` 資料（佈景與設定）會自動保留，不會受映像檔更新影響喔。*
