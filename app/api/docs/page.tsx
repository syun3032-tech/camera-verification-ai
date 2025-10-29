export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            📚 議事録AI - API ドキュメント
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            音声ファイルの文字起こしと議事録生成APIの使用方法
          </p>

          {/* 認証セクション */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              🔐 認証
            </h2>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-gray-800 dark:text-gray-200 mb-2">
                全てのAPIリクエストには、Authorizationヘッダーが必要です：
              </p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`Authorization: Bearer YOUR_API_KEY`}
              </pre>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>⚠️ 注意:</strong> APIキーが設定されていない場合、認証なしでアクセス可能です（開発環境のみ）
              </p>
            </div>
          </section>

          {/* エンドポイント1: 文字起こし */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🎤 POST /api/transcribe
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              音声ファイルを文字起こしします（話者識別付き）
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              リクエスト
            </h3>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Content-Type: multipart/form-data</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-600">
                    <th className="text-left py-2 text-gray-900 dark:text-white">パラメータ</th>
                    <th className="text-left py-2 text-gray-900 dark:text-white">型</th>
                    <th className="text-left py-2 text-gray-900 dark:text-white">説明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 text-gray-800 dark:text-gray-200">file</td>
                    <td className="py-2 text-gray-800 dark:text-gray-200">File</td>
                    <td className="py-2 text-gray-800 dark:text-gray-200">音声ファイル（MP3, WAV, M4A, MP4など）</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              レスポンス
            </h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto mb-4">
{`{
  "success": true,
  "transcript": "**話者A:**\\n会議を始めます...\\n\\n**話者B:**\\nよろしくお願いします..."
}`}
            </pre>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              サンプルコード (cURL)
            </h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`curl -X POST https://your-domain.com/api/transcribe \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@/path/to/audio.mp3"`}
            </pre>
          </section>

          {/* エンドポイント2: 要約 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              📝 POST /api/summarize
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              文字起こしテキストから議事録を生成します
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              リクエスト
            </h3>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Content-Type: application/json</p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`{
  "transcript": "**話者A:**\\n会議を始めます..."
}`}
              </pre>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              レスポンス
            </h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto mb-4">
{`{
  "success": true,
  "summary": "## 📋 議事録\\n\\n### 💬 会話の流れ...",
  "id": "uuid-here",
  "saved": true
}`}
            </pre>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              サンプルコード (JavaScript)
            </h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`const response = await fetch('https://your-domain.com/api/summarize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    transcript: '**話者A:**\\n会議を始めます...'
  })
});

const data = await response.json();
console.log(data.summary);`}
            </pre>
          </section>

          {/* 使用例フロー */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🔄 完全な使用フロー
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 rounded">
              <ol className="list-decimal list-inside space-y-2 text-gray-800 dark:text-gray-200">
                <li>音声ファイルを <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/api/transcribe</code> にアップロード</li>
                <li>返された <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">transcript</code> を取得</li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">transcript</code> を <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/api/summarize</code> に送信</li>
                <li>構造化された議事録を取得</li>
              </ol>
            </div>
          </section>

          {/* エラーコード */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              ⚠️ エラーコード
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">コード</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">説明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-mono">400</td>
                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200">リクエストが不正です（ファイルまたはtranscriptが欠落）</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-mono">401</td>
                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200">認証エラー（APIキーが無効または欠落）</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-mono">500</td>
                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200">サーバーエラー（処理に失敗）</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* レート制限 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              ⏱️ レート制限
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              現在、レート制限は実装されていません。将来的に追加される可能性があります。
            </p>
          </section>

          {/* フッター */}
          <footer className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-12">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              © 2025 議事録AI - Powered by Gemini & Claude
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

