import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Supabaseが設定されているかチェック
const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl !== "your-supabase-url" &&
  supabaseAnonKey && 
  supabaseAnonKey !== "your-supabase-anon-key";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface MeetingMinutes {
  id: string;
  transcript: string;
  summary: string;
  created_at: string;
}

/**
 * 音声ファイルをSupabase Storageにアップロード
 * @param file アップロードするファイル
 * @returns アップロードされたファイルの公開URL
 */
export async function uploadAudioFile(file: File): Promise<string> {
  if (!supabase) {
    throw new Error("Supabaseが設定されていません");
  }

  // ファイル名をユニークにする（タイムスタンプ + ランダム文字列）
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}_${randomString}.${fileExt}`;

  // Supabase Storageにアップロード
  const { data, error } = await supabase.storage
    .from('audio-files')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`ファイルのアップロードに失敗しました: ${error.message}`);
  }

  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from('audio-files')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Supabase Storageから音声ファイルを削除
 * @param fileUrl ファイルの公開URL
 */
export async function deleteAudioFile(fileUrl: string): Promise<void> {
  if (!supabase) {
    throw new Error("Supabaseが設定されていません");
  }

  // URLからファイルパスを抽出
  const url = new URL(fileUrl);
  const pathParts = url.pathname.split('/');
  const fileName = pathParts[pathParts.length - 1];

  const { error } = await supabase.storage
    .from('audio-files')
    .remove([fileName]);

  if (error) {
    console.error('ファイルの削除に失敗しました:', error);
  }
}
