# セットアップガイド

## ✅ すでに設定済み

提供されたAPIキーで以下が設定されています：

- **Google Cloud Video Intelligence API** - 音声/動画の文字起こし
- **Anthropic API (Claude)** - 議事録の要約

## 🔧 環境変数の最終設定

`.env.local` ファイルを以下のように編集してください：

```env
# Supabase（オプション - データ保存する場合のみ）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Anthropic API（Claude - 要約用）
ANTHROPIC_API_KEY=AQ.Ab8RN6IU6aTEI08xR4GDm0IjS5faCBWNzU5ffTx0aDzmeAibtA

# Google Cloud API（文字起こし用）
GOOGLE_CLOUD_API_KEY=AQ.Ab8RN6IU6aTEI08xR4GDm0IjS5faCBWNzU5ffTx0aDzmeAibtA
```

## 🚀 起動方法

開発サーバーがすでに起動中です！

**http://localhost:3000** にアクセスしてください。

環境変数を変更した場合は、サーバーを再起動してください：

```bash
# Ctrl+C で停止
npm run dev
```

## 💡 使い方

1. チャット画面が表示されます
2. **左下の📎ボタン**をクリック
3. 音声/動画ファイルを選択（MP3, WAV, MP4など）
4. 自動的に処理開始：
   - ⏳ 文字起こし中...（Google Cloud API）
   - ✅ 文字起こし完了 → 全文表示
   - ⏳ 議事録作成中...（Claude API）
   - ✅ 議事録完成！

## 📁 対応フォーマット

### 音声ファイル
- MP3
- WAV
- FLAC
- OGG

### 動画ファイル
- MP4
- AVI
- MOV

## 💰 料金について

### Google Cloud Speech-to-Text
- **無料枠**: 月60分まで無料
- **有料**: $0.024/分

### Claude 3.5 Sonnet
- **入力**: $3/MTok
- **出力**: $15/MTok
- **目安**: 議事録1件あたり約$0.05

### 合計目安
10分の音声/動画で約 **$0.10〜0.15**

## ⚠️ トラブルシューティング

### 文字起こしエラー

1. APIキーが正しく設定されているか確認
2. ファイルサイズを確認（10MB以下推奨）
3. 対応フォーマットか確認

### Supabaseは必須？

いいえ、**オプション**です！

- 設定しない場合：チャットで結果は見れるが保存されない
- 設定する場合：データベースに保存され、後から参照可能

## 🎉 これで完成！

**http://localhost:3000** にアクセスして、早速使ってみてください！
