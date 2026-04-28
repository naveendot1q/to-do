"use client";

import { useState } from "react";
import { Plus, X, Clock } from "lucide-react";
import { Priority } from "@/lib/types";

interface AddTodoProps {
  selectedDate?: string | null;
  onAdd: (todo: {
    title: string;
    description?: string;
    priority: Priority;
    due_date?: string;
    start_time?: string;
    end_time?: string;
    category?: string;
  }) => Promise<void>;
}

const CATEGORIES = ["Work", "Personal", "Shopping", "Health", "Learning", "Other"];

export default function AddTodo({ onAdd, selectedDate }: AddTodoProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState(selectedDate || "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      category: category || undefined,
    });
    setTitle(""); setDescription(""); setPriority("medium");
    setDueDate(""); setStartTime(""); setEndTime(""); setCategory("");
    setLoading(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        id="add-todo-trigger"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl p-4 transition-all duration-200 group"
        style={{ background: "rgba(232,197,71,0.05)", border: "1px dashed rgba(232,197,71,0.25)", color: "var(--muted)" }}
      >
        <Plus size={18} style={{ color: "var(--accent)" }} className="group-hover:rotate-90 transition-transform duration-200" />
        <span className="text-sm">Add a new task...</span>
        <span className="ml-auto text-xs" style={{ color: "var(--border)" }}>or press N</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl p-5 animate-slide-down" style={{ background: "var(--card)", border: "1px solid rgba(232,197,71,0.3)", boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "#fff" }}>New Task</h3>
        <button onClick={() => setOpen(false)} className="btn-ghost p-1.5"><X size={16} /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="input-field" placeholder="What needs to be done?" autoFocus required />

        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          className="input-field resize-none" placeholder="Add a description (optional)"
          rows={2} style={{ fontFamily: "'DM Sans', sans-serif" }} />

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
              className="input-field text-sm" style={{ padding: "0.5rem 0.75rem" }}>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="input-field text-sm" style={{ padding: "0.5rem 0.75rem", colorScheme: "dark" }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="input-field text-sm" style={{ padding: "0.5rem 0.75rem" }}>
              <option value="">None</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Time Slot */}
        <div>
          <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: "var(--muted)" }}>
            <Clock size={11} /> Time Slot (optional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--border)" }}>Start</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="input-field text-sm" style={{ padding: "0.5rem 0.75rem", colorScheme: "dark" }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--border)" }}>End</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="input-field text-sm" style={{ padding: "0.5rem 0.75rem", colorScheme: "dark" }} />
            </div>
          </div>
          {startTime && endTime && (
            <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>
              ⏱ {startTime} – {endTime} · Task will show as overdue after {endTime}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading || !title.trim()}>
            {loading ? "Adding..." : "Add Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
