"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Clock, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { DailyTemplate, Priority } from "@/lib/types";

interface Props {
  templates: DailyTemplate[];
  onAdd: (t: Omit<DailyTemplate, "id" | "user_id" | "created_at">) => Promise<void>;
  onUpdate: (id: string, updates: Partial<DailyTemplate>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onApplyToday: () => Promise<void>;
  applying: boolean;
}

const CATEGORIES = ["Work", "Personal", "Shopping", "Health", "Learning", "Other"];
const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "high", label: "🔴 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
];
const PRIO_COLOR: Record<Priority, string> = { high: "#ff4757", medium: "#ffa502", low: "#2ed573" };

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function DailyTemplates({ templates, onAdd, onUpdate, onDelete, onApplyToday, applying }: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const blank = { title: "", description: "", priority: "medium" as Priority, start_time: "", end_time: "", category: "", active: true };
  const [form, setForm] = useState(blank);

  async function handleAdd() {
    if (!form.title.trim()) return;
    await onAdd({ ...form, title: form.title.trim(), description: form.description || undefined, start_time: form.start_time || undefined, end_time: form.end_time || undefined, category: form.category || undefined });
    setForm(blank);
    setAdding(false);
  }

  async function handleUpdate(id: string) {
    await onUpdate(id, { ...form, title: form.title.trim(), description: form.description || undefined, start_time: form.start_time || undefined, end_time: form.end_time || undefined, category: form.category || undefined });
    setEditingId(null);
  }

  function startEdit(t: DailyTemplate) {
    setForm({ title: t.title, description: t.description || "", priority: t.priority, start_time: t.start_time || "", end_time: t.end_time || "", category: t.category || "", active: t.active });
    setEditingId(t.id);
  }

  const activeCount = templates.filter(t => t.active).length;

  return (
    <div className="mb-6 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "rgba(26,26,36,0.9)" }}>
      {/* Header */}
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: "transparent" }}>
        <div className="flex items-center gap-2">
          <RefreshCw size={14} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "#fff" }}>Daily Tasks</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(232,197,71,0.12)", color: "var(--accent)" }}>
            {activeCount} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onApplyToday(); }}
            className="text-xs px-3 py-1 rounded-lg flex items-center gap-1"
            style={{ background: "rgba(232,197,71,0.15)", color: "var(--accent)", border: "1px solid rgba(232,197,71,0.25)" }}
            disabled={applying}
          >
            {applying ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
            {applying ? "Adding..." : "Add to Today"}
          </button>
          {open ? <ChevronUp size={14} style={{ color: "var(--muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--muted)" }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 animate-slide-down">
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            These tasks auto-populate daily. Click "Add to Today" to add them to the selected date.
          </p>

          {/* Template list */}
          {templates.map(t => (
            <div key={t.id} className="rounded-lg p-3" style={{ background: "rgba(10,10,15,0.6)", border: "1px solid var(--border)", opacity: t.active ? 1 : 0.5 }}>
              {editingId === t.id ? (
                <TemplateForm form={form} setForm={setForm} onSave={() => handleUpdate(t.id)} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => onUpdate(t.id, { active: !t.active })}
                    className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors"
                    style={{ background: t.active ? "var(--accent)" : "transparent", border: `2px solid ${t.active ? "var(--accent)" : "var(--border)"}` }}>
                    {t.active && <Check size={10} style={{ color: "var(--obsidian)" }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--soft)" }}>{t.title}</span>
                      <span className="text-xs" style={{ color: PRIO_COLOR[t.priority] }}>●</span>
                    </div>
                    {(t.start_time && t.end_time) && (
                      <span className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--muted)" }}>
                        <Clock size={9} /> {formatTime(t.start_time)} – {formatTime(t.end_time)}
                      </span>
                    )}
                  </div>
                  <button onClick={() => startEdit(t)} className="p-1 rounded hover:bg-white/5" style={{ color: "var(--muted)" }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => onDelete(t.id)} className="p-1 rounded hover:bg-red-500/10" style={{ color: "var(--muted)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {templates.length === 0 && !adding && (
            <p className="text-xs text-center py-4" style={{ color: "var(--muted)" }}>
              No daily tasks yet. Add one below.
            </p>
          )}

          {/* Add form */}
          {adding ? (
            <div className="rounded-lg p-3" style={{ background: "rgba(10,10,15,0.6)", border: "1px solid rgba(232,197,71,0.2)" }}>
              <TemplateForm form={form} setForm={setForm} onSave={handleAdd} onCancel={() => { setAdding(false); setForm(blank); }} />
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="w-full text-xs py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
              style={{ border: "1px dashed var(--border)", color: "var(--muted)" }}>
              <Plus size={12} /> Add daily task template
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateForm({ form, setForm, onSave, onCancel }: {
  form: any; setForm: any; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      <input type="text" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))}
        className="input-field text-sm" placeholder="Task title" autoFocus style={{ padding: "0.5rem 0.75rem" }} />
      <div className="grid grid-cols-3 gap-2">
        <select value={form.priority} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))}
          className="input-field text-xs" style={{ padding: "0.4rem 0.5rem" }}>
          {[{ value: "high", label: "🔴 High" }, { value: "medium", label: "🟡 Med" }, { value: "low", label: "🟢 Low" }].map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <input type="time" value={form.start_time} onChange={e => setForm((f: any) => ({ ...f, start_time: e.target.value }))}
          className="input-field text-xs" style={{ padding: "0.4rem 0.5rem", colorScheme: "dark" }} placeholder="Start" />
        <input type="time" value={form.end_time} onChange={e => setForm((f: any) => ({ ...f, end_time: e.target.value }))}
          className="input-field text-xs" style={{ padding: "0.4rem 0.5rem", colorScheme: "dark" }} placeholder="End" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={!form.title.trim()}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 flex-1">
          <Check size={11} /> Save
        </button>
        <button onClick={onCancel} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
          <X size={11} /> Cancel
        </button>
      </div>
    </div>
  );
}
