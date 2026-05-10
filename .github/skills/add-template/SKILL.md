---
name: add-template
description: "Use when adding a new slide template to 時光歡迎看板. Guides through defining template id, name, layout, background, and theme values in constants.ts. Use for: new welcome board themes, seasonal templates, corporate branding templates."
argument-hint: "描述新模板 (e.g. '科技感藍色模板，置中版型')"
---

# 新增投影片模板

## 使用時機
- 需要新增歡迎看板展示模板
- 建立季節性或品牌主題模板
- 擴充 `TEMPLATES` 陣列的樣式選項

## 步驟

### 1. 了解現有模板結構

讀取 `src/constants.ts`，確認：
- 現有 `TEMPLATES` 陣列的所有模板 ID（避免衝突）
- `Template` 介面定義的必要欄位
- 現有 `PRESET_BACKGROUNDS` 可用的背景圖片

### 2. 設計新模板

根據用戶需求，確定以下值：

```typescript
{
  id: 't-<unique-name>',           // 小寫加連字號，'t-' 前綴
  name: '模板顯示名稱',             // 2-8 個中文字
  layout: 'left' | 'center' | 'right' | 'full',
  backgroundUrl: '/presets/t-<unique-name>.jpg', // 管理者放入 data/presets/ 的圖片
  backgroundGradient: 'linear-gradient(...)',     // 圖片不存在時的 CSS fallback
  theme: {
    textColor: 'text-white',       // 或 'text-gray-900' 搭配淺色背景
    accentColor: 'bg-<color>-500', // Tailwind 顏色類別
    fontFamily: 'serif' | 'sans',
    overlayOpacity: 0.3,           // 0.1–0.6 之間
    titleSize: 'text-4xl md:text-6xl'
  }
}
```

**版型選擇指南：**
- `left` — 文字靠左，適合商務正式場合
- `center` — 文字置中，適合典禮、活動
- `right` — 文字靠右，現代設計感
- `full` — 全版展示，適合大型活動

**字型選擇指南：**
- `serif` — 優雅正式（典雅商務、傳統文化）
- `sans` — 現代簡潔（科技、年輕品牌）

### 3. 準備背景圖片

將圖片命名為 `t-<unique-name>.jpg`（或 .png），放入 `data/presets/` 資料夾。
伺服器會自動提供 `/presets/t-<unique-name>.jpg` 路徑。

同時在 `backgroundGradient` 欄位設定 CSS 漸層作為圖片不存在時的 fallback：
```
linear-gradient(135deg, #起點色 0%, #終點色 100%)
```

### 4. 新增至 constants.ts

在 `TEMPLATES` 陣列末尾加入新模板物件，確保：
- ID 唯一且以 `t-` 開頭
- 所有必要欄位完整填寫
- TypeScript 型別正確

### 5. 驗證

確認模板在 `AdminPanel.tsx` 的模板選擇 UI 中會正確顯示（系統自動讀取 `TEMPLATES` 陣列）。

## 模板 ID 命名慣例

| 風格 | ID 範例 |
|------|---------|
| 商務典雅 | `t-elegant` |
| 現代科技 | `t-tech` |
| 自然清新 | `t-nature` |
| 節慶喜氣 | `t-festival` |
| 品牌客製 | `t-brand-<company>` |
