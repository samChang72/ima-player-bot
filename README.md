# IMA Player Bot v3

自動開啟 5 個播放 Google IMA 廣告的頁面，每 20 秒重啟分頁，並偵測播放錯誤後自動 reload。所有錯誤與事件會記錄在 `ad_log.txt`。

## 安裝

```bash
npm install
```

## 啟動

```bash
npm start
```

## 功能
- 每次開啟 5 個頁面
- 每 20 秒關閉重啟
- 播放指定 VAST 廣告
- 播放錯誤自動 reload 分頁並釋放資源
- 錯誤事件寫入 ad_log.txt

