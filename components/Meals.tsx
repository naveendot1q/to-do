"use client";

import { useState } from "react";
import { Plus, Check, Trash2, Pencil, X, Clock, Flame, ChevronDown, ChevronUp, Zap, Beef, Wheat, Droplets } from "lucide-react";
import { Meal, MealType, MealFood } from "@/lib/types";

interface Props {
  meals: Meal[];
  selectedDate: string | null;
  onAdd: (meal: Omit<Meal, "id" | "user_id" | "created_at">) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Meal>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const MEAL_SLOTS: { key: MealType; label: string; emoji: string; defaultTime: string; color: string; border: string }[] = [
  { key: "pre_breakfast", label: "Pre-Breakfast",          emoji: "🌅", defaultTime: "06:30", color: "rgba(255,165,2,0.08)",   border: "rgba(255,165,2,0.2)" },
  { key: "breakfast",     label: "Breakfast",              emoji: "🍳", defaultTime: "08:00", color: "rgba(232,197,71,0.08)",  border: "rgba(232,197,71,0.2)" },
  { key: "lunch",         label: "Lunch",                  emoji: "🍱", defaultTime: "13:00", color: "rgba(46,213,115,0.08)",  border: "rgba(46,213,115,0.2)" },
  { key: "evening_snack", label: "After Gym / Eve Snack",  emoji: "💪", defaultTime: "17:30", color: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.2)" },
  { key: "dinner",        label: "Dinner",                 emoji: "🌙", defaultTime: "20:00", color: "rgba(71,130,232,0.08)",  border: "rgba(71,130,232,0.2)" },
  { key: "snack",         label: "Snack",                  emoji: "🥜", defaultTime: "15:00", color: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
];

// Common Indian foods with nutrition per 100g
const FOOD_DATABASE: Record<string, Omit<MealFood, "name" | "quantity" | "unit">> = {
  "Rice (cooked)":      { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, fiber: 0.4 },
  "Chapati":            { calories: 297, protein: 9.1, carbs: 52, fats: 5.6, fiber: 1.2 },
  "Dal (cooked)":       { calories: 116, protein: 9,   carbs: 20, fats: 0.4, fiber: 3.6 },
  "Paneer":             { calories: 265, protein: 18.3,carbs: 1.2,fats: 20.8,fiber: 0 },
  "Chicken Breast":     { calories: 165, protein: 31,  carbs: 0,  fats: 3.6, fiber: 0 },
  "Whole Egg":          { calories: 155, protein: 13,  carbs: 1.1,fats: 11,  fiber: 0 },
  "Egg White":          { calories: 52,  protein: 11,  carbs: 0.7,fats: 0.2, fiber: 0 },
  "Oats":               { calories: 389, protein: 17,  carbs: 66, fats: 7,   fiber: 10.6 },
  "Banana":             { calories: 89,  protein: 1.1, carbs: 23, fats: 0.3, fiber: 2.6 },
  "Apple":              { calories: 52,  protein: 0.3, carbs: 14, fats: 0.2, fiber: 2.4 },
  "Milk (full fat)":    { calories: 61,  protein: 3.2, carbs: 4.8,fats: 3.3, fiber: 0 },
  "Curd / Yogurt":      { calories: 98,  protein: 11,  carbs: 3.4,fats: 4.3, fiber: 0 },
  "Whey Protein (scoop)":{ calories: 120, protein: 24, carbs: 3,  fats: 2,   fiber: 0 },
  "Peanut Butter":      { calories: 588, protein: 25,  carbs: 20, fats: 50,  fiber: 6 },
  "Almonds":            { calories: 579, protein: 21,  carbs: 22, fats: 50,  fiber: 12.5 },
  "Brown Rice (cooked)":{ calories: 122, protein: 2.7, carbs: 26, fats: 0.9, fiber: 1.8 },
  "Sweet Potato":       { calories: 86,  protein: 1.6, carbs: 20, fats: 0.1, fiber: 3 },
  "Tuna (canned)":      { calories: 116, protein: 26,  carbs: 0,  fats: 1,   fiber: 0 },
  "Soybean / Soya":     { calories: 446, protein: 36,  carbs: 30, fats: 20,  fiber: 9.3 },
};

const UNITS = ["g", "ml", "piece", "scoop", "cup", "bowl", "tbsp"];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function MacroBadge({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <div className="flex items-center gap-1">
      <Icon size={9} style={{ color }} />
      <span className="text-xs" style={{ color, fontFamily: "'JetBrains Mono',monospace" }}>{Math.round(value)}{label === "kcal" ? "" : "g"}</span>
      <span className="text-xs" style={{ color: "var(--muted)", fontSize: "10px" }}>{label}</span>
    </div>
  );
}

function FoodEntry({ food, onRemove }: { food: MealFood; onRemove: () => void }) {
  const factor = food.quantity / 100;
  const cal = Math.round(food.calories * factor);
  const prot = Math.round(food.protein * factor * 10) / 10;
  const carb = Math.round(food.carbs * factor * 10) / 10;
  const fat = Math.round(food.fats * factor * 10) / 10;

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--soft)" }}>{food.name}</span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{food.quantity}{food.unit}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>{cal} kcal</span>
          <span className="text-xs" style={{ color: "#ff6b7a", fontFamily: "'JetBrains Mono',monospace" }}>{prot}g P</span>
          <span className="text-xs" style={{ color: "#ffa502", fontFamily: "'JetBrains Mono',monospace" }}>{carb}g C</span>
          <span className="text-xs" style={{ color: "#2ed573", fontFamily: "'JetBrains Mono',monospace" }}>{fat}g F</span>
        </div>
      </div>
      <button onClick={onRemove} className="p-1 rounded" style={{ color: "var(--muted)" }}><X size={11} /></button>
    </div>
  );
}

function AddFoodForm({ onAdd, onClose }: { onAdd: (food: MealFood) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState({ name: "", calories: "", protein: "", carbs: "", fats: "", fiber: "" });
  const [qty, setQty] = useState("100");
  const [unit, setUnit] = useState("g");
  const [tab, setTab] = useState<"search" | "custom">("search");

  const filtered = Object.keys(FOOD_DATABASE).filter(f => f.toLowerCase().includes(search.toLowerCase()));
  const dbEntry = selected ? FOOD_DATABASE[selected] : null;

  function addFromDB() {
    if (!dbEntry || !selected) return;
    const factor = parseFloat(qty) / 100;
    onAdd({
      name: selected,
      quantity: parseFloat(qty),
      unit,
      calories: dbEntry.calories,
      protein: dbEntry.protein,
      carbs: dbEntry.carbs,
      fats: dbEntry.fats,
      fiber: dbEntry.fiber,
    });
    onClose();
  }

  function addCustom() {
    if (!custom.name.trim()) return;
    onAdd({
      name: custom.name.trim(),
      quantity: parseFloat(qty) || 100,
      unit,
      calories: parseFloat(custom.calories) || 0,
      protein: parseFloat(custom.protein) || 0,
      carbs: parseFloat(custom.carbs) || 0,
      fats: parseFloat(custom.fats) || 0,
      fiber: parseFloat(custom.fiber) || 0,
    });
    onClose();
  }

  return (
    <div className="rounded-xl p-4 mb-2 animate-slide-down" style={{ background: "rgba(10,10,15,0.95)", border: "1px solid rgba(232,197,71,0.2)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "#fff" }}>Add Food</span>
        <button onClick={onClose} style={{ color: "var(--muted)" }}><X size={14} /></button>
      </div>
      {/* Tabs */}
      <div className="flex gap-1 p-0.5 rounded-lg mb-3" style={{ background: "rgba(26,26,36,0.8)" }}>
        {(["search", "custom"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-md text-xs font-medium capitalize"
            style={{ background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "#0a0a0f" : "var(--muted)" }}>
            {t === "search" ? "🔍 Food DB" : "✏️ Custom"}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field text-sm mb-2" style={{ padding: "0.4rem 0.7rem" }} placeholder="Search food (e.g. chicken, rice...)" autoFocus />
          <div className="max-h-36 overflow-y-auto space-y-1 mb-3">
            {filtered.map(f => (
              <button key={f} onClick={() => setSelected(f)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs"
                style={{ background: selected === f ? "rgba(232,197,71,0.12)" : "rgba(255,255,255,0.03)", color: selected === f ? "var(--accent)" : "var(--soft)", border: selected === f ? "1px solid rgba(232,197,71,0.25)" : "1px solid transparent" }}>
                <span className="font-medium">{f}</span>
                {FOOD_DATABASE[f] && (
                  <span className="ml-2" style={{ color: "var(--muted)" }}>
                    {FOOD_DATABASE[f].calories}kcal · {FOOD_DATABASE[f].protein}g P (per 100g)
                  </span>
                )}
              </button>
            ))}
          </div>
          {selected && dbEntry && (
            <div className="rounded-lg p-2 mb-3" style={{ background: "rgba(232,197,71,0.06)", border: "1px solid rgba(232,197,71,0.15)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>{selected} (per 100g)</p>
              <div className="flex gap-3 flex-wrap">
                <span className="text-xs" style={{ color: "var(--muted)" }}>{dbEntry.calories} kcal · {dbEntry.protein}g protein · {dbEntry.carbs}g carbs · {dbEntry.fats}g fats</span>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "custom" && (
        <div className="space-y-2 mb-3">
          <input value={custom.name} onChange={e => setCustom(c => ({ ...c, name: e.target.value }))} className="input-field text-sm" style={{ padding: "0.4rem 0.7rem" }} placeholder="Food name" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>Calories (per 100g)</label>
              <input type="number" value={custom.calories} onChange={e => setCustom(c => ({ ...c, calories: e.target.value }))} className="input-field text-xs" style={{ padding: "0.35rem 0.5rem" }} placeholder="kcal" /></div>
            <div><label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>Protein (g)</label>
              <input type="number" value={custom.protein} onChange={e => setCustom(c => ({ ...c, protein: e.target.value }))} className="input-field text-xs" style={{ padding: "0.35rem 0.5rem" }} placeholder="g" /></div>
            <div><label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>Carbs (g)</label>
              <input type="number" value={custom.carbs} onChange={e => setCustom(c => ({ ...c, carbs: e.target.value }))} className="input-field text-xs" style={{ padding: "0.35rem 0.5rem" }} placeholder="g" /></div>
            <div><label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>Fats (g)</label>
              <input type="number" value={custom.fats} onChange={e => setCustom(c => ({ ...c, fats: e.target.value }))} className="input-field text-xs" style={{ padding: "0.35rem 0.5rem" }} placeholder="g" /></div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="input-field text-xs" style={{ padding: "0.35rem 0.5rem", width: "70px" }} placeholder="qty" />
        <select value={unit} onChange={e => setUnit(e.target.value)} className="input-field text-xs" style={{ padding: "0.35rem 0.5rem", width: "auto" }}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <button onClick={tab === "search" ? addFromDB : addCustom}
        disabled={tab === "search" ? !selected : !custom.name.trim()}
        className="btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2">
        <Plus size={13} /> Add to Meal
      </button>
    </div>
  );
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
  const [addingFood, setAddingFood] = useState<string | null>(null); // meal id
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", time: slot.defaultTime });
  const [editForm, setEditForm] = useState({ name: "", time: "" });

  const slotMeals = meals.filter(m => m.meal_type === slot.key);
  const allDone = slotMeals.length > 0 && slotMeals.every(m => m.completed);

  // Aggregate macros
  const totals = slotMeals.reduce((acc, m) => {
    const foods = m.foods || [];
    const factor = foods.reduce((s, f) => ({ cal: s.cal + f.calories * f.quantity / 100, prot: s.prot + f.protein * f.quantity / 100, carb: s.carb + f.carbs * f.quantity / 100, fat: s.fat + f.fats * f.quantity / 100 }), { cal: 0, prot: 0, carb: 0, fat: 0 });
    return { cal: acc.cal + (factor.cal || m.calories || 0), prot: acc.prot + (factor.prot || m.protein || 0), carb: acc.carb + (factor.carb || m.carbs || 0), fat: acc.fat + (factor.fat || m.fats || 0) };
  }, { cal: 0, prot: 0, carb: 0, fat: 0 });

  async function handleAdd() {
    if (!form.name.trim()) return;
    await onAdd({ meal_type: slot.key, name: form.name.trim(), time: form.time || undefined, date, completed: false, foods: [] });
    setForm({ name: "", time: slot.defaultTime });
    setAdding(false);
  }

  async function handleEdit(id: string) {
    await onUpdate(id, { name: editForm.name.trim(), time: editForm.time || undefined });
    setEditingId(null);
  }

  function addFoodToMeal(mealId: string, food: MealFood) {
    const meal = slotMeals.find(m => m.id === mealId);
    if (!meal) return;
    const foods = [...(meal.foods || []), food];
    const totals = foods.reduce((a, f) => ({ cal: a.cal + f.calories * f.quantity / 100, prot: a.prot + f.protein * f.quantity / 100, carb: a.carb + f.carbs * f.quantity / 100, fat: a.fat + f.fats * f.quantity / 100 }), { cal: 0, prot: 0, carb: 0, fat: 0 });
    onUpdate(mealId, { foods, calories: Math.round(totals.cal), protein: Math.round(totals.prot * 10) / 10, carbs: Math.round(totals.carb * 10) / 10, fats: Math.round(totals.fat * 10) / 10 });
    setAddingFood(null);
  }

  function removeFoodFromMeal(mealId: string, foodIdx: number) {
    const meal = slotMeals.find(m => m.id === mealId);
    if (!meal) return;
    const foods = (meal.foods || []).filter((_, i) => i !== foodIdx);
    const totals = foods.reduce((a, f) => ({ cal: a.cal + f.calories * f.quantity / 100, prot: a.prot + f.protein * f.quantity / 100, carb: a.carb + f.carbs * f.quantity / 100, fat: a.fat + f.fats * f.quantity / 100 }), { cal: 0, prot: 0, carb: 0, fat: 0 });
    onUpdate(mealId, { foods, calories: Math.round(totals.cal), protein: Math.round(totals.prot * 10) / 10, carbs: Math.round(totals.carb * 10) / 10, fats: Math.round(totals.fat * 10) / 10 });
  }

  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${allDone ? "rgba(46,213,115,0.3)" : slot.border}`, background: allDone ? "rgba(46,213,115,0.04)" : slot.color, transition: "all 0.3s ease" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3" style={{ background: "transparent" }}>
        <span style={{ fontSize: "1.2rem" }}>{slot.emoji}</span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: allDone ? "var(--success)" : "#fff" }}>{slot.label}</span>
            {allDone && <span style={{ fontSize: 10, color: "var(--success)" }}>✓</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{formatTime(slot.defaultTime)}</span>
            {slotMeals.length > 0 && totals.cal > 0 && (
              <>
                <span className="text-xs" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>{Math.round(totals.cal)} kcal</span>
                <span className="text-xs" style={{ color: "#ff6b7a", fontFamily: "'JetBrains Mono',monospace" }}>{Math.round(totals.prot)}g P</span>
                <span className="text-xs" style={{ color: "#ffa502", fontFamily: "'JetBrains Mono',monospace" }}>{Math.round(totals.carb)}g C</span>
                <span className="text-xs" style={{ color: "#2ed573", fontFamily: "'JetBrains Mono',monospace" }}>{Math.round(totals.fat)}g F</span>
              </>
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
          {slotMeals.map(meal => (
            <div key={meal.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(10,10,15,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {editingId === meal.id ? (
                <div className="p-3 space-y-2">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" style={{ padding: "0.4rem 0.6rem" }} placeholder="Meal name" autoFocus />
                  <div className="flex gap-2">
                    <input type="time" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} className="input-field text-xs" style={{ padding: "0.35rem 0.5rem", colorScheme: "dark" }} />
                    <button onClick={() => handleEdit(meal.id)} className="btn-primary text-xs py-1 px-3 flex items-center gap-1"><Check size={11} />Save</button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost text-xs py-1 px-3"><X size={11} /></button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 p-3">
                    <button onClick={() => onUpdate(meal.id, { completed: !meal.completed })}
                      className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                      style={{ background: meal.completed ? "var(--success)" : "transparent", border: `2px solid ${meal.completed ? "var(--success)" : "var(--border)"}` }}>
                      {meal.completed && <Check size={10} style={{ color: "#0a0a0f" }} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium" style={{ color: meal.completed ? "var(--muted)" : "#fff", textDecoration: meal.completed ? "line-through" : "none" }}>{meal.name}</span>
                      {meal.time && <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>{formatTime(meal.time)}</span>}
                      {/* Macro summary for this meal */}
                      {meal.calories && meal.calories > 0 && (
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>{meal.calories} kcal</span>
                          {meal.protein && <span className="text-xs" style={{ color: "#ff6b7a" }}>{meal.protein}g P</span>}
                          {meal.carbs && <span className="text-xs" style={{ color: "#ffa502" }}>{meal.carbs}g C</span>}
                          {meal.fats && <span className="text-xs" style={{ color: "#2ed573" }}>{meal.fats}g F</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditForm({ name: meal.name, time: meal.time || "" }); setEditingId(meal.id); }} className="p-1 rounded" style={{ color: "var(--muted)" }}><Pencil size={12} /></button>
                      <button onClick={() => onDelete(meal.id)} className="p-1 rounded" style={{ color: "var(--muted)" }}><Trash2 size={12} /></button>
                    </div>
                  </div>

                  {/* Food items */}
                  {(meal.foods || []).length > 0 && (
                    <div className="px-3 pb-2 space-y-1">
                      {(meal.foods || []).map((food, idx) => (
                        <FoodEntry key={idx} food={food} onRemove={() => removeFoodFromMeal(meal.id, idx)} />
                      ))}
                    </div>
                  )}

                  {/* Add food to this meal */}
                  {addingFood === meal.id && (
                    <div className="px-3 pb-3">
                      <AddFoodForm onAdd={f => addFoodToMeal(meal.id, f)} onClose={() => setAddingFood(null)} />
                    </div>
                  )}
                  <button onClick={() => setAddingFood(addingFood === meal.id ? null : meal.id)}
                    className="w-full py-1.5 text-xs flex items-center justify-center gap-1"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.04)", color: "var(--muted)" }}>
                    <Plus size={10} /> {addingFood === meal.id ? "Cancel" : "Add Food & Track Macros"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {slotMeals.length === 0 && !adding && (
            <p className="text-xs text-center py-2" style={{ color: "var(--muted)" }}>No items — tap + to add</p>
          )}

          {adding && (
            <div className="rounded-lg p-3 animate-slide-down" style={{ background: "rgba(10,10,15,0.6)", border: "1px solid rgba(232,197,71,0.2)" }}>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm mb-2" style={{ padding: "0.4rem 0.6rem" }} placeholder="Meal name (e.g. Oats + Banana)" autoFocus onKeyDown={e => e.key === "Enter" && handleAdd()} />
              <div className="flex gap-2">
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="input-field text-xs flex-1" style={{ padding: "0.4rem 0.6rem", colorScheme: "dark" }} />
                <button onClick={handleAdd} disabled={!form.name.trim()} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"><Plus size={11} />Add</button>
                <button onClick={() => setAdding(false)} className="btn-ghost text-xs py-1.5 px-3"><X size={11} /></button>
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
  const dateMeals = meals.filter(m => m.date === date);

  // Daily totals
  const daily = dateMeals.reduce((acc, m) => {
    const foods = m.foods || [];
    if (foods.length > 0) {
      const ft = foods.reduce((s, f) => ({ cal: s.cal + f.calories * f.quantity / 100, prot: s.prot + f.protein * f.quantity / 100, carb: s.carb + f.carbs * f.quantity / 100, fat: s.fat + f.fats * f.quantity / 100 }), { cal: 0, prot: 0, carb: 0, fat: 0 });
      return { cal: acc.cal + ft.cal, prot: acc.prot + ft.prot, carb: acc.carb + ft.carb, fat: acc.fat + ft.fat };
    }
    return { cal: acc.cal + (m.calories || 0), prot: acc.prot + (m.protein || 0), carb: acc.carb + (m.carbs || 0), fat: acc.fat + (m.fats || 0) };
  }, { cal: 0, prot: 0, carb: 0, fat: 0 });

  // Goal: 2500 kcal, 150g protein
  const calGoal = 2500;
  const protGoal = 150;

  return (
    <div className="pb-20 animate-fade-in">
      <div className="mb-4">
        <h2 className="text-base font-semibold" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>Nutrition</h2>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Today"}
        </p>
      </div>

      {/* Daily Macro Summary */}
      {daily.cal > 0 && (
        <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(26,26,36,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>DAILY TOTALS</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "Calories", value: Math.round(daily.cal), unit: "kcal", goal: calGoal, color: "var(--accent)", icon: Flame },
              { label: "Protein",  value: Math.round(daily.prot * 10) / 10, unit: "g", goal: protGoal, color: "#ff6b7a", icon: Beef },
              { label: "Carbs",    value: Math.round(daily.carb * 10) / 10, unit: "g", goal: null, color: "#ffa502", icon: Wheat },
              { label: "Fats",     value: Math.round(daily.fat * 10) / 10, unit: "g", goal: null, color: "#2ed573", icon: Droplets },
            ].map(({ label, value, unit: u, goal, color, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="rounded-xl p-2" style={{ background: `${color}10` }}>
                  <Icon size={12} className="mx-auto mb-1" style={{ color }} />
                  <p className="text-sm font-bold" style={{ color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</p>
                  <p className="text-xs" style={{ color: "var(--muted)", fontSize: "10px" }}>{u}</p>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--muted)", fontSize: "10px" }}>{label}</p>
                {goal && (
                  <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / goal) * 100)}%`, background: color, transition: "width 0.5s ease" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Calorie goal: {calGoal} kcal</span>
            <span className="text-xs" style={{ color: daily.cal >= calGoal ? "var(--success)" : "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>
              {daily.cal >= calGoal ? "✓ Goal met" : `${calGoal - Math.round(daily.cal)} kcal to go`}
            </span>
          </div>
        </div>
      )}

      {MEAL_SLOTS.map(slot => (
        <MealSlot key={slot.key} slot={slot} meals={dateMeals} date={date} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
}
