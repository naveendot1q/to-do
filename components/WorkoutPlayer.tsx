"use client";

/**
 * WorkoutPlayer — Full-screen guided workout mode
 * Inspired by LeapFitness UX: one exercise at a time, large display,
 * animated rest timer, prev/next navigation, live set editing.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, ChevronLeft, ChevronRight, Check, Pause, Play,
  SkipForward, Plus, Minus, Settings2, RotateCcw, Trophy,
  Timer, Dumbbell, Pencil, Weight
} from "lucide-react";
import { GymSession, Exercise, ExerciseSet } from "@/lib/types";

interface Props {
  session: GymSession;
  onUpdate: (updates: Partial<GymSession>) => void;
  onClose: () => void;
}

// ── FLATTEN: exercises × sets → a linear list of "steps" ─────────────────────
interface WorkoutStep {
  exerciseIdx: number;
  setIdx: number;
  exercise: Exercise;
  set: ExerciseSet;
  isLastSetOfExercise: boolean;
  isLastStep: boolean;
}

function buildSteps(exercises: Exercise[]): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  exercises.forEach((ex, ei) => {
    ex.sets.forEach((set, si) => {
      steps.push({
        exerciseIdx: ei,
        setIdx: si,
        exercise: ex,
        set,
        isLastSetOfExercise: si === ex.sets.length - 1,
        isLastStep: ei === exercises.length - 1 && si === ex.sets.length - 1,
      });
    });
  });
  return steps;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── CATEGORY EMOJI MAP ────────────────────────────────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  chest: "🫀", back: "🦾", shoulders: "🏋️", biceps: "💪", triceps: "🔱",
  legs: "🦵", abs: "🎯", forearms: "✊", cardio: "🏃", compound: "⚡",
};

// ── REST SCREEN ───────────────────────────────────────────────────────────────
function RestScreen({
  restSeconds, nextStep, onDone, onSkip, onAdjust,
}: {
  restSeconds: number;
  nextStep: WorkoutStep | null;
  onDone: () => void;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(restSeconds);
  const [paused, setPaused] = useState(false);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setTimeLeft(restSeconds); }, [restSeconds]);

  useEffect(() => {
    if (paused) { if (ivRef.current) clearInterval(ivRef.current); return; }
    ivRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(ivRef.current!); onDone(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, [paused, onDone]);

  const pct = Math.max(0, (timeLeft / restSeconds) * 100);
  const circumference = 2 * Math.PI * 54; // r=54
  const strokeDash = (pct / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#1a1aff" }}>
      {/* Next exercise preview */}
      {nextStep && (
        <div className="px-5 pt-12 pb-3">
          <p className="text-xs font-bold opacity-70" style={{ letterSpacing: "0.12em", color: "#fff" }}>
            NEXT {nextStep.setIdx + 1}/{nextStep.exercise.sets.length} · {nextStep.exercise.name.toUpperCase()}
          </p>
          <p className="text-sm font-semibold" style={{ color: "#fff", opacity: 0.9 }}>
            {nextStep.exercise.is_timed
              ? `${Math.floor((nextStep.set.duration_seconds || 60) / 60)}m ${(nextStep.set.duration_seconds || 60) % 60}s`
              : `× ${nextStep.set.reps}`}
          </p>
        </div>
      )}

      {/* REST label */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-xl font-bold mb-6" style={{ color: "#fff", letterSpacing: "0.15em" }}>REST</p>

        {/* Circular timer */}
        <div className="relative" style={{ width: 140, height: 140 }}>
          <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
            <circle cx="70" cy="70" r="54" fill="none" stroke="#fff" strokeWidth="8"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeLinecap="round" style={{ transition: "stroke-dasharray 0.9s linear" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold" style={{ color: "#fff", fontFamily: "'JetBrains Mono',monospace" }}>{fmtTime(timeLeft)}</span>
          </div>
        </div>

        {/* Adjust rest time */}
        <div className="flex items-center gap-4 mt-6">
          <button onClick={() => { onAdjust(-10); setTimeLeft(t => Math.max(5, t - 10)); }}
            className="px-5 py-2.5 rounded-full font-bold text-sm"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>−10s</button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
            onClick={() => setPaused(p => !p)}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={() => { onAdjust(20); setTimeLeft(t => t + 20); }}
            className="px-5 py-2.5 rounded-full font-bold text-sm"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>+20s</button>
        </div>
      </div>

      {/* Skip */}
      <div className="px-5 pb-10">
        <button onClick={onSkip} className="w-full py-4 rounded-2xl text-base font-bold"
          style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
          Skip Rest
        </button>
      </div>
    </div>
  );
}

// ── EDIT PANEL (slide-up) ─────────────────────────────────────────────────────
function EditPanel({
  step, onUpdate, onClose, onAddSet, onRemoveSet,
}: {
  step: WorkoutStep;
  onUpdate: (exIdx: number, setIdx: number, updates: Partial<ExerciseSet>) => void;
  onClose: () => void;
  onAddSet: (exIdx: number) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
}) {
  const ex = step.exercise;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
        style={{ background: "rgba(20,20,30,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold" style={{ color: "#fff" }}>{ex.name}</p>
            <p className="text-xs capitalize" style={{ color: "var(--muted)" }}>{ex.category}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted)" }}><X size={18} /></button>
        </div>

        {/* Set editor */}
        <div className="mb-4">
          <div className="flex items-center gap-2 pb-2 mb-1 text-xs" style={{ color: "var(--muted)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="w-6">#</span>
            {ex.is_timed ? <><span className="flex-1">Duration</span></> : <><span className="w-16 text-center">Weight (kg)</span><span className="w-3"></span><span className="w-14 text-center">Reps</span></>}
            <span className="w-10 text-center">RPE</span>
          </div>
          {ex.sets.map((set, si) => (
            <div key={si} className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="w-6 text-xs text-center" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{si + 1}</span>
              {ex.is_timed ? (
                <div className="flex items-center gap-1 flex-1">
                  <input type="number" value={Math.floor((set.duration_seconds || 60) / 60)}
                    onChange={e => onUpdate(step.exerciseIdx, si, { duration_seconds: parseInt(e.target.value) * 60 + ((set.duration_seconds || 60) % 60) })}
                    className="input-field text-sm text-center" style={{ padding: "0.3rem", width: "48px" }} />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>m</span>
                  <input type="number" value={(set.duration_seconds || 60) % 60}
                    onChange={e => onUpdate(step.exerciseIdx, si, { duration_seconds: Math.floor((set.duration_seconds || 60) / 60) * 60 + parseInt(e.target.value) })}
                    className="input-field text-sm text-center" style={{ padding: "0.3rem", width: "48px" }} />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>s</span>
                </div>
              ) : (
                <>
                  <input type="number" value={set.weight || ""}
                    onChange={e => onUpdate(step.exerciseIdx, si, { weight: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm text-center" style={{ padding: "0.3rem", width: "64px" }} placeholder="kg" />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>×</span>
                  <input type="number" value={set.reps || ""}
                    onChange={e => onUpdate(step.exerciseIdx, si, { reps: parseInt(e.target.value) || 0 })}
                    className="input-field text-sm text-center" style={{ padding: "0.3rem", width: "52px" }} placeholder="reps" />
                </>
              )}
              <input type="number" value={set.rpe || ""}
                onChange={e => onUpdate(step.exerciseIdx, si, { rpe: parseInt(e.target.value) || undefined })}
                className="input-field text-xs text-center" style={{ padding: "0.25rem", width: "44px" }} placeholder="RPE" />
              <button onClick={() => onRemoveSet(step.exerciseIdx, si)} style={{ color: "var(--muted)" }}><Minus size={13} /></button>
            </div>
          ))}
        </div>

        <button onClick={() => onAddSet(step.exerciseIdx)}
          className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 mb-3"
          style={{ border: "1px dashed rgba(232,197,71,0.3)", color: "var(--accent)" }}>
          <Plus size={14} /> Add Set
        </button>

        {/* Notes */}
        <input defaultValue={ex.notes || ""}
          onBlur={e => {
            // Update notes via a no-op set update (parent handles full exercise update)
            // We'll handle this separately
          }}
          className="input-field text-sm w-full" style={{ padding: "0.4rem 0.6rem" }}
          placeholder="Exercise notes..." />

        {ex.notes && (
          <p className="text-xs mt-2 px-1" style={{ color: "var(--muted)", fontStyle: "italic" }}>💡 {ex.notes}</p>
        )}
      </div>
    </div>
  );
}

// ── COMPLETION SCREEN ─────────────────────────────────────────────────────────
function CompletionScreen({ session, elapsed, onClose }: { session: GymSession; elapsed: number; onClose: () => void }) {
  const totalSets = session.exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const completedSets = session.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed).length, 0);
  const volume = session.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed && !ex.is_timed).reduce((b, s) => b + s.weight * s.reps, 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(135deg, #0a0a0f 0%, rgba(46,213,115,0.12) 100%)" }}>
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(46,213,115,0.15)", border: "2px solid rgba(46,213,115,0.4)" }}>
          <Trophy size={36} style={{ color: "#2ed573" }} />
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>
          Session Done! 🎉
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>{session.split_label}</p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Time", value: fmtTime(elapsed), color: "var(--accent)" },
            { label: "Sets", value: `${completedSets}/${totalSets}`, color: "#2ed573" },
            { label: "Volume", value: volume > 0 ? `${volume}kg` : "—", color: "#a78bfa" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(26,26,36,0.9)" }}>
              <p className="text-xl font-bold" style={{ color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="w-full py-4 rounded-2xl text-base font-bold"
          style={{ background: "var(--accent)", color: "#0a0a0f" }}>
          Done
        </button>
      </div>
    </div>
  );
}

// ── MAIN WORKOUT PLAYER ───────────────────────────────────────────────────────
export default function WorkoutPlayer({ session, onUpdate, onClose }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>(() =>
    session.exercises.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })) }))
  );
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<"exercise" | "rest" | "done">("exercise");
  const [restSeconds, setRestSeconds] = useState(90);
  const [showEdit, setShowEdit] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timed exercise state
  const [timedRunning, setTimedRunning] = useState(false);
  const [timedLeft, setTimedLeft] = useState(0);
  const timedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => { elapsedRef.current += 1; setElapsed(e => e + 1); }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const steps = buildSteps(exercises);
  const step = steps[stepIdx];
  const nextStep = steps[stepIdx + 1] || null;

  // Sync timed exercise when step changes
  useEffect(() => {
    if (timedRef.current) { clearInterval(timedRef.current); timedRef.current = null; }
    setTimedRunning(false);
    if (step?.exercise.is_timed) {
      setTimedLeft(step.set.duration_seconds || 60);
    }
  }, [stepIdx]);

  // Timed exercise countdown
  useEffect(() => {
    if (!timedRunning) { if (timedRef.current) clearInterval(timedRef.current); return; }
    timedRef.current = setInterval(() => {
      setTimedLeft(t => {
        if (t <= 1) {
          clearInterval(timedRef.current!);
          setTimedRunning(false);
          markCurrentSetDone();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timedRef.current) clearInterval(timedRef.current); };
  }, [timedRunning]);

  function saveExercises(updated: Exercise[]) {
    setExercises(updated);
    const volume = updated.reduce((a, ex) => a + ex.sets.filter(s => s.completed && !ex.is_timed).reduce((b, s) => b + s.weight * s.reps, 0), 0);
    onUpdate({ exercises: updated, total_volume: volume });
  }

  function updateSet(exIdx: number, setIdx: number, updates: Partial<ExerciseSet>) {
    const updated = exercises.map((ex, ei) =>
      ei !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, ...updates }) }
    );
    saveExercises(updated);
    // Keep steps in sync if it's current step
    if (exIdx === step.exerciseIdx && setIdx === step.setIdx) {
      // step object will re-derive from exercises next render
    }
  }

  function addSet(exIdx: number) {
    const ex = exercises[exIdx];
    const last = ex.sets[ex.sets.length - 1];
    const newSet: ExerciseSet = {
      set_number: ex.sets.length + 1,
      weight: last?.weight || 0,
      reps: last?.reps || 8,
      duration_seconds: ex.is_timed ? (last?.duration_seconds || 60) : undefined,
      set_type: ex.is_timed ? "duration" : "reps",
      completed: false,
    };
    const updated = exercises.map((e, i) => i !== exIdx ? e : { ...e, sets: [...e.sets, newSet] });
    saveExercises(updated);
  }

  function removeSet(exIdx: number, setIdx: number) {
    const updated = exercises.map((e, i) =>
      i !== exIdx ? e : { ...e, sets: e.sets.filter((_, si) => si !== setIdx).map((s, si) => ({ ...s, set_number: si + 1 })) }
    );
    saveExercises(updated);
  }

  function markCurrentSetDone() {
    const updated = exercises.map((ex, ei) =>
      ei !== step.exerciseIdx ? ex : { ...ex, sets: ex.sets.map((s, si) => si !== step.setIdx ? s : { ...s, completed: true }) }
    );
    saveExercises(updated);
  }

  function handleDone() {
    markCurrentSetDone();
    if (step.isLastStep) {
      onUpdate({ completed: true, duration_minutes: Math.round(elapsedRef.current / 60) });
      setPhase("done");
    } else {
      setPhase("rest");
    }
  }

  function handleRestDone() {
    setPhase("exercise");
    setStepIdx(i => Math.min(i + 1, steps.length - 1));
  }

  function handlePrev() {
    if (stepIdx > 0) { setPhase("exercise"); setStepIdx(i => i - 1); }
  }

  function handleNext() {
    if (step.isLastStep) { setPhase("done"); }
    else { setPhase("exercise"); setStepIdx(i => Math.min(i + 1, steps.length - 1)); }
  }

  if (phase === "done") {
    return <CompletionScreen session={{ ...session, exercises }} elapsed={elapsed} onClose={onClose} />;
  }

  if (phase === "rest") {
    return (
      <RestScreen
        restSeconds={restSeconds}
        nextStep={nextStep}
        onDone={handleRestDone}
        onSkip={handleRestDone}
        onAdjust={delta => setRestSeconds(r => Math.max(10, r + delta))}
      />
    );
  }

  if (!step) return null;

  const { exercise: ex, set, setIdx: curSet, exerciseIdx: curEx } = step;
  const totalExercises = exercises.length;
  const totalSetsInExercise = ex.sets.length;
  const completedSteps = steps.slice(0, stepIdx).filter(s => s.set.completed).length;
  const overallPct = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
  const splitColor = session.split === "chest_triceps_abs" ? "#ff4757" : session.split === "back_biceps_abs" ? "#2ed573" : session.split === "legs_shoulders_cardio" ? "#a78bfa" : "#e8c547";
  const timedTarget = set.duration_seconds || 60;
  const timedPct = timedTarget > 0 ? Math.max(0, (timedLeft / timedTarget) * 100) : 0;
  const timedCirc = 2 * Math.PI * 60; // r=60

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#0a0a0f" }}>

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-5 pt-12 pb-3">
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
            <X size={18} style={{ color: "#fff" }} />
          </button>
          <div className="text-center">
            <p className="text-xs font-bold" style={{ color: splitColor, letterSpacing: "0.1em" }}>
              {session.split_label.toUpperCase()}
            </p>
            <p className="text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
              {fmtTime(elapsed)}
            </p>
          </div>
          <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
            <Settings2 size={16} style={{ color: "#fff" }} />
          </button>
        </div>

        {/* ── OVERALL PROGRESS BAR ── */}
        <div className="px-5 mb-4">
          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
            <span>Exercise {curEx + 1}/{totalExercises}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{overallPct}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${overallPct}%`, background: splitColor }} />
          </div>
        </div>

        {/* ── EXERCISE ILLUSTRATION AREA ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-0">

          {/* Category icon / illustration placeholder */}
          <div className="w-36 h-36 rounded-full flex items-center justify-center mb-6"
            style={{ background: `${splitColor}12`, border: `2px solid ${splitColor}25` }}>
            <span style={{ fontSize: "4rem" }}>{CAT_EMOJI[ex.category] || "💪"}</span>
          </div>

          {/* Exercise name */}
          <h2 className="text-2xl font-bold text-center mb-1" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>
            {ex.name.toUpperCase()}
          </h2>
          <p className="text-sm capitalize mb-6" style={{ color: "var(--muted)" }}>
            {ex.category} · Set {curSet + 1} of {totalSetsInExercise}
          </p>

          {/* SET DOTS */}
          <div className="flex items-center gap-2 mb-6">
            {ex.sets.map((s, i) => (
              <div key={i} className="rounded-full transition-all"
                style={{
                  width: i === curSet ? 28 : 10, height: 10,
                  background: s.completed ? "#2ed573" : i === curSet ? splitColor : "rgba(255,255,255,0.15)",
                }} />
            ))}
          </div>

          {/* MAIN DISPLAY: timed or reps */}
          {ex.is_timed ? (
            <div className="flex flex-col items-center">
              {/* Circular countdown */}
              <div className="relative mb-4" style={{ width: 140, height: 140 }}>
                <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                  <circle cx="70" cy="70" r="60" fill="none" stroke={splitColor} strokeWidth="8"
                    strokeDasharray={`${(timedPct / 100) * timedCirc} ${timedCirc}`}
                    strokeLinecap="round" style={{ transition: "stroke-dasharray 0.9s linear" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: "#fff", fontFamily: "'JetBrains Mono',monospace" }}>{fmtTime(timedLeft)}</span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>/ {fmtTime(timedTarget)}</span>
                </div>
              </div>
              <button onClick={() => setTimedRunning(r => !r)}
                className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-base"
                style={{ background: timedRunning ? "rgba(255,71,87,0.2)" : `${splitColor}22`, color: timedRunning ? "#ff4757" : splitColor, border: `1.5px solid ${timedRunning ? "rgba(255,71,87,0.4)" : `${splitColor}50`}` }}>
                {timedRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start Timer</>}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Weight */}
              {set.weight > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => updateSet(curEx, curSet, { weight: Math.max(0, set.weight - 2.5) })}
                    className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Minus size={14} style={{ color: "#fff" }} /></button>
                  <span className="text-lg font-bold" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", minWidth: 80, textAlign: "center" }}>{set.weight} kg</span>
                  <button onClick={() => updateSet(curEx, curSet, { weight: set.weight + 2.5 })}
                    className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><Plus size={14} style={{ color: "#fff" }} /></button>
                </div>
              )}

              {/* Reps — big display */}
              <div className="flex items-center gap-4 my-2">
                <button onClick={() => updateSet(curEx, curSet, { reps: Math.max(1, (set.reps || 1) - 1) })}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>−</button>
                <div className="text-center">
                  <span className="text-6xl font-black" style={{ color: "#fff", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>×{set.reps || "—"}</span>
                  <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Reps</p>
                </div>
                <button onClick={() => updateSet(curEx, curSet, { reps: (set.reps || 0) + 1 })}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>+</button>
              </div>

              {/* Weight quick set (if 0) */}
              {set.weight === 0 && (
                <button onClick={() => updateSet(curEx, curSet, { weight: 20 })}
                  className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(232,197,71,0.1)", color: "var(--accent)", border: "1px solid rgba(232,197,71,0.2)" }}>
                  <Weight size={11} /> Set weight
                </button>
              )}
            </div>
          )}

          {/* Notes tip */}
          {ex.notes && (
            <div className="mt-4 px-4 py-2 rounded-xl max-w-xs" style={{ background: "rgba(232,197,71,0.06)", border: "1px solid rgba(232,197,71,0.12)" }}>
              <p className="text-xs text-center" style={{ color: "var(--muted)" }}>💡 {ex.notes}</p>
            </div>
          )}
        </div>

        {/* ── BOTTOM CONTROLS ── */}
        <div className="px-5 pb-10 pt-4">
          {/* Rest timer adjuster */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Rest</span>
            <button onClick={() => setRestSeconds(r => Math.max(15, r - 15))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}><Minus size={11} style={{ color: "var(--muted)" }} /></button>
            <span className="text-xs font-bold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace", minWidth: 36, textAlign: "center" }}>{fmtTime(restSeconds)}</span>
            <button onClick={() => setRestSeconds(r => r + 15)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}><Plus size={11} style={{ color: "var(--muted)" }} /></button>
          </div>

          {/* Prev / Done / Next */}
          <div className="flex items-center gap-3">
            <button onClick={handlePrev} disabled={stepIdx === 0}
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.07)", opacity: stepIdx === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={24} style={{ color: "#fff" }} />
            </button>

            <button onClick={handleDone}
              className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-base"
              style={{ background: splitColor, color: "#0a0a0f" }}>
              <Check size={20} />
              {step.isLastStep ? "Finish Workout" : "Done"}
            </button>

            <button onClick={handleNext}
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <ChevronRight size={24} style={{ color: "#fff" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Panel overlay */}
      {showEdit && (
        <EditPanel
          step={{ ...step, exercise: exercises[step.exerciseIdx] }}
          onUpdate={updateSet}
          onClose={() => setShowEdit(false)}
          onAddSet={addSet}
          onRemoveSet={removeSet}
        />
      )}
    </>
  );
}
