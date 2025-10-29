# 議事録作成AI

ChatGPT風のチャットUIで音声/動画ファイルから自動で議事録を作成するAIアプリケーション

## 機能

- 💬 **チャット形式UI**: ChatGPTライクな直感的なインターフェース
- 🎤 **音声/動画文字起こし**: Google Gemini 2.0 Flash による高精度な文字起こし
- 📝 **AI自動要約**: Claude 3.5 Sonnet または Gemini が議事録を自動作成
- 💾 **データ管理**: Supabaseで議事録を安全に保存・管理
- 📥 **リアルタイム表示**: チャット形式で処理状況をリアルタイム表示

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **AI**: 
  - Google Gemini 2.0 Flash - 音声/動画文字起こし
  - Anthropic API (Claude 3.5 Sonnet) - 議事録要約

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルにAPIキーを設定：

```env
# Google Gemini API（文字起こし用 - 必須）
GEMINI_API_KEY=your-gemini-api-key

# Anthropic API（要約用 - 必須）
ANTHROPIC_API_KEY=your-anthropic-api-key

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

1. **チャット画面が開きます**
2. **📎ボタン**をクリックして音声/動画ファイルを選択
3. 自動的に処理が開始されます：
   - Geminiで文字起こし実行中...
   - 文字起こし完了 → 全文表示
   - Claudeで議事録作成中...
   - 議事録完成 → 構造化された議事録を表示

## 対応フォーマット

- **音声**: MP3, WAV, FLAC, OGG, M4A
- **動画**: MP4, MOV, AVI, WEBM

## UIの特徴

- 🎨 **ChatGPT風のデザイン**: 使い慣れたチャット形式
- 🌓 **ダークモード対応**: 見やすい配色
- ⚡ **リアルタイムフィードバック**: 処理状況を逐次表示
- 📱 **レスポンシブ**: モバイルでも快適に使用可能

## 料金目安

### Google Gemini 2.0 Flash
- 無料枠: 毎分1,500リクエスト
- 音声入力: $0.00001875 / 秒（約$0.011 / 分）

### Claude 3.5 Sonnet
- 入力: $3/MTok
- 出力: $15/MTok
- 目安: 議事録1件あたり約$0.05

### 合計目安
10分の音声で約 **$0.15〜0.20**

## API取得方法

### Google Gemini API
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 「Get API Key」をクリック

### Anthropic API
1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. API Keysからキーを生成

## ライセンス

MIT
# -
