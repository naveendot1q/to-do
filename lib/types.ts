export type Priority = "high" | "medium" | "low";
export type TaskType = "custom" | "daily";
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
