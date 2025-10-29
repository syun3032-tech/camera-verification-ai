# 🔑 環境変数の設定

## 重要：以下の手順で `.env.local` ファイルを編集してください

### 1. ファイルを開く

エディタで `.env.local` ファイルを開いてください。

### 2. 以下の内容に変更

```env
# Supabase（オプション - データ保存する場合のみ）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Gemini API（文字起こし - 必須）
GEMINI_API_KEY=your-gemini-api-key

# Anthropic API（要約 - 必須）
ANTHROPIC_API_KEY=your-anthropic-api-key

# API認証（外部からのAPI呼び出しを制限する場合）
# 複数のキーをカンマ区切りで設定可能
# 例: API_KEYS=key1,key2,key3
API_KEYS=your-api-key-1,your-api-key-2
```

### 3. 保存して開発サーバーを再起動

```bash
# 現在のサーバーを停止（Ctrl+C）
# 再起動
npm run dev
```

## ✅ 最低限必要な設定

すぐに動かすには、以下の2つを設定すればOK：

1. ✅ **ANTHROPIC_API_KEY** - すでに上記に記載
2. ⚠️ **OPENAI_API_KEY** - [OpenAI Platform](https://platform.openai.com/api-keys)から取得

## 📝 オプション設定

- **Supabase** - 議事録を保存したい場合のみ設定
  - 設定しない場合：チャットで結果は見れるが、保存されない
  - 設定した場合：データベースに保存され、後から参照可能

## 🚀 設定が完了したら

[http://localhost:3000](http://localhost:3000) にアクセスして、以下を試してください：

1. 📎ボタンをクリック
2. 音声ファイルを選択
3. 自動で処理開始！

---

**※ OpenAI APIキーがない場合は、[こちら](https://platform.openai.com/)で無料アカウントを作成してください。**




