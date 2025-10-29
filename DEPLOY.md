# 🚀 Vercelデプロイガイド

## 📋 デプロイ前の準備

### 1. GitHubリポジトリの準備
✅ すでに完了：https://github.com/syunsuke3032/-

### 2. 必要な環境変数

Vercelダッシュボードで以下の環境変数を設定してください：

#### 必須の環境変数

```
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

#### オプションの環境変数

```
# Supabase（データ保存する場合）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# API認証（外部API呼び出しを制限する場合）
API_KEYS=key1,key2,key3
```

---

## 🔧 Vercelでのデプロイ手順

### 方法1: Vercel Dashboard（推奨）

1. **Vercelにログイン**
   https://vercel.com/login

2. **新しいプロジェクトをインポート**
   - 「Add New...」→「Project」
   - GitHubリポジトリ `syunsuke3032/-` を選択

3. **環境変数を設定**
   - 「Environment Variables」セクションで上記の環境変数を追加
   - すべての環境（Production, Preview, Development）にチェック

4. **デプロイ**
   - 「Deploy」ボタンをクリック
   - 2-3分でデプロイ完了

### 方法2: Vercel CLI

```bash
# ログイン
vercel login

# デプロイ
cd "/Users/matsumotoshuntasuku/議事録AI"
vercel

# 環境変数を設定（対話式）
vercel env add GEMINI_API_KEY
vercel env add ANTHROPIC_API_KEY

# 本番デプロイ
vercel --prod
```

---

## ⚙️ Vercel設定の確認

### `vercel.json` の内容

```json
{
  "functions": {
    "app/api/transcribe/route.ts": {
      "maxDuration": 60,
      "memory": 3008
    },
    "app/api/summarize/route.ts": {
      "maxDuration": 60
    }
  }
}
```

これにより：
- 文字起こしAPI: 最大60秒、3GB メモリ
- 要約API: 最大60秒

---

## 🐛 トラブルシューティング

### 413エラー（ファイルが大きすぎる）

**原因:** 音声ファイルが50MBを超えている

**解決策:**
1. 音声ファイルを圧縮する
2. より小さいファイルでテストする
3. Vercel Proプランにアップグレード（100MB制限）

### Reactエラー（#425, #418, #423）

**原因:** ビルドエラーまたはコンポーネントの問題

**解決策:**
```bash
# ローカルでビルドテスト
npm run build

# エラーが出た場合、詳細を確認
npm run build 2>&1 | grep -i error
```

### Supabaseが動作しない

**原因:** 環境変数が設定されていない、またはSupabaseテーブルが作成されていない

**解決策:**
1. Vercelの環境変数を確認
2. Supabaseダッシュボードで`meeting_minutes`テーブルを確認
3. `supabase-schema.sql`を実行してテーブルを作成

### 環境変数が反映されない

**原因:** デプロイ後に環境変数を追加/変更した

**解決策:**
```bash
# 再デプロイ
vercel --prod --force
```

または、Vercelダッシュボードで「Redeploy」

---

## 📊 デプロイ後の確認

### 1. APIの動作確認

```bash
# 文字起こしAPI
curl -X POST https://your-app.vercel.app/api/transcribe \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@test-audio.mp3"

# 要約API
curl -X POST https://your-app.vercel.app/api/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"transcript": "テスト"}'
```

### 2. ブラウザで確認

- メインページ: `https://your-app.vercel.app`
- APIドキュメント: `https://your-app.vercel.app/api/docs`
- テストページ: `https://your-app.vercel.app/api-test.html`

---

## 🎯 パフォーマンス最適化

### ファイルサイズ制限

- **無料プラン:** 4.5MB（body）、10MB（function）
- **Hobby/Pro:** 4.5MB（body）、50MB（function）

大きいファイルを扱う場合は、以下を検討：
1. 音声を分割して処理
2. ストリーミング処理を実装
3. 外部ストレージ（S3など）を使用

### 実行時間制限

- **無料プラン:** 10秒
- **Hobby:** 10秒
- **Pro:** 60秒（設定済み）

---

## 🔒 セキュリティ

### 本番環境の推奨設定

1. **API_KEYS を必ず設定**
   ```
   API_KEYS=secure-key-1,secure-key-2
   ```

2. **HTTPSのみ使用**（Vercelは自動で有効）

3. **環境変数の管理**
   - Vercelダッシュボードで管理
   - GitHub Secretsには保存しない

4. **レート制限の追加**（将来的に実装）

---

## 📞 サポート

問題が発生した場合：

1. **ビルドログを確認**
   - Vercelダッシュボード → Deployments → Build Logs

2. **ランタイムログを確認**
   - Vercelダッシュボード → Deployments → Function Logs

3. **ローカルで再現**
   ```bash
   npm run build
   npm start
   ```

---

**🎉 デプロイ完了後、このURLをシェアできます！**

