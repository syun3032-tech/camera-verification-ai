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
