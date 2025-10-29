import { NextRequest, NextResponse } from "next/server";

/**
 * API認証ミドルウェア
 * リクエストヘッダーの Authorization: Bearer <API_KEY> を検証
 */
export function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace("Bearer ", "");
  
  // 環境変数からAPIキーを取得
  const validApiKeys = process.env.API_KEYS?.split(",") || [];
  
  // APIキーが設定されていない場合は認証をスキップ（開発用）
  if (validApiKeys.length === 0) {
    console.warn("⚠️ API_KEYS が設定されていません。認証なしでアクセス可能です。");
    return true;
  }
  
  return validApiKeys.includes(token);
}

/**
 * 認証エラーレスポンス
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { 
      error: "Unauthorized",
      message: "有効なAPIキーが必要です。Authorizationヘッダーに 'Bearer <API_KEY>' を含めてください。"
    },
    { 
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="API"',
      }
    }
  );
}

/**
 * CORSヘッダーを追加
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
  
  return response;
}

/**
 * OPTIONSリクエスト（プリフライト）のハンドリング
 */
export function handleCorsPreFlight(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response);
}

