import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio, processImageOCR } from "@/lib/gemini";
import {
  validateApiKey,
  unauthorizedResponse,
  addCorsHeaders,
  handleCorsPreFlight
} from "@/lib/api-auth";

// Edge Runtimeではなく、Node.js Runtimeを使用して大きなファイルを処理
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

    const contentType = request.headers.get('content-type') || '';
    let file: File;
    let audioUrl: string | null = null;

    // JSON形式（URLを含む）またはFormData形式に対応
    if (contentType.includes('application/json')) {
      // JSON形式：音声ファイルのURLを受け取る
      const body = await request.json();
      audioUrl = body.audioUrl;

      if (!audioUrl) {
        const response = NextResponse.json(
          { error: "audioUrlが提供されていません" },
          { status: 400 }
        );
        return addCorsHeaders(response);
      }

      console.log("Fetching audio from URL:", audioUrl);

      // URLから音声ファイルをダウンロード
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`音声ファイルの取得に失敗しました: ${audioResponse.statusText}`);
      }

      const audioBlob = await audioResponse.blob();
      const fileName = audioUrl.split('/').pop() || 'audio.webm';
      file = new File([audioBlob], fileName, { type: audioBlob.type });

    } else {
      // FormData形式：直接ファイルを受け取る（従来の方式）
      // ContentLengthをチェック（Vercelの制限を超えている場合は事前にエラー）
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 4.5 * 1024 * 1024) {
        const response = NextResponse.json(
          {
            error: "ファイルサイズが大きすぎます。Supabase Storageを使用してください。",
            details: "直接アップロードは4.5MBまでです。大きなファイルはSupabase Storageにアップロードしてから、そのURLを送信してください。"
          },
          { status: 413 }
        );
        return addCorsHeaders(response);
      }

      const formData = await request.formData();
      file = formData.get("file") as File;

      if (!file) {
        const response = NextResponse.json(
          { error: "ファイルが提供されていません" },
          { status: 400 }
        );
        return addCorsHeaders(response);
      }
    }

    console.log("Processing file:", file.name, file.type, file.size);

    // ファイルタイプに応じて処理を分岐
    let transcript: string;
    
    if (file.type.startsWith("image/")) {
      // 画像ファイル: OCR処理
      console.log("Processing as image (OCR)");
      transcript = await processImageOCR(file);
    } else {
      // 音声/動画ファイル: 文字起こし
      console.log("Processing as audio/video (transcription)");
      transcript = await transcribeAudio(file);
    }

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
