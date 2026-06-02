export type Priority = "high" | "medium" | "low";
export type TaskType = "custom" | "daily" | "routine";
export type AppMood = "calm" | "warning" | "critical" | "success";

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  category?: string;
  task_type: TaskType;
  routine_block?: string;  // which routine block this belongs to
  created_at: string;
}

export interface DailyTemplate {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: Priority;
  start_time?: string;
  end_time?: string;
  category?: string;
  active: boolean;
  created_at: string;
}

export type FilterType = "all" | "active" | "completed" | "overdue";
export type SortType = "priority" | "start_time" | "due_date" | "created_at";

export interface WeekOffDay {
  id: string;
  user_id: string;
  date: string;
  created_at: string;
}

export interface WeekOffTemplate {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: Priority;
  start_time?: string;
  end_time?: string;
  category?: string;
  active: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export type MealType = 'pre_breakfast' | 'breakfast' | 'lunch' | 'evening_snack' | 'dinner' | 'snack';

export interface MealFood {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
}

export interface Meal {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  name: string;
  description?: string;
  time?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  foods?: MealFood[];
  completed: boolean;
  created_at: string;
}

// ─── GYM TYPES ────────────────────────────────────────────────────────────────

export type WorkoutSplit = 'chest_triceps_abs' | 'back_biceps_abs' | 'legs_shoulders_cardio' | 'custom';
export type ExerciseCategory = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'abs' | 'forearms' | 'cardio' | 'compound';
export type SetType = 'reps' | 'duration';

export interface ExerciseSet {
  set_number: number;
  weight: number;           // kg (0 for bodyweight/timed)
  reps: number;             // 0 when using duration
  duration_seconds?: number; // for plank, cardio etc.
  set_type?: SetType;        // 'reps' (default) or 'duration'
  rpe?: number;             // Rate of Perceived Exertion 1-10
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  sets: ExerciseSet[];
  notes?: string;
  order: number;
  is_timed?: boolean; // plank, cardio — uses duration_seconds instead of reps
}

export interface GymSession {
  id: string;
  user_id: string;
  date: string;
  split: WorkoutSplit;
  split_label: string;
  exercises: Exercise[];
  warmup_done: boolean;
  warmup_type?: string;
  duration_minutes?: number;
  total_volume?: number;
  notes?: string;
  completed: boolean;
  created_at: string;
}

export interface BodyWeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  notes?: string;
  created_at: string;
}

// ─── HABIT TYPES ──────────────────────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  target_count: number;
  created_at: string;
  active: boolean;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  count: number;
  completed: boolean;
  created_at: string;
}
