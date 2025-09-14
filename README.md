# Reflex Tester App

反射神経（反応時間）を測定するシンプルな Web アプリです。  
赤 → 緑 に変わったらできるだけ早くクリック／タップ。

## デモ
- GitHub Pages: https://seiya-matsuoka.github.io/reflex-tester-app/

## スクリーンショット
<div align="center">
  <img src="./assets/screenshot-initial.png"  width="320" alt="初期表示（開始前）">
  <img src="./assets/screenshot-waiting.png"  width="320" alt="待機中（赤）">
  <img src="./assets/screenshot-ready.png"    width="320" alt="押下前（緑）">
  <img src="./assets/screenshot-result.png"   width="320" alt="結果表示（反応速度）">
</div>

## 使い方
1. 画面中央のパッドをクリック（または Space / Enter）。
2. 待機中（赤）は押さないでください（押すとフライング）。
3. 緑になったらクリック（または Space / Enter）。反応時間を表示します。
4. 直近10回の平均・ベスト・試行回数はブラウザに保存されます（LocalStorage）。

## 仕様
- 状態遷移：`idle → waiting → ready → result`
- 計測：`performance.now()`
- 保存：`localStorage` キー `reflex_tester_stats`
  - `attempts`（試行回数）
  - `best`（ベストms）
  - `recent`（直近10件）

## 開発メモ
- セットアップ不要：`index.html` をブラウザで開くだけで動作します。
- 構成：index.html, style.css, script.js

## 技術スタック
- HTML / CSS / JavaScript (Vanilla)