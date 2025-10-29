-- 議事録テーブルの作成
CREATE TABLE meeting_minutes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transcript TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- インデックスの作成
CREATE INDEX idx_meeting_minutes_created_at ON meeting_minutes(created_at DESC);

-- RLS（Row Level Security）の有効化
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;

-- 全ユーザーに読み取りアクセスを許可
CREATE POLICY "Enable read access for all users" ON meeting_minutes
  FOR SELECT USING (true);

-- 全ユーザーに挿入アクセスを許可
CREATE POLICY "Enable insert access for all users" ON meeting_minutes
  FOR INSERT WITH CHECK (true);

-- 将来的に認証を追加する場合は、以下のようなポリシーに変更できます：
-- CREATE POLICY "Users can view their own meeting minutes" ON meeting_minutes
--   FOR SELECT USING (auth.uid() = user_id);






