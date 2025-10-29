# 🚀 議事録AI - API使用ガイド

外部プラットフォームから議事録AIのAPIを呼び出す方法を説明します。

## 📋 目次

1. [APIの有効化](#apiの有効化)
2. [認証方法](#認証方法)
3. [エンドポイント一覧](#エンドポイント一覧)
4. [使用例](#使用例)
5. [各種プラットフォームとの連携](#各種プラットフォームとの連携)

---

## APIの有効化

### 1. APIキーの設定（オプション）

`.env.local` ファイルに以下を追加：

```env
# API認証キー（カンマ区切りで複数設定可能）
API_KEYS=sk_test_abc123,sk_prod_xyz789
```

**注意:** `API_KEYS` を設定しない場合、認証なしでAPIにアクセスできます（開発環境のみ推奨）。

### 2. サーバーの起動

```bash
npm run dev
# または本番環境
npm run build && npm start
```

### 3. APIドキュメントの確認

ブラウザで以下にアクセス：
```
http://localhost:3000/api/docs
```

---

## 認証方法

全てのAPIリクエストには、Authorizationヘッダーが必要です：

```
Authorization: Bearer YOUR_API_KEY
```

**例:**
```bash
curl -X POST https://your-domain.com/api/transcribe \
  -H "Authorization: Bearer sk_test_abc123" \
  -F "file=@audio.mp3"
```

---

## エンドポイント一覧

### 🎤 POST /api/transcribe

音声ファイルを文字起こし（話者識別付き）

**リクエスト:**
- Content-Type: `multipart/form-data`
- Body: `file` (音声ファイル)

**レスポンス:**
```json
{
  "success": true,
  "transcript": "**話者A:**\n会議を始めます..."
}
```

### 📝 POST /api/summarize

文字起こしから議事録を生成

**リクエスト:**
- Content-Type: `application/json`
- Body:
```json
{
  "transcript": "**話者A:**\n会議を始めます..."
}
```

**レスポンス:**
```json
{
  "success": true,
  "summary": "## 📋 議事録\n\n### 💬 会話の流れ...",
  "id": "uuid-here",
  "saved": true
}
```

---

## 使用例

### JavaScript/TypeScript

```typescript
// 1. 音声ファイルを文字起こし
const formData = new FormData();
formData.append('file', audioFile);

const transcribeResponse = await fetch('https://your-domain.com/api/transcribe', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
});

const { transcript } = await transcribeResponse.json();

// 2. 議事録を生成
const summarizeResponse = await fetch('https://your-domain.com/api/summarize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({ transcript })
});

const { summary } = await summarizeResponse.json();
console.log(summary);
```

### Python

```python
import requests

# 1. 音声ファイルを文字起こし
with open('audio.mp3', 'rb') as f:
    response = requests.post(
        'https://your-domain.com/api/transcribe',
        headers={'Authorization': 'Bearer YOUR_API_KEY'},
        files={'file': f}
    )
    transcript = response.json()['transcript']

# 2. 議事録を生成
response = requests.post(
    'https://your-domain.com/api/summarize',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    json={'transcript': transcript}
)
summary = response.json()['summary']
print(summary)
```

### cURL

```bash
# 1. 文字起こし
curl -X POST https://your-domain.com/api/transcribe \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@audio.mp3" \
  -o transcript.json

# 2. 議事録生成
TRANSCRIPT=$(jq -r '.transcript' transcript.json)
curl -X POST https://your-domain.com/api/summarize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"transcript\": \"$TRANSCRIPT\"}"
```

---

## 各種プラットフォームとの連携

### 🔧 Dify

1. **HTTPリクエストノード**を追加
2. URL: `https://your-domain.com/api/transcribe`
3. Method: `POST`
4. Headers:
   - `Authorization: Bearer YOUR_API_KEY`
5. Body: `multipart/form-data` でファイルを送信

### 🔗 n8n

1. **HTTP Request**ノードを追加
2. 認証: **Generic Credential Type** → **Header Auth**
3. Header Name: `Authorization`
4. Header Value: `Bearer YOUR_API_KEY`
5. Method: `POST`
6. Body: **Multipart Form Data**

### 🎨 Make (Integromat)

1. **HTTP**モジュールを追加
2. URL: `https://your-domain.com/api/transcribe`
3. Method: `POST`
4. Headers:
   ```
   Authorization: Bearer YOUR_API_KEY
   ```
5. Body type: **Multipart/form-data**

### 🚀 Zapier

Zapierではカスタムリクエストを使用：

1. **Webhooks by Zapier** → **Custom Request**
2. URL: `https://your-domain.com/api/transcribe`
3. Method: `POST`
4. Headers:
   ```json
   {
     "Authorization": "Bearer YOUR_API_KEY"
   }
   ```

### 💬 Slack Bot

Slack Botから呼び出す例：

```javascript
app.event('file_shared', async ({ event, client }) => {
  // ファイルをダウンロード
  const fileInfo = await client.files.info({ file: event.file_id });
  const audioUrl = fileInfo.file.url_private;
  
  // 議事録AIに送信
  const response = await fetch('https://your-domain.com/api/transcribe', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: formData
  });
  
  const { transcript } = await response.json();
  
  // Slackに結果を投稿
  await client.chat.postMessage({
    channel: event.channel_id,
    text: `議事録：\n${transcript}`
  });
});
```

---

## 🔒 セキュリティ

### 本番環境での推奨設定

1. **必ずHTTPSを使用**（Let's EncryptやVercelの自動SSL）
2. **APIキーを必ず設定**（`.env.local` の `API_KEYS`）
3. **APIキーは定期的に変更**
4. **レート制限の導入**（将来的に実装予定）

### APIキーの管理

- APIキーは安全な場所に保管
- GitHubなどに絶対にコミットしない
- 環境変数として管理
- チームメンバーごとに異なるキーを発行

---

## 🐛 トラブルシューティング

### 401 Unauthorized エラー

- APIキーが正しいか確認
- `Authorization: Bearer` の形式になっているか確認
- `.env.local` の `API_KEYS` が正しく設定されているか確認

### CORS エラー

- ブラウザから直接呼び出す場合、CORSは自動的に許可されています
- 問題が続く場合は、`lib/api-auth.ts` の `addCorsHeaders` 関数を確認

### 500 Internal Server Error

- サーバーログを確認（`npm run dev` の出力）
- Gemini APIキーとAnthropic APIキーが正しく設定されているか確認

---

## 📞 サポート

問題が解決しない場合は、以下を確認してください：

1. サーバーログ（ターミナルの出力）
2. ブラウザのコンソール（開発者ツール）
3. `.env.local` の設定

---

**🎉 これで外部プラットフォームからAPIを呼び出せるようになりました！**

