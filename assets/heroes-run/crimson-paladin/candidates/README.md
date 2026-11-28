# 緋紅聖騎 Crimson Paladin — W / NW 審閱包

本包包含本次使用使用者提供原版肖像重新繪製的實際 WebP 圖片，不是正式入庫包。

- W：1254×1254，627×627 每格，四格核心細節範圍均超過 441px，但原始低透明度邊界接觸格線，聖光／髮絲裁切仍需確認。
- NW：從 1774×887 混合方向原圖取得右半四格；每格約 443×443，實際核心高度低於 441px，不能宣稱原生 3×。僅供方向與人物形象參考。
- 未放大，NW 僅分格並透明補齊一像素。
- Polytool / cwebp 未能安裝。為使本次有實際圖片可審閱，審閱包明確使用 Pillow WebP quality=100，不是正式 Polytool 轉換；不可直接上傳為正式專案素材。
- 正式交付需取得合格獨立 NW 圖、修正 W 邊界、確認武器持握及腳底錨點，再用 Polytool `towebp -c -q 100` 對原始檔進行轉換。
- 所有素材 QA_PENDING，不得直接接入 Runtime。

預定正式目錄：`src/assets/es2/production/heroes/crimson-paladin/candidates/`，待核對最新分支後決定批次。
