import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/gemini";
import { 
  validateApiKey, 
  unauthorizedResponse, 
  addCorsHeaders,
  handleCorsPreFlight 
} from "@/lib/api-auth";

// ボディサイズ制限を設定（50MB）
export const runtime = 'nodejs';
export const maxDuration = 60;

// CORSプリフライトリクエスト対応
export async function OPTIONS() {
  return handleCorsPreFlight();
}

export async function POST(request: NextRequest) {
  try {
    // API認証チェック
    if (!validateApiKey(request)) {
      return addCorsHeaders(unauthorizedResponse());
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      const response = NextResponse.json(
        { error: "ファイルが提供されていません" },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    console.log("Processing file:", file.name, file.type, file.size);

    // Gemini APIで文字起こし
    const transcript = await transcribeAudio(file);

    const response = NextResponse.json({ 
      success: true,
      transcript 
    });
    return addCorsHeaders(response);
  } catch (error) {
    console.error("Transcription error:", error);
    const response = NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "文字起こしに失敗しました" 
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}
