// Google AI Platform API を使用

export async function transcribeAudio(audioFile: File): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません");
  }

  try {
    // ファイルをBase64に変換
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // MIMEタイプを取得
    const mimeType = audioFile.type || "audio/mpeg";

    const prompt = `この音声ファイルを日本語で文字起こししてください。

【重要】以下の形式で出力してください：

**話者A:**
[話者Aの発言内容]

**話者B:**
[話者Bの発言内容]

**話者A:**
[話者Aの次の発言]

【注意事項】
- 音声から発言者を識別し、2-3人の話者に分けてください
- 話者の声の特徴（高さ、トーン、話し方）から推測してください
- 同じ人物の発言は同じ話者として統一してください
- 時系列順に、誰がどの順番で話したかを正確に記録してください
- 句読点を適切に入れて、自然な日本語にしてください`;

    // Google AI Platform REST API を呼び出し
    const response = await fetch(
      `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(
        `Gemini APIエラー: ${errorData.error?.message || "Unknown error"}`
      );
    }

    const data = await response.json();

    // レスポンスからテキストを抽出
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("文字起こしに失敗しました");
    }

    return text;
  } catch (error) {
    console.error("Gemini transcription error:", error);
    throw error;
  }
}

export async function transcribeAndSummarize(
  audioFile: File
): Promise<{ transcript: string; summary: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません");
  }

  try {
    // ファイルをBase64に変換
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // MIMEタイプを取得
    const mimeType = audioFile.type || "audio/mpeg";

    const prompt = `この音声ファイルを分析して、以下の2つを提供してください：

1. **完全な文字起こし**
   - 話し言葉をそのまま忠実に書き起こしてください
   - 句読点を適切に入れてください

2. **議事録サマリー**（以下の形式で）

## 📋 議事録サマリー

### 👥 参加者
- [参加者がわかれば記載、不明な場合は「記録なし」]

### 📌 主な議題
- [議題1]
- [議題2]

### ✅ 決定事項
- [決定事項1]
- [決定事項2]

### 📝 アクションアイテム
- [担当者]: [タスク内容]

### 📅 次回の予定
- [次回の予定があれば記載、なければ「未定」]

### 💡 その他メモ
- [その他重要なポイント]

---

必ず「===文字起こし===」と「===議事録===」のセクションで区切って出力してください。`;

    // Google AI Platform REST API を呼び出し
    const response = await fetch(
      `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(
        `Gemini APIエラー: ${errorData.error?.message || "Unknown error"}`
      );
    }

    const data = await response.json();

    // レスポンスからテキストを抽出
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("処理に失敗しました");
    }

    // テキストを文字起こしと議事録に分割
    const transcriptMatch = text.match(
      /===文字起こし===([\s\S]*?)(?:===議事録===|$)/
    );
    const summaryMatch = text.match(/===議事録===([\s\S]*?)$/);

    const transcript = transcriptMatch ? transcriptMatch[1].trim() : text;
    const summary = summaryMatch ? summaryMatch[1].trim() : "";

    return {
      transcript: transcript || text,
      summary: summary || text,
    };
  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error;
  }
}
