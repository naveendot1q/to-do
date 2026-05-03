"use client";

import { useState } from "react";
import { Plus, Check, Trash2, Pencil, X, Clock, Flame, ChevronDown, ChevronUp } from "lucide-react";
import { Meal, MealType } from "@/lib/types";

interface Props {
  meals: Meal[];
  selectedDate: string | null;
  onAdd: (meal: Omit<Meal, "id"|"user_id"|"created_at">) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Meal>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const MEAL_SLOTS: { key: MealType; label: string; emoji: string; defaultTime: string; color: string; border: string }[] = [
  { key: "pre_breakfast", label: "Pre-Breakfast",    emoji: "🌅", defaultTime: "06:30", color: "rgba(255,165,2,0.08)",  border: "rgba(255,165,2,0.2)" },
  { key: "breakfast",     label: "Breakfast",        emoji: "🍳", defaultTime: "08:00", color: "rgba(232,197,71,0.08)", border: "rgba(232,197,71,0.2)" },
  { key: "lunch",         label: "Lunch",            emoji: "🍱", defaultTime: "13:00", color: "rgba(46,213,115,0.08)", border: "rgba(46,213,115,0.2)" },
  { key: "evening_snack", label: "After Gym / Evening Snack", emoji: "💪", defaultTime: "17:30", color: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}

function MealSlot({ slot, meals, date, onAdd, onUpdate, onDelete }: {
  slot: typeof MEAL_SLOTS[0];
  meals: Meal[];
  date: string;
  onAdd: Props["onAdd"];
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState({ name: "", description: "", time: slot.defaultTime, calories: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "", time: "", calories: "" });

  const slotMeals = meals.filter(m => m.meal_type === slot.key);
  const allDone = slotMeals.length > 0 && slotMeals.every(m => m.completed);
  const totalCals = slotMeals.reduce((s, m) => s + (m.calories || 0), 0);

  async function handleAdd() {
    if (!form.name.trim()) return;
    await onAdd({ meal_type: slot.key, name: form.name.trim(), description: form.description||undefined, time: form.time||undefined, calories: form.calories ? parseInt(form.calories) : undefined, date, completed: false });
    setForm({ name:"", description:"", time: slot.defaultTime, calories:"" });
    setAdding(false);
  }

  async function handleEdit(id: string) {
    await onUpdate(id, { name: editForm.name.trim(), description: editForm.description||undefined, time: editForm.time||undefined, calories: editForm.calories ? parseInt(editForm.calories) : undefined });
    setEditingId(null);
  }

  function startEdit(meal: Meal) {
    setEditForm({ name: meal.name, description: meal.description||"", time: meal.time||"", calories: meal.calories?.toString()||"" });
    setEditingId(meal.id);
  }

  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${allDone ? "rgba(46,213,115,0.3)" : slot.border}`, background: allDone ? "rgba(46,213,115,0.04)" : slot.color, transition: "all 0.3s ease" }}>
      {/* Header */}
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3" style={{ background: "transparent" }}>
        <span style={{ fontSize: "1.25rem" }}>{slot.emoji}</span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: allDone ? "var(--success)" : "#fff" }}>{slot.label}</span>
            {allDone && <span style={{ fontSize: 10, color: "var(--success)" }}>✓ Done</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
              {formatTime(slot.defaultTime)}
            </span>
            {slotMeals.length > 0 && (
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {slotMeals.length} item{slotMeals.length!==1?"s":""}
                {totalCals > 0 && ` · ${totalCals} kcal`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); setAdding(true); setOpen(true); }}
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(232,197,71,0.15)", color: "var(--accent)" }}>
            <Plus size={12} />
          </button>
          {open ? <ChevronUp size={14} style={{ color: "var(--muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--muted)" }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 animate-slide-down">
          {/* Meal items */}
          {slotMeals.map(meal => (
            <div key={meal.id} className="rounded-lg p-3" style={{ background: "rgba(10,10,15,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {editingId === meal.id ? (
                <div className="space-y-2">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({...f, name:e.target.value}))} className="input-field text-sm" style={{padding:"0.4rem 0.6rem"}} placeholder="Meal name" autoFocus />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="time" value={editForm.time} onChange={e => setEditForm(f => ({...f, time:e.target.value}))} className="input-field text-xs" style={{padding:"0.4rem 0.6rem", colorScheme:"dark"}} />
                    <input type="number" value={editForm.calories} onChange={e => setEditForm(f => ({...f, calories:e.target.value}))} className="input-field text-xs" style={{padding:"0.4rem 0.6rem"}} placeholder="kcal" />
                  </div>
                  <input value={editForm.description} onChange={e => setEditForm(f => ({...f, description:e.target.value}))} className="input-field text-xs" style={{padding:"0.4rem 0.6rem"}} placeholder="Notes (optional)" />
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(meal.id)} className="btn-primary text-xs py-1 px-3 flex items-center gap-1"><Check size={11}/>Save</button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost text-xs py-1 px-3"><X size={11}/></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => onUpdate(meal.id, { completed: !meal.completed })}
                    className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                    style={{ background: meal.completed ? "var(--success)" : "transparent", border: `2px solid ${meal.completed ? "var(--success)" : "var(--border)"}` }}>
                    {meal.completed && <Check size={10} style={{ color: "#0a0a0f" }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm" style={{ color: meal.completed ? "var(--muted)" : "var(--soft)", textDecoration: meal.completed ? "line-through" : "none" }}>{meal.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {meal.time && <span className="text-xs flex items-center gap-1" style={{color:"var(--muted)"}}><Clock size={9}/>{formatTime(meal.time)}</span>}
                      {meal.calories && <span className="text-xs flex items-center gap-1" style={{color:"var(--muted)"}}><Flame size={9}/>{meal.calories} kcal</span>}
                      {meal.description && <span className="text-xs" style={{color:"var(--muted)"}}>{meal.description}</span>}
                    </div>
                  </div>
                  <button onClick={() => startEdit(meal)} className="p-1 rounded hover:bg-white/5" style={{color:"var(--muted)"}}><Pencil size={12}/></button>
                  <button onClick={() => onDelete(meal.id)} className="p-1 rounded hover:bg-red-500/10" style={{color:"var(--muted)"}}><Trash2 size={12}/></button>
                </div>
              )}
            </div>
          ))}

          {slotMeals.length === 0 && !adding && (
            <p className="text-xs text-center py-2" style={{color:"var(--muted)"}}>No items — tap + to add</p>
          )}

          {/* Add form */}
          {adding && (
            <div className="rounded-lg p-3 animate-slide-down" style={{ background: "rgba(10,10,15,0.6)", border: "1px solid rgba(232,197,71,0.2)" }}>
              <input value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} className="input-field text-sm mb-2" style={{padding:"0.4rem 0.6rem"}} placeholder="What are you eating?" autoFocus onKeyDown={e => e.key === "Enter" && handleAdd()} />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs mb-1 block" style={{color:"var(--muted)"}}>Time</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({...f, time:e.target.value}))} className="input-field text-xs" style={{padding:"0.4rem 0.6rem", colorScheme:"dark"}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:"var(--muted)"}}>Calories (optional)</label>
                  <input type="number" value={form.calories} onChange={e => setForm(f => ({...f, calories:e.target.value}))} className="input-field text-xs" style={{padding:"0.4rem 0.6rem"}} placeholder="kcal" />
                </div>
              </div>
              <input value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} className="input-field text-xs mb-2" style={{padding:"0.4rem 0.6rem"}} placeholder="Notes (optional)" />
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={!form.name.trim()} className="btn-primary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1"><Plus size={11}/>Add</button>
                <button onClick={() => setAdding(false)} className="btn-ghost text-xs py-1.5 px-3"><X size={11}/></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Meals({ meals, selectedDate, onAdd, onUpdate, onDelete }: Props) {
  const date = selectedDate || new Date().toISOString().split("T")[0];
  const totalCals = meals.filter(m => m.date === date).reduce((s, m) => s + (m.calories || 0), 0);

  return (
    <div className="pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>Meals</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {selectedDate ? new Date(selectedDate+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}) : "Today"}
            {totalCals > 0 && <span> · <span style={{color:"var(--accent)"}}>{totalCals} kcal total</span></span>}
          </p>
        </div>
      </div>

      {MEAL_SLOTS.map(slot => (
        <MealSlot key={slot.key} slot={slot} meals={meals.filter(m => m.date === date)} date={date} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
}
