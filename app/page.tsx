"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Todo, DailyTemplate, FilterType, SortType, Priority, AppMood } from "@/lib/types";
import AddTodo from "@/components/AddTodo";
import TodoItem from "@/components/TodoItem";
import DateBrowser from "@/components/DateBrowser";
import DailyTemplates from "@/components/DailyTemplates";
import InstallBanner from "@/components/InstallBanner";
import { LogOut, Search, SlidersHorizontal, CheckCircle2, Clock, AlertTriangle, LayoutList } from "lucide-react";

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function computeMood(todos: Todo[], selectedDate: string | null): AppMood {
  const todayStr = toLocalDateStr(new Date());
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const relevant = (selectedDate ? todos.filter(t => t.due_date === selectedDate) : todos.filter(t => t.due_date === todayStr));
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

// Mood → CSS gradient vars
const MOOD_STYLES: Record<AppMood, { bg: string; grid: string; pulse: boolean }> = {
  calm:     { bg: "radial-gradient(ellipse at 20% 50%, rgba(100,80,200,0.09) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(232,197,71,0.05) 0%, transparent 60%)", grid: "rgba(232,197,71,0.025)", pulse: false },
  success:  { bg: "radial-gradient(ellipse at 30% 40%, rgba(46,213,115,0.11) 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, rgba(46,213,115,0.06) 0%, transparent 50%)", grid: "rgba(46,213,115,0.03)", pulse: false },
  warning:  { bg: "radial-gradient(ellipse at 15% 60%, rgba(255,165,2,0.11) 0%, transparent 55%), radial-gradient(ellipse at 85% 30%, rgba(232,197,71,0.08) 0%, transparent 55%)", grid: "rgba(255,165,2,0.03)", pulse: false },
  critical: { bg: "radial-gradient(ellipse at 50% 30%, rgba(255,71,87,0.13) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(255,71,87,0.07) 0%, transparent 50%)", grid: "rgba(255,71,87,0.03)", pulse: true },
};

export default function Dashboard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [templates, setTemplates] = useState<DailyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("priority");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => toLocalDateStr(new Date()));
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
      await Promise.all([fetchTodos(session.user.id), fetchTemplates(session.user.id)]);
    })();
    function onKey(e: KeyboardEvent) {
      if (e.key === "n" && !["INPUT","TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        document.getElementById("add-todo-trigger")?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Update mood every 30s
  useEffect(() => {
    const newMood = computeMood(todos, selectedDate);
    if (newMood !== moodRef.current) {
      moodRef.current = newMood;
      setMood(newMood);
      setMoodStyle(MOOD_STYLES[newMood]);
    }
    const iv = setInterval(() => {
      const m = computeMood(todos, selectedDate);
      if (m !== moodRef.current) { moodRef.current = m; setMood(m); setMoodStyle(MOOD_STYLES[m]); }
    }, 30000);
    return () => clearInterval(iv);
  }, [todos, selectedDate]);

  async function fetchTodos(uid: string) {
    const { data } = await supabase.from("todos").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setTodos(data || []);
    setLoading(false);
  }

  async function fetchTemplates(uid: string) {
    const { data } = await supabase.from("daily_templates").select("*").eq("user_id", uid).order("created_at");
    setTemplates(data || []);
  }

  async function addTodo(todo: { title: string; description?: string; priority: Priority; due_date?: string; start_time?: string; end_time?: string; category?: string }) {
    if (!user) return;
    const due_date = todo.due_date || selectedDate || undefined;
    const { data } = await supabase.from("todos").insert({ ...todo, due_date, user_id: user.id, completed: false, task_type: "custom" }).select().single();
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

  // Daily template CRUD
  async function addTemplate(t: Omit<DailyTemplate, "id" | "user_id" | "created_at">) {
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

  async function applyTemplatesToToday() {
    if (!user || !selectedDate) return;
    setApplying(true);
    const activeTemplates = templates.filter(t => t.active);
    const existing = todos.filter(t => t.due_date === selectedDate && t.task_type === "daily").map(t => t.title.toLowerCase());
    const toInsert = activeTemplates
      .filter(t => !existing.includes(t.title.toLowerCase()))
      .map(t => ({ title: t.title, description: t.description, priority: t.priority, start_time: t.start_time, end_time: t.end_time, category: t.category, due_date: selectedDate, user_id: user.id, completed: false, task_type: "daily" }));
    if (toInsert.length > 0) {
      const { data } = await supabase.from("todos").insert(toInsert).select();
      if (data) setTodos(p => [...data, ...p]);
    }
    setApplying(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const todayStr = toLocalDateStr(new Date());
  const taskCountsByDate: Record<string, { total: number; completed: number }> = {};
  todos.forEach(t => {
    if (!t.due_date) return;
    if (!taskCountsByDate[t.due_date]) taskCountsByDate[t.due_date] = { total: 0, completed: 0 };
    taskCountsByDate[t.due_date].total++;
    if (t.completed) taskCountsByDate[t.due_date].completed++;
  });

  const filtered = todos.filter(t => {
    if (selectedDate && t.due_date !== selectedDate) return false;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    if (filter === "overdue") return !t.completed && t.due_date && t.due_date < todayStr;
    return true;
  }).sort((a, b) => {
    if (sort === "priority") { const o = { high: 0, medium: 1, low: 2 }; return o[a.priority] - o[b.priority]; }
    if (sort === "start_time") { if (!a.start_time) return 1; if (!b.start_time) return -1; return a.start_time.localeCompare(b.start_time); }
    if (sort === "due_date") { if (!a.due_date) return 1; if (!b.due_date) return -1; return new Date(a.due_date).getTime() - new Date(b.due_date).getTime(); }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Split into daily and custom
  const dailyTodos = filtered.filter(t => t.task_type === "daily");
  const customTodos = filtered.filter(t => t.task_type !== "daily");

  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const pending = todos.filter(t => !t.completed).length;
  const overdue = todos.filter(t => !t.completed && t.due_date && t.due_date < todayStr).length;
  const todayTasks = todos.filter(t => t.due_date === todayStr);
  const todayDone = todayTasks.filter(t => t.completed).length;
  const isViewingToday = selectedDate === todayStr;
  const progress = total > 0 ? Math.round(completed / total * 100) : 0;
  const todayProgress = todayTasks.length > 0 ? Math.round(todayDone / todayTasks.length * 100) : 0;

  const moodBanner = {
    calm: null,
    success: { text: "✨ All tasks complete — great work!", color: "var(--success)", bg: "rgba(46,213,115,0.08)", border: "rgba(46,213,115,0.2)" },
    warning: { text: "⏳ Tasks in progress — stay focused", color: "var(--warning)", bg: "rgba(255,165,2,0.08)", border: "rgba(255,165,2,0.2)" },
    critical: { text: "🚨 Overdue tasks need your attention!", color: "var(--danger)", bg: "rgba(255,71,87,0.08)", border: "rgba(255,71,87,0.2)" },
  }[mood];

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

  return (
    <>
      {/* ── Dynamic Background ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundColor: "#0a0a0f" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: moodStyle.bg, transition: "background 1.2s ease", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 2, backgroundImage: `linear-gradient(${moodStyle.grid} 1px, transparent 1px), linear-gradient(90deg, ${moodStyle.grid} 1px, transparent 1px)`, backgroundSize: "80px 80px", transition: "background-image 1.2s ease", pointerEvents: "none" }} />
      {mood === "critical" && <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 3, background: "linear-gradient(90deg, transparent, rgba(255,71,87,0.9), transparent)", animation: "shimmer 2s infinite", pointerEvents: "none" }} />}
      <div style={{ position: "fixed", inset: 0, zIndex: 3, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E")`, pointerEvents: "none" }} />

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 10, minHeight: "100vh" }}>
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Mood Banner */}
          {moodBanner && (
            <div className="rounded-xl px-4 py-2.5 mb-4 text-sm font-medium animate-fade-in"
              style={{ background: moodBanner.bg, border: `1px solid ${moodBanner.border}`, color: moodBanner.color }}>
              {moodBanner.text}
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>✦ PERSONAL WORKSPACE</p>
              <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#fff" }}>{greeting()}</h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="btn-ghost flex items-center gap-2 text-sm"><LogOut size={14} /> Sign out</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { icon: LayoutList, label: "Total", value: total, color: "var(--soft)" },
              { icon: CheckCircle2, label: "Done", value: completed, color: "var(--success)" },
              { icon: Clock, label: "Pending", value: pending, color: "var(--accent)" },
              { icon: AlertTriangle, label: "Overdue", value: overdue, color: "var(--danger)" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(26,26,36,0.85)", border: "1px solid var(--border)" }}>
                <Icon size={16} className="mx-auto mb-1" style={{ color }} />
                <p className="text-xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--muted)" }}>
              <span>{isViewingToday ? `Today's progress · ${todayDone}/${todayTasks.length} tasks` : "Overall progress"}</span>
              <span style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{isViewingToday ? todayProgress : progress}%</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${isViewingToday ? todayProgress : progress}%` }} /></div>
          </div>

          {/* Date Browser */}
          <DateBrowser selectedDate={selectedDate} onDateSelect={setSelectedDate} taskCountsByDate={taskCountsByDate} />

          {/* Daily Templates */}
          <DailyTemplates
            templates={templates}
            onAdd={addTemplate}
            onUpdate={updateTemplate}
            onDelete={deleteTemplate}
            onApplyToday={applyTemplatesToToday}
            applying={applying}
          />

          {/* Search + Filters */}
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  className="input-field text-sm" style={{ paddingLeft: "2.25rem", paddingTop: "0.6rem", paddingBottom: "0.6rem" }}
                  placeholder="Search tasks..." />
              </div>
              <button onClick={() => setShowFilters(o => !o)} className="btn-ghost flex items-center gap-1.5"
                style={{ borderColor: showFilters ? "var(--accent)" : undefined, color: showFilters ? "var(--accent)" : undefined }}>
                <SlidersHorizontal size={14} /> Filter
              </button>
            </div>
            {showFilters && (
              <div className="flex gap-2 flex-wrap animate-slide-down">
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--card)" }}>
                  {(["all","active","completed","overdue"] as FilterType[]).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className="text-xs px-3 py-1.5 rounded-md transition-all capitalize"
                      style={{ background: filter === f ? "var(--accent)" : "transparent", color: filter === f ? "var(--obsidian)" : "var(--muted)", fontWeight: filter === f ? 600 : 400 }}>
                      {f}
                    </button>
                  ))}
                </div>
                <select value={sort} onChange={e => setSort(e.target.value as SortType)} className="input-field text-xs" style={{ padding: "0.4rem 0.75rem", width: "auto" }}>
                  <option value="priority">Sort: Priority</option>
                  <option value="start_time">Sort: Time</option>
                  <option value="due_date">Sort: Due Date</option>
                  <option value="created_at">Sort: Newest</option>
                </select>
              </div>
            )}
          </div>

          {/* Add Custom Todo */}
          <div className="mb-4"><AddTodo onAdd={addTodo} selectedDate={selectedDate} /></div>

          {/* Todo Lists */}
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer rounded-xl h-16 mb-2" />)
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ background: "rgba(26,26,36,0.8)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "2.5rem" }}>📝</p>
              <p className="mt-3 font-medium" style={{ color: "var(--soft)" }}>No tasks — add one above</p>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Press N to quickly add, or use Daily Tasks above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daily Tasks section */}
              {dailyTodos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                    <span className="text-xs px-2" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                      🔁 DAILY · {dailyTodos.filter(t => t.completed).length}/{dailyTodos.length} done
                    </span>
                    <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                  </div>
                  <div className="space-y-2">
                    {dailyTodos.map(t => <TodoItem key={t.id} todo={t} onToggle={toggleTodo} onDelete={deleteTodo} onUpdate={updateTodo} />)}
                  </div>
                </div>
              )}

              {/* Custom Tasks section */}
              {customTodos.length > 0 && (
                <div>
                  {dailyTodos.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 mt-2">
                      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                      <span className="text-xs px-2" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                        ✦ CUSTOM · {customTodos.filter(t => t.completed).length}/{customTodos.length} done
                      </span>
                      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                    </div>
                  )}
                  <div className="space-y-2">
                    {customTodos.map(t => <TodoItem key={t.id} todo={t} onToggle={toggleTodo} onDelete={deleteTodo} onUpdate={updateTodo} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <p className="text-center text-xs mt-6" style={{ color: "var(--border)" }}>
              {filtered.length} task{filtered.length !== 1 ? "s" : ""} · Press N to add
            </p>
          )}
        </div>
      </div>

      <InstallBanner />
    </>
  );
}
