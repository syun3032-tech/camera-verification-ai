// Google AI Platform API を使用

// 画像OCR処理（輸出抹消書類用）
export async function processImageOCR(imageFile: File): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません");
  }

  try {
    // ファイルをBase64に変換
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // MIMEタイプを取得
    const mimeType = imageFile.type || "image/jpeg";

    const prompt = `この輸出抹消登録証明書の画像から、車台番号を含む情報を抽出してください。

【最重要】車台番号
画像の右上にある「車台番号」欄の番号を正確に読み取ってください。
例: AAZH20-1002549

【抽出項目】
1. **車台番号** （最優先・必須）
2. 登録番号
3. 車名
4. 型式
5. 原動機の型式
6. 初度登録年月
7. 所有者名
8. 所有者住所
9. 使用者名
10. 使用者住所
11. 交付年月日

【出力形式】
必ず以下の形式で出力してください：

車台番号: AAZH20-1002549
登録番号: 品川 500 あ 12-34
車名: トヨタ
型式: ○○○-ABC123
原動機の型式: 2ZR-FE
初度登録年月: 2020年1月
所有者名: 株式会社○○
所有者住所: 東京都○○区○○1-2-3
使用者名: 株式会社○○
使用者住所: 東京都○○区○○1-2-3
交付年月日: 2024年10月1日

【注意事項】
- 車台番号は絶対に正確に読み取ってください
- 車台番号が見つからない場合は「車台番号: 不明」と記載
- 読み取れない項目は "不明" と記載してください
- ハイフンや空白も正確に読み取ってください`;

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
                    data: base64Image,
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
      throw new Error("OCR処理に失敗しました");
    }

    return text;
  } catch (error) {
    console.error("Gemini OCR error:", error);
    throw error;
  }
}

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
