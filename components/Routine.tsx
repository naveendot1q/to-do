"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Clock, GripVertical } from "lucide-react";
import { Todo, Priority } from "@/lib/types";

// ── ROUTINE BLOCK DEFINITIONS ─────────────────────────────────────────────────
// These define the timeline structure. Tasks inside are real Todos filtered by routine_block.

export interface RoutineBlock {
  id: string;
  time: string;      // display string e.g. "05:00 – 06:00"
  startMins: number; // for "NOW" detection
  endMins: number;
  title: string;
  icon: string;
  color: string;
  weekOffOnly?: boolean;  // only show on week-off days
  gymOnly?: boolean;      // only show on gym days
  defaultTasks: { title: string; priority: Priority; start_time?: string; end_time?: string }[];
}

export const ROUTINE_BLOCKS: RoutineBlock[] = [
  {
    id: "morning_ritual",
    time: "05:00 – 05:45",
    startMins: 300, endMins: 345,
    title: "Morning Ritual",
    icon: "🌅",
    color: "#e8c547",
    defaultTasks: [
      { title: "Make bed", priority: "high", start_time: "05:00", end_time: "05:05" },
      { title: "Pee & drink 1L water", priority: "high", start_time: "05:05", end_time: "05:10" },
      { title: "Stretching & get fresh", priority: "medium", start_time: "05:10", end_time: "05:20" },
      { title: "20×3 Push-Ups", priority: "high", start_time: "05:20", end_time: "05:25" },
      { title: "20×3 Squats", priority: "high", start_time: "05:25", end_time: "05:30" },
      { title: "3× Plank", priority: "medium", start_time: "05:30", end_time: "05:33" },
      { title: "10 min Kapalbhati", priority: "high", start_time: "05:33", end_time: "05:43" },
      { title: "High carb diet + Brush", priority: "medium", start_time: "05:43", end_time: "05:45" },
    ],
  },
  {
    id: "study_morning",
    time: "05:45 – 09:00",
    startMins: 345, endMins: 540,
    title: "Study Session 1",
    icon: "📚",
    color: "#2ed573",
    defaultTasks: [
      { title: "Reach library", priority: "high", start_time: "05:45", end_time: "06:00" },
      { title: "Focused deep work — Made Easy CS", priority: "high", start_time: "06:00", end_time: "09:00" },
    ],
  },
  {
    id: "gym_block",
    time: "09:00 – 11:00",
    startMins: 540, endMins: 660,
    title: "Gym Block",
    icon: "💪",
    color: "#ff4757",
    weekOffOnly: false,
    defaultTasks: [
      { title: "Move to gym", priority: "high", start_time: "09:00", end_time: "09:15" },
      { title: "Warm-Up: 1km Run", priority: "high", start_time: "09:15", end_time: "09:25" },
      { title: "Double body part training", priority: "high", start_time: "09:25", end_time: "10:45" },
      { title: "Reach PG before 10:00 / bath & prep", priority: "medium", start_time: "10:45", end_time: "11:00" },
    ],
  },
  {
    id: "weekoff_prep",
    time: "09:00 – 11:00",
    startMins: 540, endMins: 660,
    title: "Home Prep (Week Off)",
    icon: "🏠",
    color: "#a78bfa",
    weekOffOnly: true,
    defaultTasks: [
      { title: "Prepare breakfast", priority: "high", start_time: "09:00", end_time: "09:30" },
      { title: "Complete all chores", priority: "medium", start_time: "09:30", end_time: "10:00" },
      { title: "Plan the day + time management", priority: "high", start_time: "10:00", end_time: "10:20" },
      { title: "Bath & get ready", priority: "high", start_time: "10:20", end_time: "10:50" },
      { title: "Reach library before 11:00", priority: "high", start_time: "10:50", end_time: "11:00" },
    ],
  },
  {
    id: "study_afternoon",
    time: "11:00 – 13:00",
    startMins: 660, endMins: 780,
    title: "Library Session",
    icon: "🎯",
    color: "#2ed573",
    defaultTasks: [
      { title: "Library — Made Easy CS / target subject", priority: "high", start_time: "11:00", end_time: "13:00" },
    ],
  },
  {
    id: "office_block",
    time: "13:00+",
    startMins: 780, endMins: 1320,
    title: "Office Block",
    icon: "🏢",
    color: "#ffa502",
    defaultTasks: [
      { title: "Get to the bus", priority: "high", start_time: "13:00", end_time: "13:30" },
      { title: "Lunch", priority: "medium", start_time: "13:30", end_time: "14:00" },
      { title: "Newspaper reading", priority: "low", start_time: "14:00", end_time: "14:30" },
      { title: "CA prep", priority: "medium", start_time: "14:30", end_time: "18:00" },
    ],
  },
];

interface Props {
  todos: Todo[];
  selectedDate: string | null;
  isWeekOff: boolean;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onAdd: (todo: { title: string; description?: string; priority: Priority; due_date?: string; start_time?: string; end_time?: string; category?: string; routine_block?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Todo>) => Promise<void>;
}

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

// ── ADD TASK INLINE ───────────────────────────────────────────────────────────
function AddTaskInline({ block, date, onAdd, onClose }: {
  block: RoutineBlock;
  date: string;
  onAdd: Props["onAdd"];
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [startTime, setStartTime] = useState(block.startMins < 1320 ? `${String(Math.floor(block.startMins/60)).padStart(2,"0")}:${String(block.startMins%60).padStart(2,"0")}` : "");
  const [endTime, setEndTime] = useState("");

  async function submit() {
    if (!title.trim()) return;
    await onAdd({ title: title.trim(), priority, due_date: date, start_time: startTime || undefined, end_time: endTime || undefined, routine_block: block.id, task_type: "routine" } as any);
    setTitle(""); onClose();
  }

  return (
    <div className="mt-2 rounded-xl p-3 animate-slide-down" style={{ background: "rgba(10,10,15,0.7)", border: `1px solid ${block.color}30` }}>
      <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        className="input-field text-sm w-full mb-2" style={{ padding: "0.4rem 0.6rem" }} placeholder="Task title..." autoFocus />
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
          {(["high","medium","low"] as Priority[]).map(p => (
            <button key={p} onClick={() => setPriority(p)} className="text-xs px-2 py-1 rounded capitalize"
              style={{ background: priority===p ? (p==="high"?"rgba(255,71,87,0.2)":p==="medium"?"rgba(255,165,2,0.2)":"rgba(46,213,115,0.2)") : "rgba(255,255,255,0.05)", color: priority===p ? (p==="high"?"#ff4757":p==="medium"?"#ffa502":"#2ed573") : "var(--muted)", border: priority===p ? `1px solid ${p==="high"?"#ff4757":p==="medium"?"#ffa502":"#2ed573"}30` : "1px solid transparent" }}>
              {p}
            </button>
          ))}
        </div>
        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
          className="input-field text-xs" style={{ padding: "0.25rem 0.4rem", width: "90px", colorScheme: "dark" }} />
        <span className="text-xs self-center" style={{ color: "var(--muted)" }}>–</span>
        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
          className="input-field text-xs" style={{ padding: "0.25rem 0.4rem", width: "90px", colorScheme: "dark" }} />
        <button onClick={submit} disabled={!title.trim()} className="btn-primary text-xs py-1 px-3 ml-auto flex items-center gap-1"><Plus size={10} />Add</button>
        <button onClick={onClose} className="btn-ghost text-xs py-1 px-2"><X size={10} /></button>
      </div>
    </div>
  );
}

// ── EDIT TASK INLINE ──────────────────────────────────────────────────────────
function EditTaskInline({ todo, onSave, onClose }: { todo: Todo; onSave: (u: Partial<Todo>) => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [startTime, setStartTime] = useState(todo.start_time || "");
  const [endTime, setEndTime] = useState(todo.end_time || "");

  async function submit() {
    if (!title.trim()) return;
    await onSave({ title: title.trim(), priority, start_time: startTime || undefined, end_time: endTime || undefined });
    onClose();
  }

  return (
    <div className="mt-1 rounded-lg p-2 animate-slide-down" style={{ background: "rgba(10,10,15,0.6)", border: "1px solid rgba(232,197,71,0.2)" }}>
      <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        className="input-field text-sm w-full mb-2" style={{ padding: "0.35rem 0.5rem" }} autoFocus />
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
          {(["high","medium","low"] as Priority[]).map(p => (
            <button key={p} onClick={() => setPriority(p)} className="text-xs px-2 py-0.5 rounded capitalize"
              style={{ background: priority===p ? (p==="high"?"rgba(255,71,87,0.2)":p==="medium"?"rgba(255,165,2,0.2)":"rgba(46,213,115,0.2)") : "transparent", color: priority===p ? (p==="high"?"#ff4757":p==="medium"?"#ffa502":"#2ed573") : "var(--muted)" }}>
              {p}
            </button>
          ))}
        </div>
        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
          className="input-field text-xs" style={{ padding: "0.2rem 0.4rem", width: "86px", colorScheme: "dark" }} />
        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
          className="input-field text-xs" style={{ padding: "0.2rem 0.4rem", width: "86px", colorScheme: "dark" }} />
        <button onClick={submit} className="btn-primary text-xs py-0.5 px-3 flex items-center gap-1 ml-auto"><Check size={10} />Save</button>
        <button onClick={onClose} className="btn-ghost text-xs py-0.5 px-2"><X size={10} /></button>
      </div>
    </div>
  );
}

// ── ADD DEFAULT TASKS PROMPT ──────────────────────────────────────────────────
function DefaultTasksPopup({ block, date, onAdd, onClose }: { block: RoutineBlock; date: string; onAdd: Props["onAdd"]; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set(block.defaultTasks.map((_, i) => i)));

  async function addSelected() {
    const tasks = block.defaultTasks.filter((_, i) => selected.has(i));
    for (const t of tasks) {
      await onAdd({ title: t.title, priority: t.priority, due_date: date, start_time: t.start_time, end_time: t.end_time, routine_block: block.id, task_type: "routine" } as any);
    }
    onClose();
  }

  function toggle(i: number) { setSelected(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; }); }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-5 animate-slide-up" style={{ background: "rgba(20,20,30,0.98)", border: `1px solid ${block.color}40`, maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <span style={{ fontSize: "1.2rem" }}>{block.icon}</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#fff" }}>Add default tasks for {block.title}</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Select which tasks to add to {date}</p>
          </div>
        </div>
        <div className="space-y-1.5 mb-4">
          {block.defaultTasks.map((t, i) => (
            <button key={i} onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left"
              style={{ background: selected.has(i) ? `${block.color}10` : "rgba(255,255,255,0.03)", border: `1px solid ${selected.has(i) ? `${block.color}30` : "rgba(255,255,255,0.06)"}` }}>
              <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                style={{ background: selected.has(i) ? block.color : "transparent", border: `1.5px solid ${selected.has(i) ? block.color : "var(--border)"}` }}>
                {selected.has(i) && <Check size={9} style={{ color: "#0a0a0f" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm" style={{ color: "var(--soft)" }}>{t.title}</span>
                {(t.start_time || t.end_time) && (
                  <span className="text-xs ml-2" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{t.start_time}{t.end_time ? ` – ${t.end_time}` : ""}</span>
                )}
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ background: t.priority==="high"?"rgba(255,71,87,0.15)":t.priority==="medium"?"rgba(255,165,2,0.15)":"rgba(46,213,115,0.15)", color: t.priority==="high"?"#ff4757":t.priority==="medium"?"#ffa502":"#2ed573" }}>{t.priority}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={addSelected} disabled={selected.size === 0} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
            <Plus size={14} /> Add {selected.size} Task{selected.size !== 1 ? "s" : ""}
          </button>
          <button onClick={onClose} className="btn-ghost px-4 text-sm"><X size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ── BLOCK CARD ────────────────────────────────────────────────────────────────
function BlockCard({ block, todos, currentMins, date, onToggle, onAdd, onDelete, onUpdate }: {
  block: RoutineBlock;
  todos: Todo[];
  currentMins: number;
  date: string;
  onToggle: Props["onToggle"];
  onAdd: Props["onAdd"];
  onDelete: Props["onDelete"];
  onUpdate: Props["onUpdate"];
}) {
  const [open, setOpen] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDefaults, setShowDefaults] = useState(false);

  const isActive = currentMins >= block.startMins && currentMins <= block.endMins;
  const isDone = currentMins > block.endMins;
  const completedCount = todos.filter(t => t.completed).length;
  const allDone = todos.length > 0 && completedCount === todos.length;

  return (
    <>
      {showDefaults && <DefaultTasksPopup block={block} date={date} onAdd={onAdd} onClose={() => setShowDefaults(false)} />}
      <div className="relative flex gap-4 mb-5 pl-12">
        {/* Timeline dot */}
        <div className="absolute left-3.5 top-2.5 w-3 h-3 rounded-full -translate-x-1/2" style={{
          background: allDone ? "#2ed573" : isActive ? block.color : isDone ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
          border: isActive ? `2px solid ${block.color}` : "2px solid rgba(255,255,255,0.1)",
          boxShadow: isActive ? `0 0 14px ${block.color}70` : "none", zIndex: 1,
        }} />

        <div className="flex-1 rounded-xl overflow-hidden" style={{
          background: isActive ? `${block.color}08` : "rgba(26,26,36,0.75)",
          border: `1px solid ${isActive ? `${block.color}30` : "rgba(255,255,255,0.05)"}`,
          opacity: isDone && !isActive ? 0.7 : 1,
        }}>
          {/* Block header */}
          <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left" style={{ background: "transparent" }}>
            <span style={{ fontSize: "1rem" }}>{block.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold" style={{ color: isActive ? block.color : "#fff" }}>{block.title}</span>
                {isActive && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: `${block.color}20`, color: block.color, fontSize: "9px", letterSpacing: "0.05em" }}>NOW</span>}
                {allDone && <span style={{ fontSize: "10px", color: "#2ed573" }}>✓ done</span>}
              </div>
              <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{block.time}</span>
            </div>
            <span className="text-xs mr-1" style={{ color: allDone ? "#2ed573" : "var(--muted)" }}>{completedCount}/{todos.length}</span>
            {open ? <ChevronUp size={13} style={{ color: "var(--muted)" }} /> : <ChevronDown size={13} style={{ color: "var(--muted)" }} />}
          </button>

          {open && (
            <div className="px-4 pb-3">
              {/* Progress bar */}
              {todos.length > 0 && (
                <div className="h-0.5 rounded-full mb-3 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(completedCount/todos.length)*100}%`, background: block.color }} />
                </div>
              )}

              {todos.length === 0 && (
                <div className="text-center py-3 mb-2">
                  <p className="text-xs" style={{ color: "var(--muted)" }}>No tasks yet</p>
                  <button onClick={() => setShowDefaults(true)} className="text-xs mt-1 underline" style={{ color: block.color }}>
                    + Load default tasks for this block
                  </button>
                </div>
              )}

              {/* Task list */}
              <div className="space-y-1">
                {todos.map(todo => (
                  <div key={todo.id}>
                    {editingId === todo.id ? (
                      <EditTaskInline todo={todo} onSave={u => onUpdate(todo.id, u)} onClose={() => setEditingId(null)} />
                    ) : (
                      <div className="flex items-center gap-2 group py-1">
                        <button onClick={() => onToggle(todo.id, todo.completed)}
                          className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                          style={{ background: todo.completed ? (todo.priority==="high"?"#ff4757":todo.priority==="medium"?"#ffa502":"#2ed573") : "rgba(255,255,255,0.05)", border: `1.5px solid ${todo.completed ? (todo.priority==="high"?"#ff4757":todo.priority==="medium"?"#ffa502":"#2ed573") : "rgba(255,255,255,0.12)"}` }}>
                          {todo.completed && <Check size={9} style={{ color: "#0a0a0f" }} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs" style={{ color: todo.completed ? "var(--muted)" : "var(--soft)", textDecoration: todo.completed ? "line-through" : "none" }}>{todo.title}</span>
                          {(todo.start_time || todo.end_time) && (
                            <span className="ml-2 text-xs" style={{ color: "var(--border)", fontFamily: "'JetBrains Mono',monospace" }}>
                              {todo.start_time}{todo.end_time ? `–${todo.end_time}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: todo.priority==="high"?"#ff4757":todo.priority==="medium"?"#ffa502":"#2ed573" }} />
                          <button onClick={() => setEditingId(todo.id)} className="p-0.5 rounded" style={{ color: "var(--muted)" }}><Pencil size={10} /></button>
                          <button onClick={() => onDelete(todo.id)} className="p-0.5 rounded" style={{ color: "var(--muted)" }}><Trash2 size={10} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add task */}
              {addingTask ? (
                <AddTaskInline block={block} date={date} onAdd={onAdd} onClose={() => setAddingTask(false)} />
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => setAddingTask(true)}
                    className="flex items-center gap-1 text-xs py-1 px-2 rounded-lg"
                    style={{ color: "var(--muted)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                    <Plus size={10} /> Add task
                  </button>
                  {todos.length === 0 && (
                    <button onClick={() => setShowDefaults(true)} className="flex items-center gap-1 text-xs py-1 px-2 rounded-lg"
                      style={{ color: block.color, border: `1px dashed ${block.color}40` }}>
                      <Clock size={10} /> Load defaults
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function Routine({ todos, selectedDate, isWeekOff, onToggle, onAdd, onDelete, onUpdate }: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(iv); }, []);

  const date = selectedDate || toLocalDateStr(new Date());
  const isToday = date === toLocalDateStr(new Date());
  const currentMins = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  // Filter blocks based on week-off
  const visibleBlocks = ROUTINE_BLOCKS.filter(b => {
    if (b.weekOffOnly === true) return isWeekOff;
    if (b.weekOffOnly === false) return !isWeekOff;
    return true;
  });

  // Group todos by routine_block (only for this date)
  const dateTodos = todos.filter(t => t.due_date === date);
  function blockTodos(blockId: string) {
    return dateTodos.filter(t => t.routine_block === blockId);
  }
  // Unassigned todos (no routine_block or routine_block not in visible blocks)
  const visibleBlockIds = new Set(visibleBlocks.map(b => b.id));
  const unassigned = dateTodos.filter(t => !t.routine_block || !visibleBlockIds.has(t.routine_block));

  const totalDone = dateTodos.filter(t => t.completed).length;
  const total = dateTodos.length;
  const pct = total > 0 ? Math.round((totalDone / total) * 100) : 0;

  return (
    <div className="pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>
            {isWeekOff ? "Week Off Routine" : "Daily Routine"}
          </h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {isToday ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            {isWeekOff && <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>Week Off</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color: pct === 100 ? "#2ed573" : "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>{pct}%</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{totalDone}/{total} done</p>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="progress-bar mb-4">
          <div className="progress-fill" style={{ width: `${pct}%`, background: pct===100?"#2ed573":"var(--accent)" }} />
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: "rgba(255,255,255,0.05)" }} />
        {visibleBlocks.map(block => (
          <BlockCard
            key={block.id}
            block={block}
            todos={blockTodos(block.id)}
            currentMins={currentMins}
            date={date}
            onToggle={onToggle}
            onAdd={onAdd}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {/* Unassigned tasks */}
      {unassigned.length > 0 && (
        <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(26,26,36,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Other tasks today</p>
          {unassigned.map(todo => (
            <div key={todo.id} className="flex items-center gap-2 py-1.5">
              <button onClick={() => onToggle(todo.id, todo.completed)}
                className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                style={{ background: todo.completed ? "var(--success)" : "transparent", border: `1.5px solid ${todo.completed ? "var(--success)" : "rgba(255,255,255,0.12)"}` }}>
                {todo.completed && <Check size={9} style={{ color: "#0a0a0f" }} />}
              </button>
              <span className="text-xs flex-1" style={{ color: todo.completed ? "var(--muted)" : "var(--soft)", textDecoration: todo.completed ? "line-through" : "none" }}>{todo.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Week off study reference */}
      {isWeekOff && (
        <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(26,26,36,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)", letterSpacing: "0.08em" }}>WEEK OFF STUDY PLAN</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ slot: "Week Off 1", topic: "Quant", color: "#ffa502" }, { slot: "Week Off 2", topic: "Revision + Test", color: "#a78bfa" }].map(s => (
              <div key={s.slot} className="p-3 rounded-xl" style={{ background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{s.slot}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: s.color }}>{s.topic}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
