"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Play, Square, Dumbbell, Timer, Flame, TrendingUp, X, RotateCcw } from "lucide-react";
import { GymSession, Exercise, ExerciseSet, WorkoutSplit, ExerciseCategory } from "@/lib/types";

interface Props {
  sessions: GymSession[];
  selectedDate: string | null;
  onAdd: (session: Omit<GymSession, "id" | "user_id" | "created_at">) => Promise<void>;
  onUpdate: (id: string, updates: Partial<GymSession>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const SPLITS: { key: WorkoutSplit; label: string; short: string; muscles: string; color: string }[] = [
  { key: "chest_triceps_abs",    label: "Chest + Triceps + Abs",     short: "PUSH",    muscles: "Chest · Triceps · Abs",     color: "#ff4757" },
  { key: "back_biceps_abs",      label: "Back + Biceps + Abs",       short: "PULL",    muscles: "Back · Biceps · Abs",       color: "#2ed573" },
  { key: "legs_shoulders_cardio",label: "Legs + Shoulders + Cardio", short: "LEGS",    muscles: "Quads · Shoulders · Cardio",color: "#a78bfa" },
  { key: "custom",               label: "Custom Workout",            short: "CUSTOM",  muscles: "Your choice",               color: "#e8c547" },
];

const EXERCISE_TEMPLATES: Record<ExerciseCategory, string[]> = {
  chest:    ["Bench Press", "Incline Bench", "Decline Bench", "Chest Flyes", "Cable Flyes", "Push-Ups", "Chest Dips"],
  triceps:  ["Tricep Pushdown", "Skull Crushers", "Overhead Extension", "Close Grip Bench", "Dips", "Tricep Kickbacks"],
  abs:      ["Crunches", "Plank", "Leg Raises", "Russian Twists", "Cable Crunches", "Ab Wheel", "Mountain Climbers"],
  back:     ["Pull-Ups", "Lat Pulldown", "Bent Over Row", "Seated Row", "T-Bar Row", "Deadlift", "Face Pulls"],
  biceps:   ["Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Preacher Curl", "Cable Curl", "Concentration Curl"],
  shoulders:["Overhead Press", "Arnold Press", "Lateral Raise", "Front Raise", "Rear Delt Fly", "Shrugs", "Upright Row"],
  legs:     ["Squat", "Leg Press", "Romanian Deadlift", "Leg Extension", "Leg Curl", "Lunges", "Calf Raises", "Hack Squat"],
  cardio:   ["Treadmill Run", "Cycling", "Jump Rope", "Rowing", "Stair Climber", "HIIT"],
  compound: ["Deadlift", "Squat", "Bench Press", "Overhead Press", "Pull-Ups", "Dips"],
};

const SPLIT_CATEGORIES: Record<WorkoutSplit, ExerciseCategory[]> = {
  chest_triceps_abs:     ["chest", "triceps", "abs"],
  back_biceps_abs:       ["back", "biceps", "abs"],
  legs_shoulders_cardio: ["legs", "shoulders", "cardio"],
  custom:                ["compound", "chest", "back", "legs", "shoulders", "biceps", "triceps", "abs", "cardio"],
};

function uid() { return Math.random().toString(36).slice(2, 9); }

function calcVolume(exercises: Exercise[]) {
  return exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0);
  }, 0);
}

function SetRow({ set, onUpdate, onRemove }: {
  set: ExerciseSet;
  onUpdate: (updates: Partial<ExerciseSet>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-xs w-5 text-center" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{set.set_number}</span>
      <input
        type="number" value={set.weight || ""} onChange={e => onUpdate({ weight: parseFloat(e.target.value) || 0 })}
        className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "58px" }}
        placeholder="kg"
      />
      <span className="text-xs" style={{ color: "var(--muted)" }}>×</span>
      <input
        type="number" value={set.reps || ""} onChange={e => onUpdate({ reps: parseInt(e.target.value) || 0 })}
        className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "48px" }}
        placeholder="reps"
      />
      <input
        type="number" value={set.rpe || ""} onChange={e => onUpdate({ rpe: parseInt(e.target.value) || undefined })}
        className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "42px" }}
        placeholder="RPE"
      />
      <button
        onClick={() => onUpdate({ completed: !set.completed })}
        className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center"
        style={{ background: set.completed ? "var(--success)" : "transparent", border: `1.5px solid ${set.completed ? "var(--success)" : "var(--border)"}` }}
      >
        {set.completed && <Check size={10} style={{ color: "#0a0a0f" }} />}
      </button>
      <button onClick={onRemove} className="p-0.5 rounded" style={{ color: "var(--muted)" }}><X size={11} /></button>
    </div>
  );
}

function ExerciseCard({ exercise, onUpdate, onRemove }: {
  exercise: Exercise;
  onUpdate: (updates: Partial<Exercise>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const completedSets = exercise.sets.filter(s => s.completed).length;
  const volume = exercise.sets.filter(s => s.completed).reduce((a, s) => a + s.weight * s.reps, 0);

  function addSet() {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: ExerciseSet = {
      set_number: exercise.sets.length + 1,
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 8,
      completed: false,
    };
    onUpdate({ sets: [...exercise.sets, newSet] });
  }

  function updateSet(idx: number, updates: Partial<ExerciseSet>) {
    const sets = exercise.sets.map((s, i) => i === idx ? { ...s, ...updates } : s);
    onUpdate({ sets });
  }

  function removeSet(idx: number) {
    const sets = exercise.sets.filter((_, i) => i !== idx).map((s, i) => ({ ...s, set_number: i + 1 }));
    onUpdate({ sets });
  }

  return (
    <div className="rounded-xl mb-3 overflow-hidden" style={{ background: "rgba(26,26,36,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "#fff" }}>{exercise.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(232,197,71,0.1)", color: "var(--accent)", fontSize: "10px" }}>
              {exercise.category}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
              {completedSets}/{exercise.sets.length} sets
            </span>
            {volume > 0 && <span className="text-xs" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>{volume}kg vol</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 rounded" style={{ color: "var(--muted)" }}>
            <Trash2 size={12} />
          </button>
          {open ? <ChevronUp size={14} style={{ color: "var(--muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--muted)" }} />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-3">
          {/* Set header */}
          <div className="flex items-center gap-2 pb-1 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-xs w-5" style={{ color: "var(--muted)" }}>#</span>
            <span className="text-xs w-14 text-center" style={{ color: "var(--muted)" }}>Weight</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}></span>
            <span className="text-xs w-12 text-center" style={{ color: "var(--muted)" }}>Reps</span>
            <span className="text-xs w-10 text-center" style={{ color: "var(--muted)" }}>RPE</span>
            <span className="text-xs w-6 text-center" style={{ color: "var(--muted)" }}>✓</span>
          </div>
          {exercise.sets.map((set, idx) => (
            <SetRow key={idx} set={set} onUpdate={u => updateSet(idx, u)} onRemove={() => removeSet(idx)} />
          ))}
          <button onClick={addSet} className="w-full mt-2 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1"
            style={{ border: "1px dashed rgba(232,197,71,0.25)", color: "var(--accent)" }}>
            <Plus size={11} /> Add Set
          </button>
          <input
            value={exercise.notes || ""} onChange={e => onUpdate({ notes: e.target.value })}
            className="input-field text-xs mt-2" style={{ padding: "0.35rem 0.6rem" }}
            placeholder="Notes for this exercise (optional)"
          />
        </div>
      )}
    </div>
  );
}

function AddExercisePanel({ split, onAdd, onClose }: {
  split: WorkoutSplit;
  onAdd: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<ExerciseCategory>(SPLIT_CATEGORIES[split][0]);
  const [custom, setCustom] = useState("");
  const categories = SPLIT_CATEGORIES[split];

  function add(name: string) {
    onAdd({
      id: uid(),
      name,
      category,
      order: 0,
      sets: [{ set_number: 1, weight: 0, reps: 8, completed: false }],
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
        {EXERCISE_TEMPLATES[category]?.map(name => (
          <button key={name} onClick={() => add(name)}
            className="text-left text-xs px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--soft)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && custom.trim() && add(custom.trim())}
          className="input-field text-sm flex-1" style={{ padding: "0.4rem 0.7rem" }} placeholder="Or type custom exercise..." autoFocus />
        <button onClick={() => custom.trim() && add(custom.trim())} disabled={!custom.trim()}
          className="btn-primary text-xs px-3 flex items-center gap-1"><Plus size={11} /> Add</button>
      </div>
    </div>
  );
}

function SessionView({ session, onUpdate, onDelete }: {
  session: GymSession;
  onUpdate: (updates: Partial<GymSession>) => void;
  onDelete: () => void;
}) {
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
      {/* Session Header */}
      <div className="rounded-xl p-4 mb-3" style={{ background: `linear-gradient(135deg, ${split.color}18 0%, rgba(26,26,36,0.9) 100%)`, border: `1px solid ${split.color}30` }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: split.color, color: "#0a0a0f", letterSpacing: "0.05em" }}>{split.short}</span>
              <span className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>{split.label}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{split.muscles}</p>
          </div>
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: "var(--muted)", background: "rgba(255,71,87,0.1)" }}><Trash2 size={14} /></button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Volume", value: volume > 0 ? `${volume}kg` : "—", icon: TrendingUp, color: "var(--accent)" },
            { label: "Exercises", value: `${completedExercises}/${session.exercises.length}`, icon: Dumbbell, color: "#2ed573" },
            { label: "Warmup", value: session.warmup_done ? "Done ✓" : "Pending", icon: Flame, color: session.warmup_done ? "#2ed573" : "var(--warning)" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-lg p-2 text-center" style={{ background: "rgba(10,10,15,0.5)" }}>
              <Icon size={12} className="mx-auto mb-1" style={{ color }} />
              <p className="text-xs font-bold" style={{ color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--muted)", fontSize: "10px" }}>{label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => onUpdate({ warmup_done: !session.warmup_done })}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ background: session.warmup_done ? "rgba(46,213,115,0.15)" : "rgba(255,255,255,0.05)", color: session.warmup_done ? "#2ed573" : "var(--muted)", border: `1px solid ${session.warmup_done ? "rgba(46,213,115,0.3)" : "var(--border)"}` }}>
            {session.warmup_done ? <Check size={11} /> : <Play size={11} />}
            WarmUp {session.warmup_type || "1km Run"}
          </button>
          <input type="number" value={session.duration_minutes || ""} onChange={e => onUpdate({ duration_minutes: parseInt(e.target.value) || undefined })}
            className="input-field text-xs" style={{ padding: "0.3rem 0.5rem", width: "70px" }} placeholder="mins" />
          <span className="text-xs" style={{ color: "var(--muted)" }}>duration</span>
        </div>
        <input value={session.notes || ""} onChange={e => onUpdate({ notes: e.target.value })}
          className="input-field text-xs mt-2" style={{ padding: "0.35rem 0.6rem" }} placeholder="Session notes..." />
      </div>

      {/* Exercises */}
      {showAddExercise && (
        <AddExercisePanel split={session.split} onAdd={addExercise} onClose={() => setShowAddExercise(false)} />
      )}

      {session.exercises.length === 0 && !showAddExercise && (
        <div className="text-center py-8 rounded-xl mb-3" style={{ background: "rgba(26,26,36,0.5)", border: "1px dashed rgba(255,255,255,0.08)" }}>
          <Dumbbell size={28} className="mx-auto mb-2" style={{ color: "var(--muted)" }} />
          <p className="text-sm" style={{ color: "var(--muted)" }}>No exercises yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--border)" }}>Tap + Add Exercise to get started</p>
        </div>
      )}

      {session.exercises.map(ex => (
        <ExerciseCard key={ex.id} exercise={ex} onUpdate={u => updateExercise(ex.id, u)} onRemove={() => removeExercise(ex.id)} />
      ))}

      <button onClick={() => setShowAddExercise(o => !o)}
        className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 mb-3"
        style={{ background: "rgba(232,197,71,0.06)", border: "1px dashed rgba(232,197,71,0.25)", color: "var(--accent)" }}>
        <Plus size={14} /> Add Exercise
      </button>

      <button onClick={() => onUpdate({ completed: !session.completed })}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        style={{ background: session.completed ? "rgba(46,213,115,0.15)" : "var(--accent)", color: session.completed ? "#2ed573" : "#0a0a0f", border: session.completed ? "1px solid rgba(46,213,115,0.3)" : "none" }}>
        {session.completed ? <><Check size={16} /> Session Complete!</> : <><Square size={16} /> Mark Complete</>}
      </button>
    </div>
  );
}

export default function Gym({ sessions, selectedDate, onAdd, onUpdate, onDelete }: Props) {
  const date = selectedDate || new Date().toISOString().split("T")[0];
  const todaySession = sessions.find(s => s.date === date);
  const [creating, setCreating] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit>("chest_triceps_abs");

  async function createSession() {
    const split = SPLITS.find(s => s.key === selectedSplit)!;
    await onAdd({
      date,
      split: selectedSplit,
      split_label: split.label,
      exercises: [],
      warmup_done: false,
      warmup_type: "1km Run",
      completed: false,
    });
    setCreating(false);
  }

  const recentSessions = sessions.filter(s => s.date !== date).slice(0, 3);

  return (
    <div className="pb-20 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>Gym Session</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {date === new Date().toISOString().split("T")[0] ? "Today" : new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
        {!todaySession && !creating && (
          <button onClick={() => setCreating(true)} className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3">
            <Plus size={13} /> New Session
          </button>
        )}
      </div>

      {/* Create session */}
      {creating && (
        <div className="rounded-xl p-4 mb-4 animate-slide-down" style={{ background: "rgba(26,26,36,0.9)", border: "1px solid rgba(232,197,71,0.2)" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "#fff" }}>Choose Split</p>
          <div className="space-y-2 mb-4">
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
          <div className="flex gap-2">
            <button onClick={createSession} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2"><Dumbbell size={14} /> Start Session</button>
            <button onClick={() => setCreating(false)} className="btn-ghost text-sm px-4"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Active session */}
      {todaySession && (
        <SessionView session={todaySession} onUpdate={u => onUpdate(todaySession.id, u)} onDelete={() => onDelete(todaySession.id)} />
      )}

      {!todaySession && !creating && (
        <div className="text-center py-10 rounded-xl mb-4" style={{ background: "rgba(26,26,36,0.5)", border: "1px solid var(--border)" }}>
          <Dumbbell size={36} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <p className="font-semibold" style={{ color: "var(--soft)" }}>No session for this day</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--muted)" }}>Start a new gym session to track your workout</p>
          <button onClick={() => setCreating(true)} className="btn-primary text-sm inline-flex items-center gap-2">
            <Plus size={14} /> New Session
          </button>
        </div>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Recent Sessions</p>
          {recentSessions.map(s => {
            const spl = SPLITS.find(sp => sp.key === s.split)!;
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ background: "rgba(26,26,36,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: spl?.color || "#e8c547", color: "#0a0a0f", minWidth: 44, textAlign: "center" }}>{spl?.short || "GYM"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "var(--soft)" }}>{s.split_label}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {s.total_volume ? ` · ${s.total_volume}kg vol` : ""}
                    {s.exercises.length ? ` · ${s.exercises.length} exercises` : ""}
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
