"use client";

import { useState } from "react";
import { Trash2, Pencil, Check, X, Calendar, Tag, Clock, AlertCircle } from "lucide-react";
import { Todo, Priority } from "@/lib/types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
}

const priorityConfig = {
  high:   { label: "High",   dot: "#ff4757", class: "priority-high" },
  medium: { label: "Med",    dot: "#ffa502", class: "priority-medium" },
  low:    { label: "Low",    dot: "#2ed573", class: "priority-low" },
};

function getTimeStatus(todo: Todo): "active" | "overdue" | "upcoming" | "none" {
  if (todo.completed || !todo.start_time || !todo.end_time) return "none";
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  if (todo.due_date && todo.due_date !== todayStr) return "none";
  const [sh, sm] = todo.start_time.split(":").map(Number);
  const [eh, em] = todo.end_time.split(":").map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (nowMins < startMins) return "upcoming";
  if (nowMins >= startMins && nowMins <= endMins) return "active";
  return "overdue";
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function isDateOverdue(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default function TodoItem({ todo, onToggle, onDelete, onUpdate }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description || "");
  const [editStart, setEditStart] = useState(todo.start_time || "");
  const [editEnd, setEditEnd] = useState(todo.end_time || "");

  const overdue = isDateOverdue(todo.due_date) && !todo.completed;
  const timeStatus = getTimeStatus(todo);
  const pc = priorityConfig[todo.priority];

  function handleSave() {
    if (!editTitle.trim()) return;
    onUpdate(todo.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || undefined,
      start_time: editStart || undefined,
      end_time: editEnd || undefined,
    });
    setEditing(false);
  }

  function formatDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const timeStatusStyles = {
    active:   { bg: "rgba(46,213,115,0.08)",  border: "rgba(46,213,115,0.25)",  color: "#2ed573", label: "In Progress" },
    overdue:  { bg: "rgba(255,71,87,0.08)",   border: "rgba(255,71,87,0.25)",   color: "#ff4757", label: "Time Overdue" },
    upcoming: { bg: "rgba(232,197,71,0.06)",  border: "rgba(232,197,71,0.15)",  color: "#e8c547", label: "Upcoming" },
    none:     { bg: "", border: "", color: "", label: "" },
  };
  const ts = timeStatusStyles[timeStatus];

  return (
    <div
      className={`todo-card animate-fade-in ${todo.completed ? "completed" : ""}`}
      style={{
        borderLeft: `3px solid ${pc.dot}`,
        background: timeStatus === "active" ? "rgba(46,213,115,0.04)" :
                    timeStatus === "overdue" ? "rgba(255,71,87,0.04)" : "var(--card)",
        transition: "all 0.3s ease",
      }}
    >
      {editing ? (
        <div className="space-y-2">
          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
            className="input-field text-sm" autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }} />
          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
            className="input-field text-sm resize-none" rows={2} placeholder="Description..."
            style={{ fontFamily: "'DM Sans', sans-serif" }} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Start time</label>
              <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)}
                className="input-field text-sm" style={{ padding: "0.4rem 0.75rem", colorScheme: "dark" }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>End time</label>
              <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)}
                className="input-field text-sm" style={{ padding: "0.4rem 0.75rem", colorScheme: "dark" }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
              <Check size={12} /> Save
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id, todo.completed)}
            className="custom-checkbox mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug"
              style={{ color: todo.completed ? "var(--muted)" : "var(--soft)", textDecoration: todo.completed ? "line-through" : "none" }}>
              {todo.title}
            </p>
            {todo.description && (
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>{todo.description}</p>
            )}

            {/* Time slot badge */}
            {todo.start_time && todo.end_time && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs px-2 py-1 rounded-lg w-fit"
                style={{ background: ts.bg, border: `1px solid ${ts.border}`, color: ts.color }}>
                {timeStatus === "overdue" ? <AlertCircle size={10} /> : <Clock size={10} />}
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatTime(todo.start_time)} – {formatTime(todo.end_time)}
                </span>
                {timeStatus !== "none" && (
                  <span className="ml-1 font-semibold">· {ts.label}</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${pc.class}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pc.label}</span>
              {todo.category && (
                <span className="tag-pill flex items-center gap-1"><Tag size={9} />{todo.category}</span>
              )}
              {todo.due_date && (
                <span className="text-xs flex items-center gap-1"
                  style={{ color: overdue ? "var(--danger)" : "var(--muted)" }}>
                  <Calendar size={10} />
                  {overdue ? "Overdue · " : ""}{formatDate(todo.due_date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 ml-1">
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--muted)" }}>
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(todo.id)}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: "var(--muted)" }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
