-- ================================================================
-- ROUTINE TRACKER V2 - Run this in Supabase SQL Editor
-- Run the original SUPABASE_MIGRATION.sql first, then this file
-- ================================================================

-- 1. Add macro columns to meals table
ALTER TABLE meals ADD COLUMN IF NOT EXISTS protein numeric(6,2);
ALTER TABLE meals ADD COLUMN IF NOT EXISTS carbs numeric(6,2);
ALTER TABLE meals ADD COLUMN IF NOT EXISTS fats numeric(6,2);
ALTER TABLE meals ADD COLUMN IF NOT EXISTS fiber numeric(6,2);
ALTER TABLE meals ADD COLUMN IF NOT EXISTS foods jsonb DEFAULT '[]'::jsonb;

-- 2. Add more meal types
-- meal_type column already exists as text, no change needed

-- 3. Gym sessions table
CREATE TABLE IF NOT EXISTS gym_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  split text NOT NULL,
  split_label text NOT NULL,
  exercises jsonb DEFAULT '[]'::jsonb,
  warmup_done boolean DEFAULT false,
  warmup_type text DEFAULT '1km Run',
  duration_minutes integer,
  total_volume numeric(10,2),
  notes text,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE gym_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own gym sessions" ON gym_sessions;
CREATE POLICY "Users can only access their own gym sessions"
  ON gym_sessions FOR ALL
  USING (auth.uid() = user_id);

-- 4. Habits table
CREATE TABLE IF NOT EXISTS habits (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '⭐',
  color text DEFAULT '#e8c547',
  frequency text DEFAULT 'daily',
  target_count integer DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own habits" ON habits;
CREATE POLICY "Users can only access their own habits"
  ON habits FOR ALL
  USING (auth.uid() = user_id);

-- 5. Habit logs table
CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid REFERENCES habits(id) ON DELETE CASCADE,
  date text NOT NULL,
  count integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, habit_id, date)
);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own habit logs" ON habit_logs;
CREATE POLICY "Users can only access their own habit logs"
  ON habit_logs FOR ALL
  USING (auth.uid() = user_id);

-- ================================================================
-- INDEXES for performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_gym_sessions_user_date ON gym_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

-- ================================================================
-- V2 PATCH: Body weight logs + routine_block column on todos
-- ================================================================

-- Body weight tracking table
CREATE TABLE IF NOT EXISTS body_weight_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  weight_kg numeric(5,2) NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE body_weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own body weight logs" ON body_weight_logs;
CREATE POLICY "Users can only access their own body weight logs"
  ON body_weight_logs FOR ALL
  USING (auth.uid() = user_id);

-- Add routine_block column to todos (links a todo to a routine block)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS routine_block text;

-- Index
CREATE INDEX IF NOT EXISTS idx_body_weight_user_date ON body_weight_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_todos_routine_block ON todos(user_id, routine_block, due_date);
