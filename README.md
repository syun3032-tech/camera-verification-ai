# カメラ認証AI

カメラで書類を読み取り、CSVデータと自動照合するAIアプリケーション

## 📊 シーケンス図

詳細な機能フローについては [`SEQUENCE_DIAGRAM.md`](./SEQUENCE_DIAGRAM.md) を参照してください。
カメラ機能の詳細な動作フローについては [`CAMERA_FLOW.md`](./CAMERA_FLOW.md) を参照してください。
OCR → 照合フローについては [`OCR_FLOW.md`](./OCR_FLOW.md) を参照してください。

## 機能

- 📷 **カメラ撮影**: リアルタイムで書類を撮影
- 🔍 **AI文字認識**: Google Geminiによる高精度なOCR（光学文字認識）
- 📊 **CSV照合**: アップロードしたCSVファイルと自動照合
- ✅ **認証管理**: 車台番号などの照合と認証状態の管理
- 📱 **リアルタイム通知**: 未認証項目の自動検出と通知

⚠️ **重要**: カメラ機能は**HTTPS接続でのみ動作**します。ローカル開発環境（HTTP）では使用できません。本番環境ではVercelなどでHTTPS自動対応します。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash - 画像OCR処理

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルにAPIキーを設定：

```env
# Google Gemini API（OCR用 - 必須）
GOOGLE_API_KEY=your-gemini-api-key

# Supabase（オプション - データ保存する場合のみ）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使い方

1. **CSVファイルをアップロード** 📎ボタンからCSVファイルを選択
2. **カメラで書類を撮影** 📷ボタンで書類の車台番号などを撮影
3. **自動照合** AIが車台番号を抽出し、CSVと自動照合
4. **読み込み完了チェック** 「読み込み完了」ボタンで未認証項目を確認

## CSVファイル形式

CSVファイルは以下の形式を想定しています：
- **ヘッダー行**: 3行目にヘッダー（例: `乙仲,Inv. No.,Shipper,...,Chassis No.,...`）
- **データ行**: 4行目以降にデータ
- **車台番号列**: `Chassis No.` または `車台番号` という列名

### サンプルCSV構造

```csv
（1行目、2行目は任意のヘッダー）
乙仲,Inv. No.,Shipper,...,Chassis No.,...
ＥＣＬ川崎,92401242,"AAA CO.,LTD.",...,GGH30-0042610,...
```

## UIの特徴

- 🎨 **ChatGPT風のデザイン**: 使い慣れたチャット形式
- 📷 **リアルタイムカメラ**: Webカメラを使った書類撮影
- 🔍 **ガイドライン表示**: 撮影しやすいガイドライン
- ⚡ **リアルタイムフィードバック**: 処理状況を逐次表示
- 📱 **レスポンシブ**: モバイルでも快適に使用可能

## 料金目安

### Google Gemini 2.0 Flash
- 無料枠: 毎分1,500リクエスト
- 画像OCR: 1画像あたり約$0.0001〜0.0005

### 目安
書類1枚の認証で約 **$0.0001〜0.0005**

## API取得方法

### Google Gemini API
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 「Get API Key」をクリック

## ライセンス

MIT
