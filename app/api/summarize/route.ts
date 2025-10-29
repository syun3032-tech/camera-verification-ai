import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { 
  validateApiKey, 
  unauthorizedResponse, 
  addCorsHeaders,
  handleCorsPreFlight 
} from "@/lib/api-auth";

// ランタイム設定
export const runtime = 'nodejs';
export const maxDuration = 60;

// CORSプリフライトリクエスト対応
export async function OPTIONS() {
  return handleCorsPreFlight();
}

// Gemini APIで要約を生成
async function summarizeWithGemini(transcript: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません");
  }

  const prompt = `以下の文字起こしテキストから、議事録を作成してください。

文字起こしテキスト:
${transcript}

以下の形式で出力してください：

## 📋 議事録

### 💬 会話の流れ（時系列）

**話者A:**
- [話者Aの主な発言内容をまとめる]
- [重要なポイント]

**話者B:**
- [話者Bの主な発言内容をまとめる]
- [重要なポイント]

**話者A:**
- [話者Aの次の発言]

（会話の流れに沿って、誰が何を話したかを時系列で記録）

---

### ✅ 決定事項
- [決定されたこと]

### 📝 アクションアイテム
- **[話者名]**: [具体的なタスク内容]
- **[話者名]**: [具体的なタスク内容]

### 📅 次回の予定
- [次回の予定があれば記載、なければ「なし」]

---

### 📌 補足
- [その他重要なポイントや背景情報]`;

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
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("要約に失敗しました");
  }

  return text;
}

export async function POST(request: NextRequest) {
  try {
    // API認証チェック
    if (!validateApiKey(request)) {
      return addCorsHeaders(unauthorizedResponse());
    }

    const { transcript } = await request.json();

    if (!transcript) {
      const response = NextResponse.json(
        { 
          success: false,
          error: "文字起こしテキストが提供されていません" 
        },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Gemini APIで要約
    const summary = await summarizeWithGemini(transcript);

    // Supabaseが設定されている場合のみ保存
    let savedId = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("meeting_minutes")
          .insert([
            {
              transcript,
              summary,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Database error:", error);
        } else {
          savedId = data.id;
        }
      } catch (dbError) {
        console.error("Database save failed:", dbError);
        // データベースエラーでも要約結果は返す
      }
    }

    const response = NextResponse.json({ 
      success: true,
      summary, 
      id: savedId,
      saved: !!savedId 
    });
    return addCorsHeaders(response);
  } catch (error) {
    console.error("Summarization error:", error);
    const response = NextResponse.json(
      { 
        success: false,
        error: "要約に失敗しました" 
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}
