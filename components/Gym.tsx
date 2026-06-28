"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Dumbbell, X, Scale, Timer, Pencil, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GymSession, Exercise, ExerciseSet, WorkoutSplit, ExerciseCategory, BodyWeightLog } from "@/lib/types";
import WorkoutPlayer from "@/components/WorkoutPlayer";

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

// ── HISTORY HELPERS ───────────────────────────────────────────────────────────
/** Find the most recent session with the same split BEFORE a given date */
function getPrevSession(sessions: GymSession[], currentDate: string, split: WorkoutSplit): GymSession | null {
  return sessions
    .filter(s => s.split === split && s.date < currentDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

/** For a named exercise, collect (date, maxWeight, maxReps, totalVolume) across all sessions */
interface ExerciseHistory { date: string; maxWeight: number; maxReps: number; volume: number; sets: ExerciseSet[] }
function getExerciseHistory(sessions: GymSession[], name: string): ExerciseHistory[] {
  const hist: ExerciseHistory[] = [];
  sessions
    .filter(s => s.exercises.some(e => e.name === name))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(s => {
      const ex = s.exercises.find(e => e.name === name);
      if (!ex) return;
      const completedSets = ex.sets.filter(set => set.completed);
      if (completedSets.length === 0) return;
      const maxWeight = Math.max(...completedSets.map(s => s.weight || 0));
      const maxReps   = Math.max(...completedSets.map(s => s.reps || 0));
      const volume    = completedSets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0);
      hist.push({ date: s.date, maxWeight, maxReps, volume, sets: completedSets });
    });
  return hist;
}

// ── SVG LINE CHART ────────────────────────────────────────────────────────────
function LineChart({
  data, color = "#e8c547", label = "", unit = "",
  height = 72, showDots = true, showArea = true, showLabels = true,
}: {
  data: { x: string; y: number }[];
  color?: string; label?: string; unit?: string;
  height?: number; showDots?: boolean; showArea?: boolean; showLabels?: boolean;
}) {
  if (data.length < 2) return null;
  const W = 320; const H = height;
  const pad = { t: 8, b: showLabels ? 22 : 8, l: 8, r: 8 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const ys = data.map(d => d.y);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;

  function cx(i: number) { return pad.l + (i / (data.length - 1)) * w; }
  function cy(y: number) { return pad.t + h - ((y - minY) / rangeY) * h; }

  const points = data.map((d, i) => `${cx(i)},${cy(d.y)}`).join(" ");
  const areaPath = `M${cx(0)},${cy(data[0].y)} ` +
    data.map((d, i) => `L${cx(i)},${cy(d.y)}`).join(" ") +
    ` L${cx(data.length - 1)},${H - pad.b} L${cx(0)},${H - pad.b} Z`;

  // trend
  const first = ys[0]; const last = ys[ys.length - 1];
  const diff = last - first;

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.06em" }}>{label.toUpperCase()}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12, color, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
              {last}{unit}
            </span>
            {diff !== 0 && (
              <span style={{ fontSize: 10, color: diff > 0 ? "#2ed573" : "#ff4757", display: "flex", alignItems: "center", gap: 2 }}>
                {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {diff > 0 ? "+" : ""}{diff % 1 === 0 ? diff : diff.toFixed(1)}{unit}
              </span>
            )}
          </div>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height, overflow: "visible" }}>
        <defs>
          <linearGradient id={`area-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {showArea && <path d={areaPath} fill={`url(#area-${label})`} />}
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {showDots && data.map((d, i) => (
          <circle key={i} cx={cx(i)} cy={cy(d.y)} r={i === data.length - 1 ? 4 : 3}
            fill={i === data.length - 1 ? color : "#0a0a0f"}
            stroke={color} strokeWidth="2" />
        ))}
        {showLabels && data.map((d, i) => {
          // Show label on first, last, and every ~3rd
          const show = i === 0 || i === data.length - 1 || i % Math.max(1, Math.floor(data.length / 4)) === 0;
          if (!show) return null;
          return (
            <text key={i} x={cx(i)} y={H - 2} textAnchor="middle"
              style={{ fontSize: 8, fill: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace" }}>
              {d.x.slice(5)} {/* MM-DD */}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── SPLITS & PRESETS ──────────────────────────────────────────────────────────
const SPLITS: { key: WorkoutSplit; label: string; short: string; muscles: string; color: string }[] = [
  { key: "chest_triceps_abs",    label: "Chest + Triceps + Abs",     short: "PUSH",   muscles: "Chest · Triceps · Core",           color: "#ff4757" },
  { key: "back_biceps_abs",      label: "Back + Biceps + Abs",       short: "PULL",   muscles: "Back · Biceps · Forearms · Core",  color: "#2ed573" },
  { key: "legs_shoulders_cardio",label: "Legs + Shoulders + Cardio", short: "LEGS",   muscles: "Legs · Delts · Cardio",            color: "#a78bfa" },
  { key: "custom",               label: "Custom Workout",            short: "CUSTOM", muscles: "Your choice",                      color: "#e8c547" },
];

const PRESET_WORKOUTS: Record<WorkoutSplit, { name: string; category: ExerciseCategory; sets: number; reps: number; repsNote?: string; notes?: string; is_timed?: boolean; duration_seconds?: number }[]> = {
  chest_triceps_abs: [
    { name: "Flat Bench Press",         category: "chest",   sets: 4, reps: 10, notes: "Heavy load, full ROM" },
    { name: "Incline Bench Press",      category: "chest",   sets: 4, reps: 10, notes: "Barbell or dumbbells" },
    { name: "Cable Crossovers",         category: "chest",   sets: 4, reps: 14, notes: "Or Dumbbell Flyes" },
    { name: "Parallel Bar Dips",        category: "chest",   sets: 4, reps: 0,  notes: "Bodyweight max reps" },
    { name: "Push-Ups",                 category: "chest",   sets: 3, reps: 0,  notes: "Fully exhaust chest" },
    { name: "Pulley Push Downs",        category: "triceps", sets: 2, reps: 14, notes: "Controlled squeeze at bottom" },
    { name: "Close Grip Bench Press",   category: "triceps", sets: 2, reps: 10, notes: "Block on chest for constant tension" },
    { name: "Triceps Bench Dips",       category: "triceps", sets: 3, reps: 0,  notes: "Full stretch, hard lock-out" },
    { name: "Cardio (optional)",        category: "cardio",  sets: 1, reps: 0,  notes: "20–30 min after weights", is_timed: true, duration_seconds: 1200 },
  ],
  back_biceps_abs: [
    { name: "Lat Pull Downs (Wide Grip)", category: "back",     sets: 4, reps: 10, notes: "Front wide grip, target lats" },
    { name: "Barbell Bent-Over Rows",     category: "back",     sets: 4, reps: 10, notes: "Slightly wider than shoulder-width" },
    { name: "Seated Rowing",              category: "back",     sets: 4, reps: 10, notes: "Full stretch, row to abdomen" },
    { name: "T-Bar Rows",                 category: "back",     sets: 4, reps: 10, notes: "Neutral grip, squeeze at top" },
    { name: "Barbell Shrugs",             category: "back",     sets: 4, reps: 10, notes: "Targets traps — hold at top" },
    { name: "Deadlift",                   category: "back",     sets: 4, reps: 10, notes: "Volume: end of session. Strength: 1–3 heavy reps at start" },
    { name: "Preacher Curls",             category: "biceps",   sets: 2, reps: 10, notes: "Full ROM, controlled negative" },
    { name: "Dumbbell Curls",             category: "biceps",   sets: 2, reps: 10, notes: "Alternate or simultaneous" },
    { name: "Barbell Curls",              category: "biceps",   sets: 2, reps: 10, notes: "Strict form — no swinging" },
    { name: "Hammer Curls",               category: "biceps",   sets: 2, reps: 10, notes: "Neutral grip for brachialis" },
    { name: "Wrist Barbell Curls",        category: "forearms", sets: 4, reps: 0,  notes: "Moderate weight until failure" },
    { name: "Reverse Curls",              category: "forearms", sets: 4, reps: 10, notes: "Overhand grip" },
  ],
  legs_shoulders_cardio: [
    { name: "Single Arm Cable Lateral Raise", category: "shoulders", sets: 4, reps: 14, notes: "Activate side delts first" },
    { name: "Overhead Dumbbell Press",        category: "shoulders", sets: 4, reps: 10, notes: "Most important — max weight" },
    { name: "Dumbbell Side Raises",           category: "shoulders", sets: 4, reps: 14, notes: "Controlled, no momentum" },
    { name: "Upright Rows (Partial)",         category: "shoulders", sets: 4, reps: 12, notes: "Partial ROM — lateral/front delts only" },
    { name: "Leg Extensions",                 category: "legs",      sets: 2, reps: 14, notes: "Activation before heavy lifts" },
    { name: "Weighted Squats",                category: "legs",      sets: 4, reps: 8,  notes: "Final set: drop set to failure" },
    { name: "Leg Press",                      category: "legs",      sets: 4, reps: 10, notes: "" },
    { name: "Dumbbell Squats (Close Stance)", category: "legs",      sets: 4, reps: 10, notes: "Close stance = max quad load" },
    { name: "Front Lunges",                   category: "legs",      sets: 3, reps: 12, notes: "Dumbbells, fully exhaust quads" },
  ],
  custom: [],
};

const EXERCISE_TEMPLATES: Record<ExerciseCategory, { name: string; is_timed?: boolean }[]> = {
  chest:    [{ name: "Bench Press" },{ name: "Incline Bench Press" },{ name: "Decline Bench Press" },{ name: "Cable Crossovers" },{ name: "Dumbbell Flyes" },{ name: "Push-Ups" },{ name: "Parallel Bar Dips" }],
  triceps:  [{ name: "Pulley Push Downs" },{ name: "Close Grip Bench Press" },{ name: "Skull Crushers" },{ name: "Overhead Extension" },{ name: "Triceps Bench Dips" },{ name: "Tricep Kickbacks" }],
  abs:      [{ name: "Crunches" },{ name: "Plank", is_timed: true },{ name: "Leg Raises" },{ name: "Russian Twists" },{ name: "Cable Crunches" },{ name: "Ab Wheel" },{ name: "Mountain Climbers", is_timed: true }],
  back:     [{ name: "Lat Pull Downs (Wide Grip)" },{ name: "Barbell Bent-Over Rows" },{ name: "Seated Rowing" },{ name: "T-Bar Rows" },{ name: "Barbell Shrugs" },{ name: "Deadlift" },{ name: "Face Pulls" },{ name: "Pull-Ups" }],
  biceps:   [{ name: "Preacher Curls" },{ name: "Dumbbell Curls" },{ name: "Barbell Curls" },{ name: "Hammer Curls" },{ name: "Cable Curl" },{ name: "Concentration Curl" }],
  forearms: [{ name: "Wrist Barbell Curls" },{ name: "Reverse Curls" },{ name: "Farmer's Walk", is_timed: true }],
  shoulders:[{ name: "Overhead Barbell Press" },{ name: "Overhead Dumbbell Press" },{ name: "Single Arm Cable Lateral Raise" },{ name: "Dumbbell Side Raises" },{ name: "Upright Rows (Partial)" },{ name: "Front Raises" },{ name: "Face Pulls" },{ name: "Bent-Over Lateral Raises" }],
  legs:     [{ name: "Weighted Squats" },{ name: "Leg Press" },{ name: "Leg Extensions" },{ name: "Leg Curls" },{ name: "Romanian Deadlift" },{ name: "Stiff-Leg Deadlifts" },{ name: "Front Lunges" },{ name: "Hip Thrusts" },{ name: "Wide-Stance Squats" },{ name: "Calf Raises" },{ name: "Dumbbell Squats (Close Stance)" }],
  cardio:   [{ name: "Treadmill Run", is_timed: true },{ name: "Cycling", is_timed: true },{ name: "Jump Rope", is_timed: true },{ name: "Rowing Machine", is_timed: true },{ name: "Stair Climber", is_timed: true },{ name: "HIIT", is_timed: true }],
  compound: [{ name: "Deadlift" },{ name: "Weighted Squats" },{ name: "Bench Press" },{ name: "Overhead Press" },{ name: "Pull-Ups" }],
};

const SPLIT_CATEGORIES: Record<WorkoutSplit, ExerciseCategory[]> = {
  chest_triceps_abs:     ["chest","triceps","abs","cardio"],
  back_biceps_abs:       ["back","biceps","forearms","abs"],
  legs_shoulders_cardio: ["legs","shoulders","cardio"],
  custom:                ["compound","chest","back","legs","shoulders","biceps","triceps","forearms","abs","cardio"],
};

function uid() { return Math.random().toString(36).slice(2, 9); }
function fmtDuration(s: number) { if (s < 60) return `${s}s`; return `${Math.floor(s/60)}m${s%60>0?` ${s%60}s`:""}`; }
function calcVolume(exercises: Exercise[]) {
  return exercises.reduce((t, ex) => t + ex.sets.reduce((s, set) => s + (set.completed && !ex.is_timed ? set.weight * set.reps : 0), 0), 0);
}
function buildPresetExercises(split: WorkoutSplit, prevSession?: GymSession | null): Exercise[] {
  return (PRESET_WORKOUTS[split]||[]).map((p,i) => {
    // Look up previous performance for this exercise
    const prevEx = prevSession?.exercises.find(e => e.name === p.name);
    const prevSets = prevEx?.sets.filter(s => s.completed) || [];
    return {
      id: uid(), name: p.name, category: p.category, order: i,
      is_timed: p.is_timed||false, notes: p.notes||"",
      sets: Array.from({length: p.sets}, (_, si) => {
        // Use previous set data if available, otherwise use preset defaults
        const prev = prevSets[si] || prevSets[prevSets.length - 1]; // last set as fallback
        return {
          set_number: si+1,
          weight: prev?.weight ?? 0,
          reps: prev?.reps ?? p.reps,
          duration_seconds: p.is_timed ? (prev?.duration_seconds ?? p.duration_seconds ?? 60) : undefined,
          set_type: p.is_timed ? "duration" : "reps" as any,
          completed: false,
        };
      }),
    };
  });
}

// ── TIMED SET ROW ─────────────────────────────────────────────────────────────
function TimedSetRow({ set, prevSet, onUpdate, onRemove }: { set: ExerciseSet; prevSet?: ExerciseSet; onUpdate: (u: Partial<ExerciseSet>) => void; onRemove: () => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const iv = useRef<ReturnType<typeof setInterval>|null>(null);
  const target = set.duration_seconds || 60;
  useEffect(() => {
    if (running) { iv.current = setInterval(() => setElapsed(e => e+1), 1000); }
    else { if (iv.current) clearInterval(iv.current); }
    return () => { if (iv.current) clearInterval(iv.current); };
  }, [running]);
  useEffect(() => { if (elapsed >= target) { setRunning(false); setElapsed(0); onUpdate({completed:true}); } }, [elapsed,target]);
  const pct = Math.min(100, (elapsed/target)*100);
  return (
    <div className="py-2 px-1" style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div className="flex items-center gap-2">
        <span className="text-xs w-5 text-center" style={{color:"var(--muted)",fontFamily:"'JetBrains Mono',monospace"}}>{set.set_number}</span>
        <div className="flex items-center gap-1">
          <input type="number" value={Math.floor(target/60)} min={0} onChange={e=>onUpdate({duration_seconds:parseInt(e.target.value)*60+(target%60)})} className="input-field text-xs text-center" style={{padding:"0.25rem",width:"40px"}}/>
          <span className="text-xs" style={{color:"var(--muted)"}}>m</span>
          <input type="number" value={target%60} min={0} max={59} onChange={e=>onUpdate({duration_seconds:Math.floor(target/60)*60+(parseInt(e.target.value)||0)})} className="input-field text-xs text-center" style={{padding:"0.25rem",width:"40px"}}/>
          <span className="text-xs" style={{color:"var(--muted)"}}>s</span>
        </div>
        <button onClick={()=>onUpdate({completed:!set.completed})} className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center" style={{background:set.completed?"var(--success)":"transparent",border:`1.5px solid ${set.completed?"var(--success)":"var(--border)"}`}}>
          {set.completed && <Check size={10} style={{color:"#0a0a0f"}}/>}
        </button>
        <button onClick={onRemove} className="p-0.5 rounded" style={{color:"var(--muted)"}}><X size={11}/></button>
      </div>
      {prevSet && prevSet.duration_seconds && (
        <p className="text-xs mt-0.5 ml-7" style={{color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace"}}>prev: {fmtDuration(prevSet.duration_seconds)}</p>
      )}
      <div className="flex items-center gap-2 mt-1.5 ml-7">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.07)"}}>
          <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:running?"#2ed573":"rgba(232,197,71,0.4)"}}/>
        </div>
        {running && <span className="text-xs" style={{color:"#2ed573",fontFamily:"'JetBrains Mono',monospace",minWidth:28}}>{fmtDuration(target-elapsed)}</span>}
        <button onClick={()=>{if(running){setRunning(false);setElapsed(0);}else{setElapsed(0);setRunning(true);}}} className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{background:running?"rgba(255,71,87,0.15)":"rgba(46,213,115,0.15)",color:running?"#ff4757":"#2ed573",border:`1px solid ${running?"rgba(255,71,87,0.3)":"rgba(46,213,115,0.3)"}`}}>
          <Timer size={9}/>{running?"Stop":"Start"}
        </button>
      </div>
    </div>
  );
}

// ── NORMAL SET ROW ─────────────────────────────────────────────────────────────
function SetRow({ set, prevSet, onUpdate, onRemove }: { set: ExerciseSet; prevSet?: ExerciseSet; onUpdate: (u: Partial<ExerciseSet>) => void; onRemove: () => void }) {
  const improved = prevSet && set.completed && set.weight > 0 && (set.weight > prevSet.weight || set.reps > prevSet.reps);
  return (
    <div className="py-1.5" style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div className="flex items-center gap-2">
        <span className="text-xs w-5 text-center" style={{color:"var(--muted)",fontFamily:"'JetBrains Mono',monospace"}}>{set.set_number}</span>
        <input type="number" value={set.weight||""} onChange={e=>onUpdate({weight:parseFloat(e.target.value)||0})} className="input-field text-xs text-center" style={{padding:"0.25rem",width:"55px",borderColor:improved?"rgba(46,213,115,0.4)":"undefined"}} placeholder="kg"/>
        <span className="text-xs" style={{color:"var(--muted)"}}>×</span>
        <input type="number" value={set.reps||""} onChange={e=>onUpdate({reps:parseInt(e.target.value)||0})} className="input-field text-xs text-center" style={{padding:"0.25rem",width:"48px"}} placeholder="reps"/>
        <input type="number" value={set.rpe||""} onChange={e=>onUpdate({rpe:parseInt(e.target.value)||undefined})} className="input-field text-xs text-center" style={{padding:"0.25rem",width:"40px"}} placeholder="RPE"/>
        <button onClick={()=>onUpdate({completed:!set.completed})} className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center" style={{background:set.completed?"var(--success)":"transparent",border:`1.5px solid ${set.completed?"var(--success)":"var(--border)"}`}}>
          {set.completed && <Check size={10} style={{color:"#0a0a0f"}}/>}
        </button>
        <button onClick={onRemove} className="p-0.5 rounded" style={{color:"var(--muted)"}}><X size={11}/></button>
      </div>
      {/* Previous session data in grey */}
      {prevSet && (
        <div className="flex items-center gap-1 mt-0.5 ml-7">
          <span className="text-xs" style={{color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace"}}>
            prev: {prevSet.weight>0?`${prevSet.weight}kg`:"bw"} × {prevSet.reps||"—"}
            {prevSet.rpe ? ` RPE${prevSet.rpe}` : ""}
          </span>
          {improved && <span className="text-xs" style={{color:"#2ed573"}}>↑ PR</span>}
        </div>
      )}
    </div>
  );
}

// ── EXERCISE CARD with progress chart ─────────────────────────────────────────
function ExerciseCard({ exercise, prevExercise, allSessions, onUpdate, onRemove }: {
  exercise: Exercise;
  prevExercise?: Exercise;
  allSessions: GymSession[];
  onUpdate: (u: Partial<Exercise>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const completedSets = exercise.sets.filter(s=>s.completed).length;
  const volume = exercise.is_timed
    ? exercise.sets.filter(s=>s.completed).reduce((a,s)=>a+(s.duration_seconds||0),0)
    : exercise.sets.filter(s=>s.completed).reduce((a,s)=>a+s.weight*s.reps,0);

  // Historical data for chart
  const history = getExerciseHistory(allSessions, exercise.name);
  const weightData = history.map(h=>({x:h.date, y:h.maxWeight})).filter(d=>d.y>0);
  const volData    = history.map(h=>({x:h.date, y:h.volume})).filter(d=>d.y>0);

  function addSet() {
    const last = exercise.sets[exercise.sets.length-1];
    const newSet: ExerciseSet = {
      set_number: exercise.sets.length+1,
      weight: last?.weight||0, reps: last?.reps||8,
      duration_seconds: exercise.is_timed?(last?.duration_seconds||60):undefined,
      set_type: exercise.is_timed?"duration":"reps" as any, completed: false,
    };
    onUpdate({sets:[...exercise.sets,newSet]});
  }
  function updateSet(idx:number,updates:Partial<ExerciseSet>) {
    const sets = exercise.sets.map((s,i)=>i===idx?{...s,...updates}:s);
    onUpdate({sets});
  }
  function toggleTimed() {
    const nowTimed = !exercise.is_timed;
    const sets = exercise.sets.map(s=>({...s,set_type:nowTimed?"duration" as const:"reps" as const,duration_seconds:nowTimed?60:undefined,reps:nowTimed?0:8}));
    onUpdate({is_timed:nowTimed,sets});
  }

  // prev exercise sets aligned by set_number
  function prevSet(idx:number) { return prevExercise?.sets[idx]; }

  return (
    <div className="rounded-xl mb-3 overflow-hidden" style={{background:"rgba(26,26,36,0.9)",border:"1px solid rgba(255,255,255,0.07)"}}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={()=>setOpen(o=>!o)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{color:"#fff"}}>{exercise.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{background:"rgba(232,197,71,0.1)",color:"var(--accent)",fontSize:"10px"}}>{exercise.category}</span>
            {exercise.is_timed && <span className="text-xs px-1.5 py-0.5 rounded" style={{background:"rgba(46,213,115,0.1)",color:"#2ed573",fontSize:"10px"}}>⏱</span>}
            {history.length >= 2 && <span className="text-xs px-1.5 py-0.5 rounded" style={{background:"rgba(99,102,241,0.12)",color:"#818cf8",fontSize:"10px"}}>📈 {history.length} sessions</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs" style={{color:"var(--muted)",fontFamily:"'JetBrains Mono',monospace"}}>{completedSets}/{exercise.sets.length} sets</span>
            {volume>0&&<span className="text-xs" style={{color:"var(--accent)",fontFamily:"'JetBrains Mono',monospace"}}>{exercise.is_timed?fmtDuration(volume):`${volume}kg`}</span>}
            {prevExercise && (
              <span className="text-xs" style={{color:"rgba(255,255,255,0.25)"}}>
                prev: {prevExercise.sets.filter(s=>s.completed&&s.weight>0).reduce((a,s)=>a+s.weight*s.reps,0)}kg vol
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {history.length>=2 && (
            <button onClick={e=>{e.stopPropagation();setShowChart(o=>!o);}} title="Progress" className="p-1 rounded" style={{color:showChart?"#818cf8":"var(--muted)",background:showChart?"rgba(99,102,241,0.12)":"transparent"}}>
              <TrendingUp size={13}/>
            </button>
          )}
          <button onClick={e=>{e.stopPropagation();toggleTimed();}} className="p-1 rounded" style={{color:exercise.is_timed?"#2ed573":"var(--muted)",background:exercise.is_timed?"rgba(46,213,115,0.1)":"transparent"}}>
            <Timer size={12}/>
          </button>
          <button onClick={e=>{e.stopPropagation();onRemove();}} className="p-1 rounded" style={{color:"var(--muted)"}}><Trash2 size={12}/></button>
          {open?<ChevronUp size={14} style={{color:"var(--muted)"}}/>:<ChevronDown size={14} style={{color:"var(--muted)"}}/>}
        </div>
      </div>

      {/* Progress chart (collapsible) */}
      {open && showChart && history.length>=2 && (
        <div className="px-4 pb-3 pt-0" style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <div className="rounded-xl p-3" style={{background:"rgba(10,10,15,0.6)"}}>
            {weightData.length>=2 && (
              <div className="mb-3">
                <LineChart data={weightData} color="#e8c547" label="Max Weight" unit="kg" height={70}/>
              </div>
            )}
            {volData.length>=2 && (
              <LineChart data={volData} color="#818cf8" label="Session Volume" unit="kg" height={60}/>
            )}
            {/* Best ever */}
            <div className="flex gap-3 mt-3 pt-2" style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
              {weightData.length>0&&<div><p className="text-xs" style={{color:"var(--muted)"}}>Best weight</p><p className="text-sm font-bold" style={{color:"var(--accent)",fontFamily:"'JetBrains Mono',monospace"}}>{Math.max(...weightData.map(d=>d.y))}kg</p></div>}
              {volData.length>0&&<div><p className="text-xs" style={{color:"var(--muted)"}}>Best volume</p><p className="text-sm font-bold" style={{color:"#818cf8",fontFamily:"'JetBrains Mono',monospace"}}>{Math.max(...volData.map(d=>d.y))}kg</p></div>}
              <div><p className="text-xs" style={{color:"var(--muted)"}}>Sessions</p><p className="text-sm font-bold" style={{color:"#2ed573",fontFamily:"'JetBrains Mono',monospace"}}>{history.length}</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Sets */}
      {open && (
        <div className="px-4 pb-3">
          {!exercise.is_timed&&(
            <div className="flex items-center gap-2 pb-1 mb-1" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <span className="text-xs w-5" style={{color:"var(--muted)"}}>#</span>
              <span className="text-xs w-14 text-center" style={{color:"var(--muted)"}}>kg</span>
              <span className="text-xs" style={{color:"var(--muted)"}}></span>
              <span className="text-xs w-12 text-center" style={{color:"var(--muted)"}}>Reps</span>
              <span className="text-xs w-10 text-center" style={{color:"var(--muted)"}}>RPE</span>
            </div>
          )}
          {exercise.sets.map((set,idx)=>
            exercise.is_timed
              ?<TimedSetRow key={idx} set={set} prevSet={prevSet(idx)} onUpdate={u=>updateSet(idx,u)} onRemove={()=>{const sets=exercise.sets.filter((_,i)=>i!==idx).map((s,i)=>({...s,set_number:i+1}));onUpdate({sets});}}/>
              :<SetRow key={idx} set={set} prevSet={prevSet(idx)} onUpdate={u=>updateSet(idx,u)} onRemove={()=>{const sets=exercise.sets.filter((_,i)=>i!==idx).map((s,i)=>({...s,set_number:i+1}));onUpdate({sets});}}/>
          )}
          <button onClick={addSet} className="w-full mt-2 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1" style={{border:"1px dashed rgba(232,197,71,0.25)",color:"var(--accent)"}}>
            <Plus size={11}/> Add Set
          </button>
          {exercise.notes&&<p className="text-xs mt-2 px-1" style={{color:"var(--muted)",fontStyle:"italic"}}>💡 {exercise.notes}</p>}
          <input value={exercise.notes||""} onChange={e=>onUpdate({notes:e.target.value})} className="input-field text-xs mt-1" style={{padding:"0.3rem 0.6rem"}} placeholder="Notes..."/>
        </div>
      )}
    </div>
  );
}

// ── ADD EXERCISE PANEL ─────────────────────────────────────────────────────────
function AddExercisePanel({ split, onAdd, onClose }: { split: WorkoutSplit; onAdd: (e: Exercise) => void; onClose: () => void }) {
  const [category, setCategory] = useState<ExerciseCategory>(SPLIT_CATEGORIES[split][0]);
  const [custom, setCustom] = useState("");
  const [isTimed, setIsTimed] = useState(false);
  function add(name:string,timed=isTimed) {
    onAdd({id:uid(),name,category,order:0,is_timed:timed,sets:[{set_number:1,weight:0,reps:timed?0:8,duration_seconds:timed?60:undefined,set_type:timed?"duration":"reps" as any,completed:false}]});
    onClose();
  }
  return (
    <div className="rounded-xl p-4 mb-3 animate-slide-down" style={{background:"rgba(10,10,15,0.95)",border:"1px solid rgba(232,197,71,0.25)"}}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{color:"#fff"}}>Add Exercise</span>
        <button onClick={onClose} style={{color:"var(--muted)"}}><X size={14}/></button>
      </div>
      <div className="flex gap-1 flex-wrap mb-3">
        {SPLIT_CATEGORIES[split].map(cat=>(
          <button key={cat} onClick={()=>setCategory(cat)} className="text-xs px-2.5 py-1 rounded-lg capitalize" style={{background:category===cat?"var(--accent)":"rgba(255,255,255,0.06)",color:category===cat?"#0a0a0f":"var(--muted)"}}>
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 mb-3 max-h-40 overflow-y-auto">
        {EXERCISE_TEMPLATES[category]?.map(({name,is_timed:t})=>(
          <button key={name} onClick={()=>add(name,t||false)} className="text-left text-xs px-3 py-2 rounded-lg flex items-center gap-1.5" style={{background:"rgba(255,255,255,0.04)",color:"var(--soft)",border:"1px solid rgba(255,255,255,0.06)"}}>
            {t&&<Timer size={9} style={{color:"#2ed573",flexShrink:0}}/>}{name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={()=>setIsTimed(t=>!t)} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded" style={{background:isTimed?"rgba(46,213,115,0.15)":"rgba(255,255,255,0.05)",color:isTimed?"#2ed573":"var(--muted)",border:`1px solid ${isTimed?"rgba(46,213,115,0.3)":"var(--border)"}`}}>
          <Timer size={11}/>{isTimed?"Timed":"Reps"}
        </button>
      </div>
      <div className="flex gap-2">
        <input value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>e.key==="Enter"&&custom.trim()&&add(custom.trim())} className="input-field text-sm flex-1" style={{padding:"0.4rem 0.7rem"}} placeholder="Custom exercise name..." autoFocus/>
        <button onClick={()=>custom.trim()&&add(custom.trim())} disabled={!custom.trim()} className="btn-primary text-xs px-3 flex items-center gap-1"><Plus size={11}/> Add</button>
      </div>
    </div>
  );
}

// ── SESSION VIEW ───────────────────────────────────────────────────────────────
function SessionView({ session, prevSession, allSessions, onUpdate, onDelete }: {
  session: GymSession;
  prevSession: GymSession | null;
  allSessions: GymSession[];
  onUpdate: (u: Partial<GymSession>) => void;
  onDelete: () => void;
}) {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [playing, setPlaying] = useState(false);

  if (playing) return <WorkoutPlayer session={session} onUpdate={onUpdate} onClose={()=>setPlaying(false)}/>;

  const split = SPLITS.find(s=>s.key===session.split)!;
  const volume = calcVolume(session.exercises);
  const prevVolume = prevSession ? calcVolume(prevSession.exercises) : 0;
  const completedExercises = session.exercises.filter(ex=>ex.sets.every(s=>s.completed)).length;

  function addExercise(exercise:Exercise) {
    const exercises=[...session.exercises,{...exercise,order:session.exercises.length}];
    onUpdate({exercises,total_volume:calcVolume(exercises)});
  }
  function updateExercise(id:string,updates:Partial<Exercise>) {
    const exercises=session.exercises.map(ex=>ex.id===id?{...ex,...updates}:ex);
    onUpdate({exercises,total_volume:calcVolume(exercises)});
  }
  function removeExercise(id:string) {
    const exercises=session.exercises.filter(ex=>ex.id!==id);
    onUpdate({exercises,total_volume:calcVolume(exercises)});
  }

  // Match prev exercises by name
  function prevExerciseFor(name:string) { return prevSession?.exercises.find(e=>e.name===name); }

  // Volume trend
  const volDiff = prevVolume > 0 ? volume - prevVolume : 0;

  return (
    <div className="animate-fade-in">
      {/* Session header card */}
      <div className="rounded-xl p-4 mb-3" style={{background:`linear-gradient(135deg,${split.color}18 0%,rgba(26,26,36,0.9) 100%)`,border:`1px solid ${split.color}30`}}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{background:split.color,color:"#0a0a0f"}}>{split.short}</span>
              <span className="text-sm font-semibold" style={{color:"#fff",fontFamily:"'Playfair Display',serif"}}>{split.label}</span>
            </div>
            <p className="text-xs" style={{color:"var(--muted)"}}>{split.muscles}</p>
          </div>
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{color:"var(--muted)",background:"rgba(255,71,87,0.1)"}}><Trash2 size={14}/></button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label:"Volume", value:volume>0?`${volume}kg`:"—", sub:prevVolume>0?`prev ${prevVolume}kg`:"", color:"var(--accent)", trend:volDiff },
            { label:"Exercises", value:`${completedExercises}/${session.exercises.length}`, sub:"", color:"#2ed573", trend:0 },
            { label:"Warmup", value:session.warmup_done?"Done ✓":"Pending", sub:"", color:session.warmup_done?"#2ed573":"var(--warning)", trend:0 },
          ].map(({label,value,sub,color,trend})=>(
            <div key={label} className="rounded-lg p-2 text-center" style={{background:"rgba(10,10,15,0.5)"}}>
              <p className="text-xs font-bold" style={{color,fontFamily:"'JetBrains Mono',monospace"}}>{value}</p>
              {trend!==0&&<p className="text-xs" style={{color:trend>0?"#2ed573":"#ff4757",fontSize:"9px"}}>{trend>0?"+":""}{trend}kg</p>}
              {sub&&!trend&&<p style={{color:"rgba(255,255,255,0.2)",fontSize:"9px",fontFamily:"'JetBrains Mono',monospace"}}>{sub}</p>}
              <p style={{color:"var(--muted)",fontSize:"10px"}}>{label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={()=>onUpdate({warmup_done:!session.warmup_done})} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{background:session.warmup_done?"rgba(46,213,115,0.15)":"rgba(255,255,255,0.05)",color:session.warmup_done?"#2ed573":"var(--muted)",border:`1px solid ${session.warmup_done?"rgba(46,213,115,0.3)":"var(--border)"}`}}>
            {session.warmup_done&&<Check size={11}/>} WarmUp: {session.warmup_type||"1km Run"}
          </button>
          <div className="flex items-center gap-1">
            <input type="number" value={session.duration_minutes||""} onChange={e=>onUpdate({duration_minutes:parseInt(e.target.value)||undefined})} className="input-field text-xs" style={{padding:"0.3rem 0.5rem",width:"60px"}} placeholder="mins"/>
            <span className="text-xs" style={{color:"var(--muted)"}}>min</span>
          </div>
        </div>
        {prevSession&&(
          <p className="text-xs mt-2" style={{color:"rgba(255,255,255,0.25)"}}>
            vs {new Date(prevSession.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
            {prevSession.duration_minutes?` · ${prevSession.duration_minutes}min`:""}
          </p>
        )}
        <input value={session.notes||""} onChange={e=>onUpdate({notes:e.target.value})} className="input-field text-xs mt-2" style={{padding:"0.35rem 0.6rem"}} placeholder="Session notes..."/>
      </div>

      {showAddExercise&&<AddExercisePanel split={session.split} onAdd={addExercise} onClose={()=>setShowAddExercise(false)}/>}
      {session.exercises.length===0&&!showAddExercise&&(
        <div className="text-center py-8 rounded-xl mb-3" style={{background:"rgba(26,26,36,0.5)",border:"1px dashed rgba(255,255,255,0.08)"}}>
          <Dumbbell size={28} className="mx-auto mb-2" style={{color:"var(--muted)"}}/>
          <p className="text-sm" style={{color:"var(--muted)"}}>No exercises yet</p>
        </div>
      )}

      {session.exercises.map(ex=>(
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          prevExercise={prevExerciseFor(ex.name)}
          allSessions={allSessions}
          onUpdate={u=>updateExercise(ex.id,u)}
          onRemove={()=>removeExercise(ex.id)}
        />
      ))}

      <button onClick={()=>setShowAddExercise(o=>!o)} className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 mb-3" style={{background:"rgba(232,197,71,0.06)",border:"1px dashed rgba(232,197,71,0.25)",color:"var(--accent)"}}>
        <Plus size={14}/> Add Exercise
      </button>
      {session.exercises.length>0&&(
        <button onClick={()=>setPlaying(true)} className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-3" style={{background:"linear-gradient(135deg,#6366f1 0%,#a78bfa 100%)",color:"#fff",boxShadow:"0 4px 20px rgba(99,102,241,0.35)"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          Start Workout
        </button>
      )}
      <button onClick={()=>onUpdate({completed:!session.completed})} className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2" style={{background:session.completed?"rgba(46,213,115,0.15)":"var(--accent)",color:session.completed?"#2ed573":"#0a0a0f",border:session.completed?"1px solid rgba(46,213,115,0.3)":"none"}}>
        {session.completed?<><Check size={16}/> Session Complete!</>:<><Dumbbell size={16}/> Mark Complete</>}
      </button>
    </div>
  );
}

// ── BODY WEIGHT WIDGET with line chart ────────────────────────────────────────
function BodyWeightWidget({ logs, date, onAdd, onUpdate }: { logs: BodyWeightLog[]; date: string; onAdd: Props["onAddWeight"]; onUpdate: Props["onUpdateWeight"] }) {
  const sorted = [...logs].sort((a,b)=>a.date.localeCompare(b.date));
  const today = logs.find(l=>l.date===date);
  const [editing, setEditing] = useState(!today);
  const [val, setVal] = useState(today?String(today.weight_kg):"");

  // Keep editing state and val in sync when today changes (e.g. after save)
  useEffect(()=>{ if(today){ setEditing(false); setVal(String(today.weight_kg)); } else { setEditing(true); } },[today?.id]);

  async function save() {
    const kg=parseFloat(val); if(!kg) return;
    if(today){ await onUpdate(today.id,{weight_kg:kg}); }
    else { await onAdd({date,weight_kg:kg}); }
    setEditing(false);
  }

  const prev = sorted.filter(l=>l.date<date).slice(-1)[0];
  const diff = today && prev ? +(today.weight_kg - prev.weight_kg).toFixed(1) : null;
  const chartData = sorted.slice(-12).map(l=>({x:l.date,y:l.weight_kg}));

  return (
    <div className="rounded-xl p-4 mb-4" style={{background:"rgba(26,26,36,0.9)",border:"1px solid rgba(255,255,255,0.08)"}}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale size={14} style={{color:"var(--accent)"}}/>
          <span className="text-sm font-semibold" style={{color:"#fff"}}>Body Weight</span>
        </div>
        {today&&!editing&&<button onClick={()=>{setVal(String(today.weight_kg));setEditing(true);}} className="p-1 rounded" style={{color:"var(--muted)"}}><Pencil size={12}/></button>}
      </div>

      {(editing||!today)?(
        <div className="flex items-center gap-2 mb-3">
          <input type="number" value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} className="input-field text-xl font-bold flex-1" style={{padding:"0.5rem 0.75rem",fontFamily:"'JetBrains Mono',monospace",color:"var(--accent)"}} placeholder="e.g. 72.5" autoFocus step="0.1"/>
          <span className="text-sm" style={{color:"var(--muted)"}}>kg</span>
          <button onClick={save} disabled={!val} className="btn-primary text-sm px-4 py-2 flex items-center gap-1"><Check size={13}/> Save</button>
        </div>
      ):(
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl font-bold" style={{color:"var(--accent)",fontFamily:"'JetBrains Mono',monospace"}}>{today?.weight_kg}</span>
          <span className="text-base" style={{color:"var(--muted)"}}>kg</span>
          {diff!==null&&(
            <span className="text-sm px-2.5 py-1 rounded-full font-bold flex items-center gap-1" style={{background:diff<0?"rgba(46,213,115,0.12)":diff>0?"rgba(255,71,87,0.12)":"rgba(255,255,255,0.06)",color:diff<0?"#2ed573":diff>0?"#ff4757":"var(--muted)"}}>
              {diff>0&&<TrendingUp size={12}/>}{diff<0&&<TrendingDown size={12}/>}
              {diff>0?"+":""}{diff} kg
            </span>
          )}
        </div>
      )}

      {/* Line chart */}
      {chartData.length>=2&&(
        <div className="pt-2" style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <LineChart data={chartData} color="#e8c547" label="Weight trend" unit="kg" height={80} showDots={true} showArea={true} showLabels={true}/>
          {/* Stats row */}
          <div className="flex gap-4 mt-2">
            {[
              {label:"Lowest",value:Math.min(...chartData.map(d=>d.y)),color:"#2ed573"},
              {label:"Highest",value:Math.max(...chartData.map(d=>d.y)),color:"#ff4757"},
              {label:"Avg",value:+(chartData.reduce((a,d)=>a+d.y,0)/chartData.length).toFixed(1),color:"var(--muted)"},
            ].map(({label,value,color})=>(
              <div key={label}>
                <p className="text-xs" style={{color:"var(--muted)"}}>{label}</p>
                <p className="text-sm font-bold" style={{color,fontFamily:"'JetBrains Mono',monospace"}}>{value}kg</p>
              </div>
            ))}
            <div>
              <p className="text-xs" style={{color:"var(--muted)"}}>Entries</p>
              <p className="text-sm font-bold" style={{color:"var(--accent)",fontFamily:"'JetBrains Mono',monospace"}}>{chartData.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────────
export default function Gym({ sessions, bodyWeightLogs, selectedDate, onAdd, onUpdate, onDelete, onAddWeight, onUpdateWeight }: Props) {
  const date = selectedDate || new Date().toISOString().split("T")[0];
  const todaySession = sessions.find(s=>s.date===date);
  const [creating, setCreating] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit>("chest_triceps_abs");
  const [usePreset, setUsePreset] = useState(true);

  async function createSession() {
    const split=SPLITS.find(s=>s.key===selectedSplit)!;
    // Find the most recent session with same split to pre-load weights
    const prevForNewSession = getPrevSession(sessions, date, selectedSplit);
    await onAdd({date,split:selectedSplit,split_label:split.label,exercises:usePreset&&selectedSplit!=="custom"?buildPresetExercises(selectedSplit, prevForNewSession):[],warmup_done:false,warmup_type:"1km Run",completed:false});
    setCreating(false);
  }

  const prevSession = todaySession ? getPrevSession(sessions, date, todaySession.split) : null;
  const recentSessions = sessions.filter(s=>s.date!==date).slice(0,4);

  // Volume chart across all sessions (by split)
  const volumeByDate = sessions
    .filter(s=>s.total_volume&&s.total_volume>0)
    .sort((a,b)=>a.date.localeCompare(b.date))
    .slice(-16)
    .map(s=>({x:s.date,y:s.total_volume||0}));

  return (
    <div className="pb-20 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{color:"#fff",fontFamily:"'Playfair Display',serif"}}>Gym</h2>
          <p className="text-xs" style={{color:"var(--muted)"}}>{date===new Date().toISOString().split("T")[0]?"Today":new Date(date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</p>
        </div>
        {!todaySession&&!creating&&<button onClick={()=>setCreating(true)} className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3"><Plus size={13}/> New Session</button>}
      </div>

      {/* Body weight */}
      <BodyWeightWidget logs={bodyWeightLogs} date={date} onAdd={onAddWeight} onUpdate={onUpdateWeight}/>

      {/* Overall volume chart */}
      {volumeByDate.length>=3&&(
        <div className="rounded-xl p-4 mb-4" style={{background:"rgba(26,26,36,0.8)",border:"1px solid rgba(255,255,255,0.07)"}}>
          <LineChart data={volumeByDate} color="#a78bfa" label="Total Session Volume" unit="kg" height={80}/>
        </div>
      )}

      {/* Create session */}
      {creating&&(
        <div className="rounded-xl p-4 mb-4 animate-slide-down" style={{background:"rgba(26,26,36,0.9)",border:"1px solid rgba(232,197,71,0.2)"}}>
          <p className="text-sm font-semibold mb-3" style={{color:"#fff"}}>Choose Your Split</p>
          <div className="space-y-2 mb-3">
            {SPLITS.map(s=>(
              <button key={s.key} onClick={()=>setSelectedSplit(s.key)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{background:selectedSplit===s.key?`${s.color}18`:"rgba(255,255,255,0.03)",border:`1px solid ${selectedSplit===s.key?`${s.color}50`:"rgba(255,255,255,0.07)"}`}}>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{background:s.color,color:"#0a0a0f",minWidth:52,textAlign:"center"}}>{s.short}</span>
                <div><p className="text-sm" style={{color:"#fff"}}>{s.label}</p><p className="text-xs" style={{color:"var(--muted)"}}>{s.muscles}</p></div>
              </button>
            ))}
          </div>
          {selectedSplit!=="custom"&&(
            <button onClick={()=>setUsePreset(p=>!p)} className="w-full flex items-center gap-2 p-2.5 rounded-lg mb-3 text-sm" style={{background:usePreset?"rgba(232,197,71,0.08)":"rgba(255,255,255,0.03)",border:`1px solid ${usePreset?"rgba(232,197,71,0.25)":"var(--border)"}`,color:usePreset?"var(--accent)":"var(--muted)"}}>
              {usePreset?<Check size={14}/>:<div className="w-3.5 h-3.5 rounded border" style={{borderColor:"var(--border)"}}/>}
              Load Guruji's preset exercises
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={createSession} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2"><Dumbbell size={14}/> Start Session</button>
            <button onClick={()=>setCreating(false)} className="btn-ghost text-sm px-4"><X size={14}/></button>
          </div>
        </div>
      )}

      {todaySession&&<SessionView session={todaySession} prevSession={prevSession} allSessions={sessions} onUpdate={u=>onUpdate(todaySession.id,u)} onDelete={()=>onDelete(todaySession.id)}/>}

      {!todaySession&&!creating&&(
        <div className="text-center py-10 rounded-xl mb-4" style={{background:"rgba(26,26,36,0.5)",border:"1px solid var(--border)"}}>
          <Dumbbell size={36} className="mx-auto mb-3" style={{color:"var(--muted)"}}/>
          <p className="font-semibold" style={{color:"var(--soft)"}}>No session for this day</p>
          <p className="text-xs mt-1 mb-4" style={{color:"var(--muted)"}}>Your Guruji workout plan is ready to load</p>
          <button onClick={()=>setCreating(true)} className="btn-primary text-sm inline-flex items-center gap-2"><Plus size={14}/> New Session</button>
        </div>
      )}

      {recentSessions.length>0&&(
        <div>
          <p className="text-xs mb-2" style={{color:"var(--muted)"}}>Recent Sessions</p>
          {recentSessions.map(s=>{
            const spl=SPLITS.find(sp=>sp.key===s.split);
            return(
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{background:"rgba(26,26,36,0.6)",border:"1px solid rgba(255,255,255,0.06)"}}>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{background:spl?.color||"#e8c547",color:"#0a0a0f",minWidth:44,textAlign:"center"}}>{spl?.short||"GYM"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{color:"var(--soft)"}}>{s.split_label}</p>
                  <p className="text-xs" style={{color:"var(--muted)"}}>
                    {new Date(s.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                    {s.total_volume?` · ${s.total_volume}kg`:""}
                    {s.duration_minutes?` · ${s.duration_minutes}min`:""}
                  </p>
                </div>
                {s.completed&&<Check size={14} style={{color:"#2ed573",flexShrink:0}}/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
