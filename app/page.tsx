"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Todo, DailyTemplate, WeekOffTemplate, Note, FilterType, SortType, Priority, AppMood } from "@/lib/types";
import AddTodo from "@/components/AddTodo";
import TodoItem from "@/components/TodoItem";
import DateBrowser from "@/components/DateBrowser";
import DailyTemplates from "@/components/DailyTemplates";
import WeekOffTemplates from "@/components/WeekOffTemplates";
import ReorderableTodoList from "@/components/ReorderableTodoList";
import ConsistencyCalendar from "@/components/ConsistencyCalendar";
import Notes from "@/components/Notes";
import { LogOut, Search, SlidersHorizontal, CheckCircle2, Clock, AlertTriangle, LayoutList, CalendarDays, RefreshCw, StickyNote } from "lucide-react";
const NotificationManager = dynamic(() => import("@/components/NotificationManager"), { ssr: false });
const InstallBanner = dynamic(() => import("@/components/InstallBanner"), { ssr: false });

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function computeMood(todos: Todo[], selectedDate: string | null): AppMood {
  const todayStr = toLocalDateStr(new Date());
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const relevant = selectedDate ? todos.filter(t => t.due_date === selectedDate) : todos.filter(t => t.due_date === todayStr);
  if (relevant.length === 0) return "calm";
  if (relevant.every(t => t.completed)) return "success";
  const hasTimeOverdue = relevant.some(t => {
    if (t.completed || !t.end_time || t.due_date !== todayStr) return false;
    const [eh, em] = t.end_time.split(":").map(Number);
    return nowMins > eh * 60 + em;
  });
  if (hasTimeOverdue) return "critical";
  if (todos.some(t => !t.completed && t.due_date && t.due_date < todayStr)) return "critical";
  const hasActive = relevant.some(t => {
    if (t.completed || !t.start_time || !t.end_time || t.due_date !== todayStr) return false;
    const [sh, sm] = t.start_time.split(":").map(Number);
    const [eh, em] = t.end_time.split(":").map(Number);
    return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
  });
  return hasActive ? "warning" : "calm";
}

const MOOD_STYLES: Record<AppMood, { bg: string; grid: string }> = {
  calm:     { bg: "radial-gradient(ellipse at 20% 50%, rgba(100,80,200,0.09) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(232,197,71,0.05) 0%, transparent 60%)", grid: "rgba(232,197,71,0.025)" },
  success:  { bg: "radial-gradient(ellipse at 30% 40%, rgba(46,213,115,0.11) 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, rgba(46,213,115,0.06) 0%, transparent 50%)", grid: "rgba(46,213,115,0.03)" },
  warning:  { bg: "radial-gradient(ellipse at 15% 60%, rgba(255,165,2,0.11) 0%, transparent 55%), radial-gradient(ellipse at 85% 30%, rgba(232,197,71,0.08) 0%, transparent 55%)", grid: "rgba(255,165,2,0.03)" },
  critical: { bg: "radial-gradient(ellipse at 50% 30%, rgba(255,71,87,0.13) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(255,71,87,0.07) 0%, transparent 50%)", grid: "rgba(255,71,87,0.03)" },
};

type Tab = "tasks" | "notes" | "calendar" | "daily";

export default function Dashboard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [templates, setTemplates] = useState<DailyTemplate[]>([]);
  const [weekOffTemplates, setWeekOffTemplates] = useState<WeekOffTemplate[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyingWeekOff, setApplyingWeekOff] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("priority");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => toLocalDateStr(new Date()));
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [weekOffDays, setWeekOffDays] = useState<string[]>([]);
  const [dailyOrder, setDailyOrder] = useState<string[]>([]);
  const [mood, setMood] = useState<AppMood>("calm");
  const [moodStyle, setMoodStyle] = useState(MOOD_STYLES.calm);
  const moodRef = useRef<AppMood>("calm");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") { router.replace("/verify-totp"); return; }
      if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal1") { router.replace("/setup-totp"); return; }
      setUser({ id: session.user.id, email: session.user.email });
      await Promise.all([
        fetchTodos(session.user.id), fetchTemplates(session.user.id),
        fetchWeekOffTemplates(session.user.id), fetchWeekOff(session.user.id),
        fetchNotes(session.user.id),
      ]);
    })();
    function onKey(e: KeyboardEvent) {
      if (e.key === "n" && !["INPUT","TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault(); document.getElementById("add-todo-trigger")?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const update = () => {
      const m = computeMood(todos, selectedDate);
      if (m !== moodRef.current) { moodRef.current = m; setMood(m); setMoodStyle(MOOD_STYLES[m]); }
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [todos, selectedDate]);

  async function fetchTodos(uid: string) {
    const { data } = await supabase.from("todos").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setTodos(data || []); setLoading(false);
  }
  async function fetchTemplates(uid: string) {
    const { data } = await supabase.from("daily_templates").select("*").eq("user_id", uid).order("created_at");
    setTemplates(data || []);
  }
  async function fetchWeekOffTemplates(uid: string) {
    const { data } = await supabase.from("week_off_templates").select("*").eq("user_id", uid).order("created_at");
    setWeekOffTemplates(data || []);
  }
  async function fetchWeekOff(uid: string) {
    const { data } = await supabase.from("week_off_days").select("date").eq("user_id", uid);
    setWeekOffDays((data || []).map((r: any) => r.date));
  }
  async function fetchNotes(uid: string) {
    const { data } = await supabase.from("notes").select("*").eq("user_id", uid).order("updated_at", { ascending: false });
    setNotes(data || []);
  }

  async function toggleWeekOff(date: string) {
    if (!user) return;
    if (weekOffDays.includes(date)) {
      await supabase.from("week_off_days").delete().eq("user_id", user.id).eq("date", date);
      setWeekOffDays(p => p.filter(d => d !== date));
    } else {
      await supabase.from("week_off_days").insert({ user_id: user.id, date });
      setWeekOffDays(p => [...p, date]);
    }
  }

  async function addTodo(todo: { title: string; description?: string; priority: Priority; due_date?: string; start_time?: string; end_time?: string; category?: string }) {
    if (!user) return;
    const { data } = await supabase.from("todos").insert({ ...todo, due_date: todo.due_date || selectedDate || undefined, user_id: user.id, completed: false, task_type: "custom" }).select().single();
    if (data) setTodos(p => [data, ...p]);
  }
  async function toggleTodo(id: string, completed: boolean) {
    await supabase.from("todos").update({ completed: !completed }).eq("id", id);
    setTodos(p => p.map(t => t.id === id ? { ...t, completed: !completed } : t));
  }
  async function deleteTodo(id: string) {
    await supabase.from("todos").delete().eq("id", id);
    setTimeout(() => setTodos(p => p.filter(t => t.id !== id)), 300);
  }
  async function updateTodo(id: string, updates: Partial<Todo>) {
    await supabase.from("todos").update(updates).eq("id", id);
    setTodos(p => p.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  async function addTemplate(t: Omit<DailyTemplate, "id"|"user_id"|"created_at">) {
    if (!user) return;
    const { data } = await supabase.from("daily_templates").insert({ ...t, user_id: user.id }).select().single();
    if (data) setTemplates(p => [...p, data]);
  }
  async function updateTemplate(id: string, updates: Partial<DailyTemplate>) {
    await supabase.from("daily_templates").update(updates).eq("id", id);
    setTemplates(p => p.map(t => t.id === id ? { ...t, ...updates } : t));
  }
  async function deleteTemplate(id: string) {
    await supabase.from("daily_templates").delete().eq("id", id);
    setTemplates(p => p.filter(t => t.id !== id));
  }

  async function addWeekOffTemplate(t: Omit<WeekOffTemplate, "id"|"user_id"|"created_at">) {
    if (!user) return;
    const { data } = await supabase.from("week_off_templates").insert({ ...t, user_id: user.id }).select().single();
    if (data) setWeekOffTemplates(p => [...p, data]);
  }
  async function updateWeekOffTemplate(id: string, updates: Partial<WeekOffTemplate>) {
    await supabase.from("week_off_templates").update(updates).eq("id", id);
    setWeekOffTemplates(p => p.map(t => t.id === id ? { ...t, ...updates } : t));
  }
  async function deleteWeekOffTemplate(id: string) {
    await supabase.from("week_off_templates").delete().eq("id", id);
    setWeekOffTemplates(p => p.filter(t => t.id !== id));
  }

  async function addNote(note: { title: string; content: string; color: string; pinned: boolean }) {
    if (!user) return;
    const { data } = await supabase.from("notes").insert({ ...note, user_id: user.id }).select().single();
    if (data) setNotes(p => [data, ...p]);
  }
  async function updateNote(id: string, updates: Partial<Note>) {
    const updated = { ...updates, updated_at: new Date().toISOString() };
    await supabase.from("notes").update(updated).eq("id", id);
    setNotes(p => p.map(n => n.id === id ? { ...n, ...updated } : n));
  }
  async function deleteNote(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    setNotes(p => p.filter(n => n.id !== id));
  }

  function toLocalStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  async function applyTemplatesToNext() {
    if (!user || !selectedDate) return;
    setApplying(true);
    const next = new Date(selectedDate + "T00:00:00"); next.setDate(next.getDate()+1);
    const nextDay = toLocalStr(next);
    const active = templates.filter(t => t.active);
    const existing = todos.filter(t => t.due_date === nextDay && t.task_type === "daily").map(t => t.title.toLowerCase());
    const toInsert = active.filter(t => !existing.includes(t.title.toLowerCase())).map(t => ({ title: t.title, description: t.description, priority: t.priority, start_time: t.start_time, end_time: t.end_time, category: t.category, due_date: nextDay, user_id: user.id, completed: false, task_type: "daily" }));
    if (toInsert.length > 0) { const { data } = await supabase.from("todos").insert(toInsert).select(); if (data) setTodos(p => [...data, ...p]); }
    setSelectedDate(nextDay); setActiveTab("tasks"); setApplying(false);
  }

  async function applyWeekOffTemplatesToNext(): Promise<{ applied: boolean; date?: string; message: string }> {
    if (!user) return { applied: false, message: "Not logged in" };
    setApplyingWeekOff(true);
    const today = new Date(); today.setHours(0,0,0,0);
    const future = weekOffDays.filter(d => new Date(d+"T00:00:00") >= today).sort();
    if (future.length === 0) { setApplyingWeekOff(false); return { applied: false, message: "No upcoming week-off set. Go to Calendar → tap Week-off to mark a day." }; }
    const targetDate = future[0];
    const active = weekOffTemplates.filter(t => t.active);
    const existing = todos.filter(t => t.due_date === targetDate && t.task_type === "daily").map(t => t.title.toLowerCase());
    const toInsert = active.filter(t => !existing.includes(t.title.toLowerCase())).map(t => ({ title: t.title, description: t.description, priority: t.priority, start_time: t.start_time, end_time: t.end_time, category: t.category, due_date: targetDate, user_id: user.id, completed: false, task_type: "daily" }));
    if (toInsert.length > 0) { const { data } = await supabase.from("todos").insert(toInsert).select(); if (data) setTodos(p => [...data, ...p]); }
    setSelectedDate(targetDate); setActiveTab("tasks"); setApplyingWeekOff(false);
    const label = new Date(targetDate+"T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" });
    return { applied: true, date: targetDate, message: `Added ${toInsert.length} tasks to ${label} ✓` };
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  const todayStr = toLocalDateStr(new Date());

  // Task counts per date — week-off green if ALL (incl. completed) tasks done
  const taskCountsByDate: Record<string, { total: number; completed: number }> = {};
  todos.forEach(t => {
    if (!t.due_date) return;
    if (!taskCountsByDate[t.due_date]) taskCountsByDate[t.due_date] = { total: 0, completed: 0 };
    taskCountsByDate[t.due_date].total++;
    if (t.completed) taskCountsByDate[t.due_date].completed++;
  });

  // Week-off days that are fully complete should show green in calendar
  const weekOffDaysDisplay = weekOffDays.map(d => {
    const c = taskCountsByDate[d];
    if (c && c.total > 0 && c.completed === c.total) return { date: d, allDone: true };
    return { date: d, allDone: false };
  });

  const filtered = todos.filter(t => {
    if (selectedDate && t.due_date !== selectedDate) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    if (filter === "overdue") return !t.completed && t.due_date && t.due_date < todayStr;
    return true;
  }).sort((a, b) => {
    // Completed always go to bottom
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    if (sort === "priority") { const o = { high:0, medium:1, low:2 }; return o[a.priority] - o[b.priority]; }
    if (sort === "start_time") { if (!a.start_time) return 1; if (!b.start_time) return -1; return a.start_time.localeCompare(b.start_time); }
    if (sort === "due_date") { if (!a.due_date) return 1; if (!b.due_date) return -1; return new Date(a.due_date).getTime() - new Date(b.due_date).getTime(); }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const dailyTodosRaw = filtered.filter(t => t.task_type === "daily").sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    if (!a.start_time && !b.start_time) return 0;
    if (!a.start_time) return 1; if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });
  const dailyTodos = dailyOrder.length > 0
    ? [...dailyTodosRaw].sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        const ai = dailyOrder.indexOf(a.id); const bi = dailyOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1; if (bi === -1) return -1;
        return ai - bi;
      })
    : dailyTodosRaw;
  const customTodos = filtered.filter(t => t.task_type !== "daily");

  const viewDate = selectedDate || todayStr;
  const viewTasks = todos.filter(t => t.due_date === viewDate);
  const total = viewTasks.length;
  const completed = viewTasks.filter(t => t.completed).length;
  const pending = viewTasks.filter(t => !t.completed).length;
  const overdue = todos.filter(t => !t.completed && t.due_date && t.due_date < todayStr).length;
  const isViewingToday = selectedDate === todayStr || !selectedDate;
  const progress = total > 0 ? Math.round(completed / total * 100) : 0;

  const moodBanner = { calm: null, success: { text: "✨ All tasks complete!", color: "var(--success)", bg: "rgba(46,213,115,0.08)", border: "rgba(46,213,115,0.2)" }, warning: { text: "⏳ Tasks in progress — stay focused", color: "var(--warning)", bg: "rgba(255,165,2,0.08)", border: "rgba(255,165,2,0.2)" }, critical: { text: "🚨 Overdue tasks need attention!", color: "var(--danger)", bg: "rgba(255,71,87,0.08)", border: "rgba(255,71,87,0.2)" } }[mood];
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "tasks",    label: "Tasks",    icon: <LayoutList size={14} />,   badge: pending > 0 ? pending : undefined },
    { key: "notes",    label: "Notes",    icon: <StickyNote size={14} />,   badge: notes.filter(n => n.pinned).length || undefined },
    { key: "calendar", label: "Calendar", icon: <CalendarDays size={14} /> },
    { key: "daily",    label: "Daily",    icon: <RefreshCw size={14} />,    badge: (templates.filter(t=>t.active).length + weekOffTemplates.filter(t=>t.active).length) || undefined },
  ];

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundColor: "#0a0a0f" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: moodStyle.bg, transition: "background 1.2s ease", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 2, backgroundImage: `linear-gradient(${moodStyle.grid} 1px,transparent 1px),linear-gradient(90deg,${moodStyle.grid} 1px,transparent 1px)`, backgroundSize: "80px 80px", pointerEvents: "none" }} />
      {mood === "critical" && <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 3, background: "linear-gradient(90deg,transparent,rgba(255,71,87,0.9),transparent)", animation: "shimmer 2s infinite", pointerEvents: "none" }} />}

      <div style={{ position: "relative", zIndex: 10, minHeight: "100vh" }}>
        <div className="max-w-2xl mx-auto px-4">

          {/* ── STICKY TOP BLOCK: header + mood + tabs ── */}
          <div className="sticky top-0 pt-4 pb-2" style={{ zIndex: 50, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", background: "rgba(10,10,15,0.85)" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}
                </p>
                <h1 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display',serif", color: "#fff" }}>{greeting()}</h1>
              </div>
              <button onClick={handleLogout} className="btn-ghost flex items-center gap-1.5 text-xs"><LogOut size={13} /> Sign out</button>
            </div>

            {/* Mood Banner */}
            {moodBanner && (
              <div className="rounded-lg px-3 py-1.5 mb-2 text-xs font-medium animate-fade-in"
                style={{ background: moodBanner.bg, border: `1px solid ${moodBanner.border}`, color: moodBanner.color }}>
                {moodBanner.text}
              </div>
            )}

            {/* Tab Bar */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(26,26,36,0.95)", border: "1px solid var(--border)" }}>
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all relative"
                  style={{ background: activeTab === tab.key ? "var(--accent)" : "transparent", color: activeTab === tab.key ? "var(--obsidian)" : "var(--muted)" }}>
                  {tab.icon}{tab.label}
                  {tab.badge !== undefined && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={{ background: activeTab === tab.key ? "rgba(10,10,15,0.4)" : "var(--accent)", color: "var(--obsidian)", fontSize: "9px", fontWeight: 700 }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── TASKS TAB ── */}
          {activeTab === "tasks" && (
            <div className="pt-3 pb-20 animate-fade-in">
              {/* Add Todo first — most important action */}
              <div className="mb-3"><AddTodo onAdd={addTodo} selectedDate={selectedDate} /></div>

              {/* Search + Filters */}
              <div className="mb-3 space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                      className="input-field text-sm" style={{ paddingLeft: "2.25rem", paddingTop: "0.5rem", paddingBottom: "0.5rem" }} placeholder="Search tasks..." />
                  </div>
                  <button onClick={() => setShowFilters(o => !o)} className="btn-ghost flex items-center gap-1.5 text-sm"
                    style={{ borderColor: showFilters ? "var(--accent)" : undefined, color: showFilters ? "var(--accent)" : undefined }}>
                    <SlidersHorizontal size={13} /> Filter
                  </button>
                </div>
                {showFilters && (
                  <div className="flex gap-2 flex-wrap animate-slide-down">
                    <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--card)" }}>
                      {(["all","active","completed","overdue"] as FilterType[]).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className="text-xs px-2.5 py-1.5 rounded-md transition-all capitalize"
                          style={{ background: filter===f ? "var(--accent)" : "transparent", color: filter===f ? "var(--obsidian)" : "var(--muted)", fontWeight: filter===f ? 600 : 400 }}>
                          {f}
                        </button>
                      ))}
                    </div>
                    <select value={sort} onChange={e => setSort(e.target.value as SortType)} className="input-field text-xs" style={{ padding: "0.35rem 0.6rem", width: "auto" }}>
                      <option value="priority">Priority</option>
                      <option value="start_time">Time</option>
                      <option value="due_date">Due Date</option>
                      <option value="created_at">Newest</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Task list */}
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer rounded-xl h-16 mb-2" />)
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 rounded-xl" style={{ background: "rgba(26,26,36,0.8)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "2rem" }}>📝</p>
                  <p className="mt-2 font-medium" style={{ color: "var(--soft)" }}>{search ? "No tasks match" : "No tasks for this day"}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{!search && "Add one above or go to Daily tab"}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dailyTodos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                        <span className="text-xs px-2" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                          🔁 DAILY · {dailyTodos.filter(t=>t.completed).length}/{dailyTodos.length}
                        </span>
                        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                      </div>
                      <ReorderableTodoList todos={dailyTodos} onToggle={toggleTodo} onDelete={deleteTodo} onUpdate={updateTodo} onReorder={r => setDailyOrder(r.map(t=>t.id))} />
                    </div>
                  )}
                  {customTodos.length > 0 && (
                    <div>
                      {dailyTodos.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                          <span className="text-xs px-2" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                            ✦ CUSTOM · {customTodos.filter(t=>t.completed).length}/{customTodos.length}
                          </span>
                          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                        </div>
                      )}
                      <div className="space-y-2">{customTodos.map(t => <TodoItem key={t.id} todo={t} onToggle={toggleTodo} onDelete={deleteTodo} onUpdate={updateTodo} />)}</div>
                    </div>
                  )}
                </div>
              )}
              {filtered.length > 0 && <p className="text-center text-xs mt-4" style={{ color: "var(--border)" }}>{filtered.length} tasks · Press N to add</p>}
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {activeTab === "notes" && (
            <div className="pt-3">
              <Notes notes={notes} onAdd={addNote} onUpdate={updateNote} onDelete={deleteNote} />
            </div>
          )}

          {/* ── CALENDAR TAB ── */}
          {activeTab === "calendar" && (
            <div className="pt-3 pb-20 animate-fade-in">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { icon: LayoutList, label: "Total", value: total, color: "var(--soft)" },
                  { icon: CheckCircle2, label: "Done", value: completed, color: "var(--success)" },
                  { icon: Clock, label: "Pending", value: pending, color: "var(--accent)" },
                  { icon: AlertTriangle, label: "Overdue", value: overdue, color: "var(--danger)" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: "rgba(26,26,36,0.85)", border: "1px solid var(--border)" }}>
                    <Icon size={14} className="mx-auto mb-1" style={{ color }} />
                    <p className="text-lg font-bold" style={{ color }}>{value}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
                  <span>{isViewingToday ? `Today · ${completed}/${total}` : `${viewDate} · ${completed}/${total}`}</span>
                  <span style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>{progress}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>

              {/* Date Browser */}
              <DateBrowser selectedDate={selectedDate} onDateSelect={setSelectedDate} taskCountsByDate={taskCountsByDate} weekOffDays={weekOffDays} onToggleWeekOff={toggleWeekOff} weekOffDaysDisplay={weekOffDaysDisplay} />

              {/* Consistency Calendar */}
              <ConsistencyCalendar todos={todos} weekOffDays={weekOffDays} />

              {/* Mini preview */}
              {filtered.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>{filtered.length} task{filtered.length!==1?"s":""} on this day</p>
                  {filtered.slice(0,3).map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg mb-2" style={{ background: "rgba(26,26,36,0.7)", border: "1px solid var(--border)" }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.completed ? "var(--success)" : t.priority==="high" ? "var(--danger)" : t.priority==="medium" ? "var(--warning)" : "var(--success)" }} />
                      <span className="text-sm flex-1" style={{ color: t.completed ? "var(--muted)" : "var(--soft)", textDecoration: t.completed ? "line-through" : "none" }}>{t.title}</span>
                      {t.start_time && <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{t.start_time}</span>}
                    </div>
                  ))}
                  {filtered.length > 3 && (
                    <button onClick={() => setActiveTab("tasks")} className="w-full text-xs py-2 rounded-lg" style={{ color: "var(--accent)", border: "1px dashed rgba(232,197,71,0.2)" }}>
                      +{filtered.length-3} more — view in Tasks
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── DAILY TAB ── */}
          {activeTab === "daily" && (
            <div className="pt-3 pb-20 animate-fade-in">
              <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                <strong style={{ color: "var(--accent)" }}>Daily tasks</strong> add to next day. <strong style={{ color: "#a78bfa" }}>Week-off tasks</strong> add to your next marked week-off day.
              </p>
              <DailyTemplates templates={templates} onAdd={addTemplate} onUpdate={updateTemplate} onDelete={deleteTemplate} onApplyToNext={applyTemplatesToNext} applying={applying} />
              <WeekOffTemplates templates={weekOffTemplates} weekOffDays={weekOffDays} onAdd={addWeekOffTemplate} onUpdate={updateWeekOffTemplate} onDelete={deleteWeekOffTemplate} onApplyToNextWeekOff={applyWeekOffTemplatesToNext} applying={applyingWeekOff} />
            </div>
          )}

        </div>
      </div>

      <NotificationManager todos={todos} selectedDate={selectedDate} />
      <InstallBanner />
    </>
  );
}
