-- Run this in Supabase SQL Editor

-- 1. Add columns to todos (safe - skips if already exist)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS end_time text;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'custom';

-- 2. Create daily templates table
CREATE TABLE IF NOT EXISTS daily_templates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  start_time text,
  end_time text,
  category text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Row Level Security
ALTER TABLE daily_templates ENABLE ROW LEVEL SECURITY;

-- 4. Drop policy if exists, then recreate
DROP POLICY IF EXISTS "Users can only access their own templates" ON daily_templates;
CREATE POLICY "Users can only access their own templates"
  ON daily_templates FOR ALL
  USING (auth.uid() = user_id);

-- 5. Week-off days table
CREATE TABLE IF NOT EXISTS week_off_days (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE week_off_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own week off days" ON week_off_days;
CREATE POLICY "Users can only access their own week off days"
  ON week_off_days FOR ALL USING (auth.uid() = user_id);
