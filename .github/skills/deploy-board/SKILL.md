---
name: deploy-board
description: "Use when building, previewing, or deploying the 時光歡迎看板 app. Covers dev server startup, production build, TypeScript type checking, and troubleshooting Vite/Express build issues."
argument-hint: "目標環境或動作 (e.g. '啟動開發伺服器', '建置正式版', '檢查型別錯誤')"
---

# 建置與部署歡迎看板

## 使用時機
- 啟動本地開發伺服器
- 建置正式版產品
- 執行 TypeScript 型別檢查
- 排查 Vite 或 Express 建置問題

## 專案架構

```
時光歡迎看板/
├── server.ts          # Express 後端（tsx 執行）
├── vite.config.ts     # Vite 設定
├── tsconfig.json      # TypeScript 設定
├── src/               # React 前端
└── dist/              # 建置輸出（執行 build 後產生）
```

## 常用指令

### 開發模式
```powershell
npm run dev
```
- 使用 `tsx server.ts` 啟動 Express + Vite 開發伺服器
- 預設在 `http://localhost:3000`（依 server.ts 設定）
- 前端：`http://localhost:3000/`
- 管理後台：`http://localhost:3000/admin`

### 型別檢查（不輸出檔案）
```powershell
npm run lint
```
執行 `tsc --noEmit`，回報所有 TypeScript 錯誤。

### 正式建置
```powershell
npm run build
```
輸出靜態檔案到 `dist/` 目錄。

### 預覽建置結果
```powershell
npm run preview
```
在本地預覽 `dist/` 的建置輸出。

### 清除建置快取
```powershell
npm run clean
```

## 排查常見問題

### 問題：型別錯誤
1. 執行 `npm run lint` 查看完整錯誤列表
2. 檢查 `src/lib/storage.ts` 的介面定義
3. 確認 `Slide` 和 `TextLine` 所有必要欄位都有填值

### 問題：模組找不到
1. 確認 `node_modules/` 存在（若無，執行 `npm install`）
2. 檢查 `vite.config.ts` 的 alias 設定

### 問題：伺服器無法啟動
1. 確認 `server.ts` 的 port 未被佔用
2. 檢查 `.env` 設定是否存在

