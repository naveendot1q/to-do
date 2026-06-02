"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Dumbbell, TrendingUp, X, Scale, Timer, Pencil, RotateCcw, Copy, Save } from "lucide-react";
import { GymSession, Exercise, ExerciseSet, WorkoutSplit, ExerciseCategory, BodyWeightLog } from "@/lib/types";

interface Props {
  sessions: GymSession[];
  bodyWeightLogs: BodyWeightLog[];
  selectedDate: string | null;
  onAdd: (session: Omit<GymSession, "id" | "user_id" | "created_at">) => Promise<void>;
  onUpdate: (id: string, updates: Partial<GymSession>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddWeight: (log: Omit<BodyWeightLog, "id" | "user_id" | "created_at">) => Promise<void>;
  onUpdateWeight: (id: string, updates: Partial<BodyWeightLog>) => Promise<void>;
}

const SPLITS: { key: WorkoutSplit; label: string; short: string; muscles: string; color: string }[] = [
  { key: "chest_triceps_abs",    label: "Chest + Triceps + Abs",     short: "PUSH", muscles: "Chest · Triceps · Core",           color: "#ff4757" },
  { key: "back_biceps_abs",      label: "Back + Biceps + Abs",       short: "PULL", muscles: "Back · Biceps · Forearms · Core",  color: "#2ed573" },
  { key: "legs_shoulders_cardio",label: "Legs + Shoulders + Cardio", short: "LEGS", muscles: "Legs · Delts · Cardio",             color: "#a78bfa" },
  { key: "custom",               label: "Custom Workout",            short: "CUSTOM",muscles: "Your choice",                      color: "#e8c547" },
];

// ── PRE-LOADED WORKOUTS FROM GURUJI ──────────────────────────────────────────
// Each exercise: name, category, defaultSets, defaultReps, notes, is_timed
const PRESET_WORKOUTS: Record<WorkoutSplit, { name: string; category: ExerciseCategory; sets: number; reps: number; repsNote?: string; notes?: string; is_timed?: boolean; duration_seconds?: number }[]> = {
  chest_triceps_abs: [
    // Chest
    { name: "Flat Bench Press",         category: "chest",   sets: 4, reps: 10, repsNote: "8–12",  notes: "Heavy load, full ROM" },
    { name: "Incline Bench Press",      category: "chest",   sets: 4, reps: 10, repsNote: "8–12",  notes: "Barbell or dumbbells" },
    { name: "Cable Crossovers",         category: "chest",   sets: 4, reps: 14, repsNote: "12–16", notes: "Or Dumbbell Flyes — isolate chest" },
    { name: "Parallel Bar Dips",        category: "chest",   sets: 4, reps: 0,  repsNote: "Max",   notes: "Bodyweight max reps; replace with Decline Bench if needed" },
    { name: "Push-Ups",                 category: "chest",   sets: 3, reps: 0,  repsNote: "Max",   notes: "At the very end to fully exhaust chest" },
    // Triceps (already ~50% pre-exhausted)
    { name: "Pulley Push Downs",        category: "triceps", sets: 2, reps: 14, repsNote: "12–16", notes: "Controlled squeeze at bottom" },
    { name: "Close Grip Bench Press",   category: "triceps", sets: 2, reps: 10, repsNote: "8–12",  notes: "Block on chest for constant tension" },
    { name: "Triceps Bench Dips",       category: "triceps", sets: 3, reps: 0,  repsNote: "Max",   notes: "Full stretch at bottom, hard lock-out at top" },
    // Abs / Cardio optional
    { name: "Cardio (optional)",        category: "cardio",  sets: 1, reps: 0,  repsNote: "20–30 min", notes: "After weights if time allows", is_timed: true, duration_seconds: 1200 },
  ],
  back_biceps_abs: [
    // Back
    { name: "Lat Pull Downs (Wide Grip)",  category: "back",     sets: 4, reps: 10, repsNote: "8–12",  notes: "Front wide grip, target lats" },
    { name: "Barbell Bent-Over Rows",      category: "back",     sets: 4, reps: 10, repsNote: "8–12",  notes: "Grip slightly wider than shoulder-width" },
    { name: "Seated Rowing",               category: "back",     sets: 4, reps: 10, repsNote: "8–12",  notes: "Full stretch, row to abdomen" },
    { name: "T-Bar Rows",                  category: "back",     sets: 4, reps: 10, repsNote: "8–12",  notes: "Neutral grip, squeeze at top" },
    { name: "Barbell Shrugs",              category: "back",     sets: 4, reps: 10, repsNote: "8–12",  notes: "Targets traps — hold at top" },
    { name: "Deadlift",                    category: "back",     sets: 4, reps: 10, repsNote: "8–12",  notes: "For volume: end of session. For strength: 1–3 heavy reps at start" },
    // Biceps & Forearms (partially pre-exhausted)
    { name: "Preacher Curls",             category: "biceps",   sets: 2, reps: 10, repsNote: "8–12",  notes: "Full ROM, controlled negative" },
    { name: "Dumbbell Curls",             category: "biceps",   sets: 2, reps: 10, repsNote: "8–12",  notes: "Alternate or simultaneous" },
    { name: "Barbell Curls",              category: "biceps",   sets: 2, reps: 10, repsNote: "8–12",  notes: "Strict form — no swinging" },
    { name: "Hammer Curls",               category: "biceps",   sets: 2, reps: 10, repsNote: "8–12",  notes: "Neutral grip for brachialis" },
    { name: "Wrist Barbell Curls",        category: "forearms", sets: 4, reps: 0,  repsNote: "Max",   notes: "Moderate weight until failure" },
    { name: "Reverse Curls",              category: "forearms", sets: 4, reps: 10, repsNote: "8–12",  notes: "Overhand grip for forearm extensors" },
  ],
  legs_shoulders_cardio: [
    // Shoulders — Day A: Side & Lateral focus
    { name: "Single Arm Cable Lateral Raise", category: "shoulders", sets: 4, reps: 14, repsNote: "12–16", notes: "Activate side delts first" },
    { name: "Overhead Dumbbell Press",        category: "shoulders", sets: 4, reps: 10, repsNote: "8–12",  notes: "Most important — use max weight you can handle" },
    { name: "Dumbbell Side Raises",           category: "shoulders", sets: 4, reps: 14, repsNote: "12–16", notes: "Controlled, no momentum" },
    { name: "Upright Rows (Partial)",         category: "shoulders", sets: 4, reps: 12, repsNote: "10–14", notes: "Partial ROM only — keeps tension on lateral/front delts, not traps" },
    // Legs — Day A: Quad focus
    { name: "Leg Extensions",  category: "legs", sets: 2, reps: 14, repsNote: "12–16", notes: "Activation before heavy lifts" },
    { name: "Weighted Squats", category: "legs", sets: 4, reps: 8,  repsNote: "6–10",  notes: "Final set: drop set — remove one plate at a time to failure" },
    { name: "Leg Press",       category: "legs", sets: 4, reps: 10, repsNote: "8–12",  notes: "" },
    { name: "Dumbbell Squats (Close Stance)", category: "legs", sets: 4, reps: 10, repsNote: "8–12", notes: "Close stance = max quad load. Advanced: sub with Front Barbell Squats" },
    { name: "Front Lunges",    category: "legs", sets: 3, reps: 12, repsNote: "10–14", notes: "Dumbbells, finish and fully exhaust quads" },
  ],
  custom: [],
};

// Timed exercises that should default to duration mode
const TIMED_EXERCISE_NAMES = ["Plank", "Cardio", "Treadmill", "Cycling", "Jump Rope", "HIIT", "Run", "Stair Climber", "Rowing Machine", "Kapalbhati"];

const EXERCISE_TEMPLATES: Record<ExerciseCategory, { name: string; is_timed?: boolean }[]> = {
  chest:    [{ name: "Bench Press" }, { name: "Incline Bench Press" }, { name: "Decline Bench Press" }, { name: "Cable Crossovers" }, { name: "Dumbbell Flyes" }, { name: "Push-Ups" }, { name: "Parallel Bar Dips" }],
  triceps:  [{ name: "Pulley Push Downs" }, { name: "Close Grip Bench Press" }, { name: "Skull Crushers" }, { name: "Overhead Extension" }, { name: "Triceps Bench Dips" }, { name: "Tricep Kickbacks" }],
  abs:      [{ name: "Crunches" }, { name: "Plank", is_timed: true }, { name: "Leg Raises" }, { name: "Russian Twists" }, { name: "Cable Crunches" }, { name: "Ab Wheel" }, { name: "Mountain Climbers", is_timed: true }],
  back:     [{ name: "Lat Pull Downs (Wide Grip)" }, { name: "Barbell Bent-Over Rows" }, { name: "Seated Rowing" }, { name: "T-Bar Rows" }, { name: "Barbell Shrugs" }, { name: "Deadlift" }, { name: "Face Pulls" }, { name: "Pull-Ups" }],
  biceps:   [{ name: "Preacher Curls" }, { name: "Dumbbell Curls" }, { name: "Barbell Curls" }, { name: "Hammer Curls" }, { name: "Cable Curl" }, { name: "Concentration Curl" }],
  forearms: [{ name: "Wrist Barbell Curls" }, { name: "Reverse Curls" }, { name: "Farmer's Walk", is_timed: true }],
  shoulders:[{ name: "Overhead Barbell Press" }, { name: "Overhead Dumbbell Press" }, { name: "Single Arm Cable Lateral Raise" }, { name: "Dumbbell Side Raises" }, { name: "Upright Rows (Partial)" }, { name: "Front Raises" }, { name: "Face Pulls" }, { name: "Bent-Over Lateral Raises" }],
  legs:     [{ name: "Weighted Squats" }, { name: "Leg Press" }, { name: "Leg Extensions" }, { name: "Leg Curls" }, { name: "Romanian Deadlift" }, { name: "Stiff-Leg Deadlifts" }, { name: "Front Lunges" }, { name: "Hip Thrusts" }, { name: "Wide-Stance Squats" }, { name: "Calf Raises" }, { name: "Dumbbell Squats (Close Stance)" }],
  cardio:   [{ name: "Treadmill Run", is_timed: true }, { name: "Cycling", is_timed: true }, { name: "Jump Rope", is_timed: true }, { name: "Rowing Machine", is_timed: true }, { name: "Stair Climber", is_timed: true }, { name: "HIIT", is_timed: true }],
  compound: [{ name: "Deadlift" }, { name: "Weighted Squats" }, { name: "Bench Press" }, { name: "Overhead Press" }, { name: "Pull-Ups" }],
};

const SPLIT_CATEGORIES: Record<WorkoutSplit, ExerciseCategory[]> = {
  chest_triceps_abs:     ["chest", "triceps", "abs", "cardio"],
  back_biceps_abs:       ["back", "biceps", "forearms", "abs"],
  legs_shoulders_cardio: ["legs", "shoulders", "cardio"],
  custom:                ["compound", "chest", "back", "legs", "shoulders", "biceps", "triceps", "forearms", "abs", "cardio"],
};

function uid() { return Math.random().toString(36).slice(2, 9); }
function fmtDuration(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60 > 0 ? ` ${s % 60}s` : ""}`;
}

function calcVolume(exercises: Exercise[]) {
  return exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((s, set) => s + (set.completed && !ex.is_timed ? set.weight * set.reps : 0), 0);
  }, 0);
}

function buildPresetExercises(split: WorkoutSplit): Exercise[] {
  return (PRESET_WORKOUTS[split] || []).map((p, i) => ({
    id: uid(),
    name: p.name,
    category: p.category,
    order: i,
    is_timed: p.is_timed || false,
    notes: p.notes || "",
    sets: Array.from({ length: p.sets }, (_, si) => ({
      set_number: si + 1,
      weight: 0,
      reps: p.reps,
      duration_seconds: p.is_timed ? (p.duration_seconds || 60) : undefined,
      set_type: p.is_timed ? "duration" : "reps",
      completed: false,
    })),
  }));
}

// ── TIMED SET ROW ─────────────────────────────────────────────────────────────
function TimedSetRow({ set, onUpdate, onRemove }: { set: ExerciseSet; onUpdate: (u: Partial<ExerciseSet>) => void; onRemove: () => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);
  const target = set.duration_seconds || 60;

  useEffect(() => {
    if (running) { iv.current = setInterval(() => setElapsed(e => e + 1), 1000); }
    else { if (iv.current) clearInterval(iv.current); }
    return () => { if (iv.current) clearInterval(iv.current); };
  }, [running]);

  useEffect(() => {
    if (elapsed >= target) { setRunning(false); setElapsed(0); onUpdate({ completed: true }); }
  }, [elapsed, target]);

  const pct = Math.min(100, (elapsed / target) * 100);

  return (
    <div className="py-2 px-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-2">
        <span className="text-xs w-5 text-center" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{set.set_number}</span>
        <div className="flex items-center gap-1">
          <input type="number" value={Math.floor(target / 60)} min={0}
            onChange={e => onUpdate({ duration_seconds: parseInt(e.target.value) * 60 + (target % 60) })}
            className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "40px" }} />
          <span className="text-xs" style={{ color: "var(--muted)" }}>m</span>
          <input type="number" value={target % 60} min={0} max={59}
            onChange={e => onUpdate({ duration_seconds: Math.floor(target / 60) * 60 + (parseInt(e.target.value) || 0) })}
            className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "40px" }} />
          <span className="text-xs" style={{ color: "var(--muted)" }}>s</span>
        </div>
        <input type="number" value={set.rpe || ""} onChange={e => onUpdate({ rpe: parseInt(e.target.value) || undefined })}
          className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "42px" }} placeholder="RPE" />
        <button onClick={() => onUpdate({ completed: !set.completed })}
          className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center"
          style={{ background: set.completed ? "var(--success)" : "transparent", border: `1.5px solid ${set.completed ? "var(--success)" : "var(--border)"}` }}>
          {set.completed && <Check size={10} style={{ color: "#0a0a0f" }} />}
        </button>
        <button onClick={onRemove} className="p-0.5 rounded" style={{ color: "var(--muted)" }}><X size={11} /></button>
      </div>
      {/* Timer UI */}
      <div className="flex items-center gap-2 mt-1.5 ml-7">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: running ? "#2ed573" : "rgba(232,197,71,0.4)" }} />
        </div>
        {running && <span className="text-xs" style={{ color: "#2ed573", fontFamily: "'JetBrains Mono',monospace", minWidth: 28 }}>{fmtDuration(target - elapsed)}</span>}
        <button onClick={() => { if (running) { setRunning(false); setElapsed(0); } else { setElapsed(0); setRunning(true); } }}
          className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
          style={{ background: running ? "rgba(255,71,87,0.15)" : "rgba(46,213,115,0.15)", color: running ? "#ff4757" : "#2ed573", border: `1px solid ${running ? "rgba(255,71,87,0.3)" : "rgba(46,213,115,0.3)"}` }}>
          <Timer size={9} />{running ? "Stop" : "Start"}
        </button>
      </div>
    </div>
  );
}

// ── NORMAL SET ROW ────────────────────────────────────────────────────────────
function SetRow({ set, onUpdate, onRemove }: { set: ExerciseSet; onUpdate: (u: Partial<ExerciseSet>) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-xs w-5 text-center" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{set.set_number}</span>
      <input type="number" value={set.weight || ""} onChange={e => onUpdate({ weight: parseFloat(e.target.value) || 0 })}
        className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "55px" }} placeholder="kg" />
      <span className="text-xs" style={{ color: "var(--muted)" }}>×</span>
      <input type="number" value={set.reps || ""} onChange={e => onUpdate({ reps: parseInt(e.target.value) || 0 })}
        className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "48px" }} placeholder="reps" />
      <input type="number" value={set.rpe || ""} onChange={e => onUpdate({ rpe: parseInt(e.target.value) || undefined })}
        className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "42px" }} placeholder="RPE" />
      <button onClick={() => onUpdate({ completed: !set.completed })}
        className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center"
        style={{ background: set.completed ? "var(--success)" : "transparent", border: `1.5px solid ${set.completed ? "var(--success)" : "var(--border)"}` }}>
        {set.completed && <Check size={10} style={{ color: "#0a0a0f" }} />}
      </button>
      <button onClick={onRemove} className="p-0.5 rounded" style={{ color: "var(--muted)" }}><X size={11} /></button>
    </div>
  );
}

// ── EXERCISE CARD ─────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, onUpdate, onRemove }: { exercise: Exercise; onUpdate: (u: Partial<Exercise>) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(true);
  const completedSets = exercise.sets.filter(s => s.completed).length;
  const volume = exercise.is_timed
    ? exercise.sets.filter(s => s.completed).reduce((a, s) => a + (s.duration_seconds || 0), 0)
    : exercise.sets.filter(s => s.completed).reduce((a, s) => a + s.weight * s.reps, 0);

  function addSet() {
    const last = exercise.sets[exercise.sets.length - 1];
    const newSet: ExerciseSet = {
      set_number: exercise.sets.length + 1,
      weight: last?.weight || 0,
      reps: last?.reps || 8,
      duration_seconds: exercise.is_timed ? (last?.duration_seconds || 60) : undefined,
      set_type: exercise.is_timed ? "duration" : "reps",
      completed: false,
    };
    onUpdate({ sets: [...exercise.sets, newSet] });
  }

  function updateSet(idx: number, updates: Partial<ExerciseSet>) {
    const sets = exercise.sets.map((s, i) => i === idx ? { ...s, ...updates } : s);
    onUpdate({ sets });
  }

  function toggleTimed() {
    const nowTimed = !exercise.is_timed;
    const sets = exercise.sets.map(s => ({
      ...s,
      set_type: nowTimed ? "duration" as const : "reps" as const,
      duration_seconds: nowTimed ? 60 : undefined,
      reps: nowTimed ? 0 : 8,
    }));
    onUpdate({ is_timed: nowTimed, sets });
  }

  return (
    <div className="rounded-xl mb-3 overflow-hidden" style={{ background: "rgba(26,26,36,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "#fff" }}>{exercise.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ background: "rgba(232,197,71,0.1)", color: "var(--accent)", fontSize: "10px" }}>{exercise.category}</span>
            {exercise.is_timed && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(46,213,115,0.1)", color: "#2ed573", fontSize: "10px" }}>⏱ timed</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{completedSets}/{exercise.sets.length} sets</span>
            {volume > 0 && <span className="text-xs" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>
              {exercise.is_timed ? fmtDuration(volume) : `${volume}kg`}
            </span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={e => { e.stopPropagation(); toggleTimed(); }} title="Toggle timed mode"
            className="p-1 rounded text-xs" style={{ color: exercise.is_timed ? "#2ed573" : "var(--muted)", background: exercise.is_timed ? "rgba(46,213,115,0.1)" : "transparent" }}>
            <Timer size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 rounded" style={{ color: "var(--muted)" }}><Trash2 size={12} /></button>
          {open ? <ChevronUp size={14} style={{ color: "var(--muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--muted)" }} />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-3">
          {!exercise.is_timed && (
            <div className="flex items-center gap-2 pb-1 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xs w-5" style={{ color: "var(--muted)" }}>#</span>
              <span className="text-xs w-14 text-center" style={{ color: "var(--muted)" }}>kg</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}></span>
              <span className="text-xs w-12 text-center" style={{ color: "var(--muted)" }}>Reps</span>
              <span className="text-xs w-10 text-center" style={{ color: "var(--muted)" }}>RPE</span>
            </div>
          )}
          {exercise.sets.map((set, idx) =>
            exercise.is_timed
              ? <TimedSetRow key={idx} set={set} onUpdate={u => updateSet(idx, u)} onRemove={() => { const sets = exercise.sets.filter((_, i) => i !== idx).map((s, i) => ({ ...s, set_number: i + 1 })); onUpdate({ sets }); }} />
              : <SetRow key={idx} set={set} onUpdate={u => updateSet(idx, u)} onRemove={() => { const sets = exercise.sets.filter((_, i) => i !== idx).map((s, i) => ({ ...s, set_number: i + 1 })); onUpdate({ sets }); }} />
          )}
          <button onClick={addSet} className="w-full mt-2 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1"
            style={{ border: "1px dashed rgba(232,197,71,0.25)", color: "var(--accent)" }}>
            <Plus size={11} /> Add Set
          </button>
          {exercise.notes && (
            <p className="text-xs mt-2 px-1" style={{ color: "var(--muted)", fontStyle: "italic" }}>💡 {exercise.notes}</p>
          )}
          <input value={exercise.notes || ""} onChange={e => onUpdate({ notes: e.target.value })}
            className="input-field text-xs mt-1" style={{ padding: "0.3rem 0.6rem" }} placeholder="Notes..." />
        </div>
      )}
    </div>
  );
}

// ── ADD EXERCISE PANEL ────────────────────────────────────────────────────────
function AddExercisePanel({ split, onAdd, onClose }: { split: WorkoutSplit; onAdd: (e: Exercise) => void; onClose: () => void }) {
  const [category, setCategory] = useState<ExerciseCategory>(SPLIT_CATEGORIES[split][0]);
  const [custom, setCustom] = useState("");
  const [isTimed, setIsTimed] = useState(false);
  const categories = SPLIT_CATEGORIES[split];

  function add(name: string, timed = isTimed) {
    onAdd({
      id: uid(), name, category, order: 0, is_timed: timed,
      sets: [{ set_number: 1, weight: 0, reps: timed ? 0 : 8, duration_seconds: timed ? 60 : undefined, set_type: timed ? "duration" : "reps", completed: false }],
    });
    onClose();
  }

  return (
    <div className="rounded-xl p-4 mb-3 animate-slide-down" style={{ background: "rgba(10,10,15,0.95)", border: "1px solid rgba(232,197,71,0.25)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "#fff" }}>Add Exercise</span>
        <button onClick={onClose} style={{ color: "var(--muted)" }}><X size={14} /></button>
      </div>
      <div className="flex gap-1 flex-wrap mb-3">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className="text-xs px-2.5 py-1 rounded-lg capitalize"
            style={{ background: category === cat ? "var(--accent)" : "rgba(255,255,255,0.06)", color: category === cat ? "#0a0a0f" : "var(--muted)" }}>
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 mb-3 max-h-40 overflow-y-auto">
        {EXERCISE_TEMPLATES[category]?.map(({ name, is_timed: t }) => (
          <button key={name} onClick={() => add(name, t || false)}
            className="text-left text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--soft)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {t && <Timer size={9} style={{ color: "#2ed573", flexShrink: 0 }} />}{name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setIsTimed(t => !t)} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded"
          style={{ background: isTimed ? "rgba(46,213,115,0.15)" : "rgba(255,255,255,0.05)", color: isTimed ? "#2ed573" : "var(--muted)", border: `1px solid ${isTimed ? "rgba(46,213,115,0.3)" : "var(--border)"}` }}>
          <Timer size={11} />{isTimed ? "Timed" : "Reps"}
        </button>
        <span className="text-xs" style={{ color: "var(--muted)" }}>mode for custom</span>
      </div>
      <div className="flex gap-2">
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && custom.trim() && add(custom.trim())}
          className="input-field text-sm flex-1" style={{ padding: "0.4rem 0.7rem" }} placeholder="Custom exercise name..." autoFocus />
        <button onClick={() => custom.trim() && add(custom.trim())} disabled={!custom.trim()} className="btn-primary text-xs px-3 flex items-center gap-1"><Plus size={11} /> Add</button>
      </div>
    </div>
  );
}

// ── SESSION VIEW ──────────────────────────────────────────────────────────────
function SessionView({ session, onUpdate, onDelete }: { session: GymSession; onUpdate: (u: Partial<GymSession>) => void; onDelete: () => void }) {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const split = SPLITS.find(s => s.key === session.split)!;
  const volume = calcVolume(session.exercises);
  const completedExercises = session.exercises.filter(ex => ex.sets.every(s => s.completed)).length;

  function addExercise(exercise: Exercise) {
    const exercises = [...session.exercises, { ...exercise, order: session.exercises.length }];
    onUpdate({ exercises, total_volume: calcVolume(exercises) });
  }
  function updateExercise(id: string, updates: Partial<Exercise>) {
    const exercises = session.exercises.map(ex => ex.id === id ? { ...ex, ...updates } : ex);
    onUpdate({ exercises, total_volume: calcVolume(exercises) });
  }
  function removeExercise(id: string) {
    const exercises = session.exercises.filter(ex => ex.id !== id);
    onUpdate({ exercises, total_volume: calcVolume(exercises) });
  }

  return (
    <div className="animate-fade-in">
      <div className="rounded-xl p-4 mb-3" style={{ background: `linear-gradient(135deg, ${split.color}18 0%, rgba(26,26,36,0.9) 100%)`, border: `1px solid ${split.color}30` }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: split.color, color: "#0a0a0f" }}>{split.short}</span>
              <span className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>{split.label}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{split.muscles}</p>
          </div>
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: "var(--muted)", background: "rgba(255,71,87,0.1)" }}><Trash2 size={14} /></button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Volume", value: volume > 0 ? `${volume}kg` : "—", color: "var(--accent)" },
            { label: "Exercises", value: `${completedExercises}/${session.exercises.length}`, color: "#2ed573" },
            { label: "Warmup", value: session.warmup_done ? "Done ✓" : "Pending", color: session.warmup_done ? "#2ed573" : "var(--warning)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg p-2 text-center" style={{ background: "rgba(10,10,15,0.5)" }}>
              <p className="text-xs font-bold" style={{ color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</p>
              <p style={{ color: "var(--muted)", fontSize: "10px" }}>{label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={() => onUpdate({ warmup_done: !session.warmup_done })}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ background: session.warmup_done ? "rgba(46,213,115,0.15)" : "rgba(255,255,255,0.05)", color: session.warmup_done ? "#2ed573" : "var(--muted)", border: `1px solid ${session.warmup_done ? "rgba(46,213,115,0.3)" : "var(--border)"}` }}>
            {session.warmup_done ? <Check size={11} /> : null} WarmUp: {session.warmup_type || "1km Run"}
          </button>
          <div className="flex items-center gap-1">
            <input type="number" value={session.duration_minutes || ""} onChange={e => onUpdate({ duration_minutes: parseInt(e.target.value) || undefined })}
              className="input-field text-xs" style={{ padding: "0.3rem 0.5rem", width: "60px" }} placeholder="mins" />
            <span className="text-xs" style={{ color: "var(--muted)" }}>min</span>
          </div>
        </div>
        <input value={session.notes || ""} onChange={e => onUpdate({ notes: e.target.value })}
          className="input-field text-xs mt-2" style={{ padding: "0.35rem 0.6rem" }} placeholder="Session notes..." />
      </div>

      {showAddExercise && <AddExercisePanel split={session.split} onAdd={addExercise} onClose={() => setShowAddExercise(false)} />}
      {session.exercises.length === 0 && !showAddExercise && (
        <div className="text-center py-8 rounded-xl mb-3" style={{ background: "rgba(26,26,36,0.5)", border: "1px dashed rgba(255,255,255,0.08)" }}>
          <Dumbbell size={28} className="mx-auto mb-2" style={{ color: "var(--muted)" }} />
          <p className="text-sm" style={{ color: "var(--muted)" }}>No exercises yet</p>
        </div>
      )}
      {session.exercises.map(ex => (
        <ExerciseCard key={ex.id} exercise={ex} onUpdate={u => updateExercise(ex.id, u)} onRemove={() => removeExercise(ex.id)} />
      ))}
      <button onClick={() => setShowAddExercise(o => !o)} className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 mb-3"
        style={{ background: "rgba(232,197,71,0.06)", border: "1px dashed rgba(232,197,71,0.25)", color: "var(--accent)" }}>
        <Plus size={14} /> Add Exercise
      </button>
      <button onClick={() => onUpdate({ completed: !session.completed })}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        style={{ background: session.completed ? "rgba(46,213,115,0.15)" : "var(--accent)", color: session.completed ? "#2ed573" : "#0a0a0f", border: session.completed ? "1px solid rgba(46,213,115,0.3)" : "none" }}>
        {session.completed ? <><Check size={16} /> Session Complete!</> : <><Dumbbell size={16} /> Mark Complete</>}
      </button>
    </div>
  );
}

// ── BODY WEIGHT WIDGET ────────────────────────────────────────────────────────
function BodyWeightWidget({ logs, date, onAdd, onUpdate }: { logs: BodyWeightLog[]; date: string; onAdd: Props["onAddWeight"]; onUpdate: Props["onUpdateWeight"] }) {
  const today = logs.find(l => l.date === date);
  const [editing, setEditing] = useState(!today);
  const [val, setVal] = useState(today ? String(today.weight_kg) : "");
  const recent = logs.filter(l => l.date !== date).slice(0, 6).reverse();

  async function save() {
    const kg = parseFloat(val);
    if (!kg) return;
    if (today) { await onUpdate(today.id, { weight_kg: kg }); }
    else { await onAdd({ date, weight_kg: kg }); }
    setEditing(false);
  }

  const weights = recent.map(l => l.weight_kg);
  const minW = Math.min(...weights, today?.weight_kg || 999) - 1;
  const maxW = Math.max(...weights, today?.weight_kg || 0) + 1;

  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(26,26,36,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale size={14} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "#fff" }}>Body Weight</span>
        </div>
        {today && !editing && (
          <button onClick={() => { setVal(String(today.weight_kg)); setEditing(true); }} className="p-1 rounded" style={{ color: "var(--muted)" }}><Pencil size={12} /></button>
        )}
      </div>

      {(editing || !today) ? (
        <div className="flex items-center gap-2">
          <input type="number" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
            className="input-field text-xl font-bold flex-1" style={{ padding: "0.5rem 0.75rem", fontFamily: "'JetBrains Mono',monospace", color: "var(--accent)" }}
            placeholder="e.g. 72.5" autoFocus step="0.1" />
          <span className="text-sm" style={{ color: "var(--muted)" }}>kg</span>
          <button onClick={save} disabled={!val} className="btn-primary text-sm px-4 py-2 flex items-center gap-1"><Check size={13} /> Save</button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>{today.weight_kg}</span>
          <span className="text-base" style={{ color: "var(--muted)" }}>kg</span>
          {recent.length > 0 && (() => {
            const prev = recent[recent.length - 1];
            const diff = today.weight_kg - prev.weight_kg;
            return (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: diff < 0 ? "rgba(46,213,115,0.1)" : diff > 0 ? "rgba(255,71,87,0.1)" : "rgba(255,255,255,0.05)", color: diff < 0 ? "#2ed573" : diff > 0 ? "#ff4757" : "var(--muted)" }}>
                {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg vs prev
              </span>
            );
          })()}
        </div>
      )}

      {/* Mini chart */}
      {recent.length >= 2 && (
        <div className="mt-3 flex items-end gap-1.5" style={{ height: 36 }}>
          {[...recent, ...(today ? [today] : [])].map((l, i, arr) => {
            const h = maxW === minW ? 50 : ((l.weight_kg - minW) / (maxW - minW)) * 100;
            const isToday = l.date === date;
            return (
              <div key={l.id} className="flex flex-col items-center gap-0.5 flex-1">
                <div className="w-full rounded-sm" style={{ height: `${Math.max(8, h)}%`, background: isToday ? "var(--accent)" : "rgba(232,197,71,0.25)", transition: "height 0.3s ease" }} />
                <span style={{ fontSize: "8px", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{l.weight_kg}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function Gym({ sessions, bodyWeightLogs, selectedDate, onAdd, onUpdate, onDelete, onAddWeight, onUpdateWeight }: Props) {
  const date = selectedDate || new Date().toISOString().split("T")[0];
  const todaySession = sessions.find(s => s.date === date);
  const [creating, setCreating] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit>("chest_triceps_abs");
  const [usePreset, setUsePreset] = useState(true);

  async function createSession() {
    const split = SPLITS.find(s => s.key === selectedSplit)!;
    await onAdd({
      date,
      split: selectedSplit,
      split_label: split.label,
      exercises: usePreset && selectedSplit !== "custom" ? buildPresetExercises(selectedSplit) : [],
      warmup_done: false,
      warmup_type: "1km Run",
      completed: false,
    });
    setCreating(false);
  }

  const recentSessions = sessions.filter(s => s.date !== date).slice(0, 4);

  return (
    <div className="pb-20 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>Gym</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {date === new Date().toISOString().split("T")[0] ? "Today" : new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
        {!todaySession && !creating && (
          <button onClick={() => setCreating(true)} className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3"><Plus size={13} /> New Session</button>
        )}
      </div>

      {/* Body weight */}
      <BodyWeightWidget logs={bodyWeightLogs} date={date} onAdd={onAddWeight} onUpdate={onUpdateWeight} />

      {/* Create session */}
      {creating && (
        <div className="rounded-xl p-4 mb-4 animate-slide-down" style={{ background: "rgba(26,26,36,0.9)", border: "1px solid rgba(232,197,71,0.2)" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "#fff" }}>Choose Your Split</p>
          <div className="space-y-2 mb-3">
            {SPLITS.map(s => (
              <button key={s.key} onClick={() => setSelectedSplit(s.key)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                style={{ background: selectedSplit === s.key ? `${s.color}18` : "rgba(255,255,255,0.03)", border: `1px solid ${selectedSplit === s.key ? `${s.color}50` : "rgba(255,255,255,0.07)"}` }}>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: s.color, color: "#0a0a0f", minWidth: 52, textAlign: "center" }}>{s.short}</span>
                <div>
                  <p className="text-sm" style={{ color: "#fff" }}>{s.label}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{s.muscles}</p>
                </div>
              </button>
            ))}
          </div>
          {selectedSplit !== "custom" && (
            <button onClick={() => setUsePreset(p => !p)}
              className="w-full flex items-center gap-2 p-2.5 rounded-lg mb-3 text-sm"
              style={{ background: usePreset ? "rgba(232,197,71,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${usePreset ? "rgba(232,197,71,0.25)" : "var(--border)"}`, color: usePreset ? "var(--accent)" : "var(--muted)" }}>
              {usePreset ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded border" style={{ borderColor: "var(--border)" }} />}
              Load Guruji's preset exercises for this split
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={createSession} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2"><Dumbbell size={14} /> Start Session</button>
            <button onClick={() => setCreating(false)} className="btn-ghost text-sm px-4"><X size={14} /></button>
          </div>
        </div>
      )}

      {todaySession && <SessionView session={todaySession} onUpdate={u => onUpdate(todaySession.id, u)} onDelete={() => onDelete(todaySession.id)} />}

      {!todaySession && !creating && (
        <div className="text-center py-10 rounded-xl mb-4" style={{ background: "rgba(26,26,36,0.5)", border: "1px solid var(--border)" }}>
          <Dumbbell size={36} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <p className="font-semibold" style={{ color: "var(--soft)" }}>No session for this day</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--muted)" }}>Your Guruji workout plan is ready to load</p>
          <button onClick={() => setCreating(true)} className="btn-primary text-sm inline-flex items-center gap-2"><Plus size={14} /> New Session</button>
        </div>
      )}

      {recentSessions.length > 0 && (
        <div>
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Recent Sessions</p>
          {recentSessions.map(s => {
            const spl = SPLITS.find(sp => sp.key === s.split);
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ background: "rgba(26,26,36,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: spl?.color || "#e8c547", color: "#0a0a0f", minWidth: 44, textAlign: "center" }}>{spl?.short || "GYM"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "var(--soft)" }}>{s.split_label}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {s.total_volume ? ` · ${s.total_volume}kg` : ""}
                    {s.exercises.length ? ` · ${s.exercises.length} ex` : ""}
                  </p>
                </div>
                {s.completed && <Check size={14} style={{ color: "#2ed573", flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
