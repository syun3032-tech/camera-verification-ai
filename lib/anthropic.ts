import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function summarizeTranscript(transcript: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `あなたは議事録作成のプロフェッショナルです。以下の文字起こしテキストから、重要なポイントを抽出して、わかりやすい議事録を作成してください。

以下の形式で出力してください：

## 📋 議事録サマリー

### 👥 参加者
- [参加者がわかれば記載、不明な場合は「記録なし」]

### 📌 主な議題
- [議題1]
- [議題2]
...

### ✅ 決定事項
- [決定事項1]
- [決定事項2]
...

### 📝 アクションアイテム
- [担当者]: [タスク内容] [期限]
...

### 📅 次回の予定
- [次回の予定があれば記載、なければ「未定」]

### 💡 その他メモ
- [その他重要なポイント]

---

文字起こしテキスト:
${transcript}`,
      },
    ],
  });

  const textContent = message.content.find((block) => block.type === "text");
  return textContent && textContent.type === "text" ? textContent.text : "";
}





