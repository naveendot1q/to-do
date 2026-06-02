"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, ChevronLeft, ChevronRight, Check, Pause, Play,
  Plus, Minus, Settings2, Trophy, Timer, Weight
} from "lucide-react";
import { GymSession, Exercise, ExerciseSet } from "@/lib/types";
import Portal from "@/components/Portal";

interface Props {
  session: GymSession;
  onUpdate: (updates: Partial<GymSession>) => void;
  onClose: () => void;
}

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
        exerciseIdx: ei, setIdx: si, exercise: ex, set,
        isLastSetOfExercise: si === ex.sets.length - 1,
        isLastStep: ei === exercises.length - 1 && si === ex.sets.length - 1,
      });
    });
  });
  return steps;
}

function fmtTime(s: number) {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const CAT_EMOJI: Record<string, string> = {
  chest: "🫀", back: "🦾", shoulders: "🏋️", biceps: "💪", triceps: "🔱",
  legs: "🦵", abs: "🎯", forearms: "✊", cardio: "🏃", compound: "⚡",
};

// ─────────────────────────────────────────────────────────────────────────────
// REST SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function RestScreen({ initialSeconds, nextStep, onDone, onSkip }: {
  initialSeconds: number;
  nextStep: WorkoutStep | null;
  onDone: () => void;
  onSkip: () => void;
}) {
  // Store initial in a ref so it doesn't change between renders
  const initialRef = useRef(initialSeconds);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [paused, setPaused] = useState(false);
  const [addedTime, setAddedTime] = useState(0); // total added on top
  const doneFired = useRef(false);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown immediately on mount
  useEffect(() => {
    doneFired.current = false;
    function tick() {
      setTimeLeft(t => {
        if (t <= 1) {
          if (!doneFired.current) { doneFired.current = true; onDone(); }
          return 0;
        }
        return t - 1;
      });
    }
    ivRef.current = setInterval(tick, 1000);
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, []); // run once on mount only

  // Pause / resume
  useEffect(() => {
    if (paused) {
      if (ivRef.current) clearInterval(ivRef.current);
    } else {
      // Resume — restart the interval
      if (ivRef.current) clearInterval(ivRef.current);
      ivRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            if (!doneFired.current) { doneFired.current = true; onDone(); }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, [paused]);

  function adjustTime(delta: number) {
    setTimeLeft(t => Math.max(5, t + delta));
    setAddedTime(a => a + delta);
  }

  const total = initialRef.current + addedTime;
  const pct = total > 0 ? Math.max(0, (timeLeft / total) * 100) : 0;
  const r = 80;
  const circumference = 2 * Math.PI * r;
  const strokeDash = (pct / 100) * circumference;

  return (
    <Portal><div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
      background: "#1a1aff",
      display: "flex", flexDirection: "column",
      paddingTop: "env(safe-area-inset-top, 44px)",
      paddingBottom: "env(safe-area-inset-bottom, 16px)",
    }}>
      {/* Next exercise preview strip */}
      <div style={{ padding: "16px 20px 0" }}>
        {nextStep ? (
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 16, padding: "12px 16px" }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}>
              NEXT UP
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{nextStep.exercise.name}</p>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>
                {nextStep.exercise.is_timed
                  ? fmtTime(nextStep.set.duration_seconds || 60)
                  : `× ${nextStep.set.reps}`}
              </p>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 }}>
              Set {nextStep.setIdx + 1} of {nextStep.exercise.sets.length}
            </p>
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 16, padding: "12px 16px" }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>LAST SET — GREAT WORK! 🎉</p>
          </div>
        )}
      </div>

      {/* Centre — REST label + big ring */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "0.2em", marginBottom: 32 }}>REST</p>

        {/* Big SVG ring */}
        <div style={{ position: "relative", width: 200, height: 200 }}>
          <svg width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
            <circle cx="100" cy="100" r={r} fill="none" stroke="#fff" strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              style={{ transition: "stroke-dasharray 0.85s linear" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 44, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 2 }}>
              {fmtTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 36 }}>
          <button
            onClick={() => adjustTime(-10)}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 100, padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            −10s
          </button>
          <button
            onClick={() => setPaused(p => !p)}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 100, padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            {paused ? <><Play size={16} />Resume</> : <><Pause size={16} />Pause</>}
          </button>
          <button
            onClick={() => adjustTime(20)}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 100, padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            +20s
          </button>
        </div>
      </div>

      {/* Skip button */}
      <div style={{ padding: "0 20px 20px" }}>
        <button
          onClick={onSkip}
          style={{ width: "100%", padding: "18px", borderRadius: 20, background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", fontSize: 17, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em" }}>
          Skip Rest
        </button>
      </div>
    </div></Portal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT PANEL (slides up from bottom)
// ─────────────────────────────────────────────────────────────────────────────
function EditPanel({ step, onUpdate, onClose, onAddSet, onRemoveSet }: {
  step: WorkoutStep;
  onUpdate: (exIdx: number, setIdx: number, updates: Partial<ExerciseSet>) => void;
  onClose: () => void;
  onAddSet: (exIdx: number) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
}) {
  const ex = step.exercise;

  return (
    <Portal><div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
      onClick={onClose}>
      <div
        style={{ background: "#14141e", borderRadius: "24px 24px 0 0", padding: 20, maxHeight: "80vh", overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 16px))" }}
        onClick={e => e.stopPropagation()}>

        {/* Handle bar */}
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{ex.name}</p>
            <p style={{ color: "var(--muted)", fontSize: 12, textTransform: "capitalize" }}>{ex.category}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>

        {/* Table header */}
        <div style={{ display: "flex", gap: 8, paddingBottom: 8, marginBottom: 4, borderBottom: "1px solid rgba(255,255,255,0.07)", color: "var(--muted)", fontSize: 11 }}>
          <span style={{ width: 24 }}>#</span>
          {ex.is_timed
            ? <span style={{ flex: 1 }}>Duration</span>
            : <><span style={{ width: 70, textAlign: "center" }}>Weight (kg)</span><span style={{ width: 16 }}></span><span style={{ width: 60, textAlign: "center" }}>Reps</span></>
          }
          <span style={{ width: 48, textAlign: "center" }}>RPE</span>
          <span style={{ width: 24 }}></span>
        </div>

        {ex.sets.map((set, si) => (
          <div key={si} style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ width: 24, fontSize: 12, color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", textAlign: "center" }}>{si + 1}</span>
            {ex.is_timed ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                <input type="number" value={Math.floor((set.duration_seconds || 60) / 60)}
                  onChange={e => onUpdate(step.exerciseIdx, si, { duration_seconds: parseInt(e.target.value || "0") * 60 + ((set.duration_seconds || 60) % 60) })}
                  className="input-field" style={{ width: 48, padding: "0.3rem", textAlign: "center", fontSize: 13 }} />
                <span style={{ color: "var(--muted)", fontSize: 11 }}>m</span>
                <input type="number" value={(set.duration_seconds || 60) % 60}
                  onChange={e => onUpdate(step.exerciseIdx, si, { duration_seconds: Math.floor((set.duration_seconds || 60) / 60) * 60 + parseInt(e.target.value || "0") })}
                  className="input-field" style={{ width: 48, padding: "0.3rem", textAlign: "center", fontSize: 13 }} />
                <span style={{ color: "var(--muted)", fontSize: 11 }}>s</span>
              </div>
            ) : (
              <>
                <input type="number" value={set.weight || ""} onChange={e => onUpdate(step.exerciseIdx, si, { weight: parseFloat(e.target.value) || 0 })}
                  className="input-field" style={{ width: 70, padding: "0.3rem", textAlign: "center", fontSize: 13 }} placeholder="kg" />
                <span style={{ color: "var(--muted)", fontSize: 12, width: 16, textAlign: "center" }}>×</span>
                <input type="number" value={set.reps || ""} onChange={e => onUpdate(step.exerciseIdx, si, { reps: parseInt(e.target.value) || 0 })}
                  className="input-field" style={{ width: 60, padding: "0.3rem", textAlign: "center", fontSize: 13 }} placeholder="reps" />
              </>
            )}
            <input type="number" value={set.rpe || ""} onChange={e => onUpdate(step.exerciseIdx, si, { rpe: parseInt(e.target.value) || undefined })}
              className="input-field" style={{ width: 48, padding: "0.3rem", textAlign: "center", fontSize: 13 }} placeholder="RPE" />
            <button onClick={() => onRemoveSet(step.exerciseIdx, si)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", width: 24 }}><Minus size={13} /></button>
          </div>
        ))}

        <button onClick={() => onAddSet(step.exerciseIdx)}
          style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 12, background: "none", border: "1px dashed rgba(232,197,71,0.3)", color: "var(--accent)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Plus size={14} /> Add Set
        </button>

        {ex.notes && (
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 12, padding: "8px 12px", background: "rgba(232,197,71,0.06)", borderRadius: 8, fontStyle: "italic" }}>
            💡 {ex.notes}
          </p>
        )}
      </div>
    </div></Portal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETION SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function CompletionScreen({ session, elapsed, onClose }: { session: GymSession; elapsed: number; onClose: () => void }) {
  const totalSets = session.exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const completedSets = session.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed).length, 0);
  const volume = session.exercises.reduce((a, ex) =>
    a + ex.sets.filter(s => s.completed && !ex.is_timed).reduce((b, s) => b + s.weight * s.reps, 0), 0);

  return (
    <Portal><div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: "linear-gradient(135deg, #0a0a0f 0%, rgba(46,213,115,0.12) 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "rgba(46,213,115,0.15)", border: "2px solid rgba(46,213,115,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Trophy size={40} style={{ color: "#2ed573" }} />
        </div>
        <h2 style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Session Done! 🎉</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 32 }}>{session.split_label}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Time", value: fmtTime(elapsed), color: "var(--accent)" },
            { label: "Sets", value: `${completedSets}/${totalSets}`, color: "#2ed573" },
            { label: "Volume", value: volume > 0 ? `${volume}kg` : "—", color: "#a78bfa" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "rgba(26,26,36,0.9)", borderRadius: 16, padding: "16px 8px", textAlign: "center" }}>
              <p style={{ color, fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>{value}</p>
              <p style={{ color: "var(--muted)", fontSize: 12 }}>{label}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: 18, borderRadius: 20, background: "var(--accent)", color: "#0a0a0f", border: "none", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>
          Done
        </button>
      </div>
    </div></Portal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WORKOUT PLAYER
// ─────────────────────────────────────────────────────────────────────────────
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

  // Timed exercise state
  const [timedRunning, setTimedRunning] = useState(false);
  const [timedLeft, setTimedLeft] = useState(0);
  const timedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session elapsed
  useEffect(() => {
    const iv = setInterval(() => { elapsedRef.current += 1; setElapsed(e => e + 1); }, 1000);
    return () => clearInterval(iv);
  }, []);

  const steps = buildSteps(exercises);
  const step = steps[stepIdx];
  const nextStep = steps[stepIdx + 1] || null;

  // Reset timed state on step change
  useEffect(() => {
    if (timedRef.current) { clearInterval(timedRef.current); timedRef.current = null; }
    setTimedRunning(false);
    if (step?.exercise.is_timed) setTimedLeft(step.set.duration_seconds || 60);
  }, [stepIdx]);

  // Timed exercise countdown
  useEffect(() => {
    if (!timedRunning) { if (timedRef.current) clearInterval(timedRef.current); return; }
    timedRef.current = setInterval(() => {
      setTimedLeft(t => {
        if (t <= 1) { clearInterval(timedRef.current!); setTimedRunning(false); markCurrentSetDone(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timedRef.current) clearInterval(timedRef.current); };
  }, [timedRunning]);

  function saveExercises(updated: Exercise[]) {
    setExercises(updated);
    const volume = updated.reduce((a, ex) =>
      a + ex.sets.filter(s => s.completed && !ex.is_timed).reduce((b, s) => b + s.weight * s.reps, 0), 0);
    onUpdate({ exercises: updated, total_volume: volume });
  }

  function updateSet(exIdx: number, setIdx: number, updates: Partial<ExerciseSet>) {
    const updated = exercises.map((ex, ei) =>
      ei !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, ...updates }) }
    );
    saveExercises(updated);
  }

  function addSet(exIdx: number) {
    const ex = exercises[exIdx];
    const last = ex.sets[ex.sets.length - 1];
    const newSet: ExerciseSet = {
      set_number: ex.sets.length + 1,
      weight: last?.weight || 0, reps: last?.reps || 8,
      duration_seconds: ex.is_timed ? (last?.duration_seconds || 60) : undefined,
      set_type: ex.is_timed ? "duration" : "reps", completed: false,
    };
    saveExercises(exercises.map((e, i) => i !== exIdx ? e : { ...e, sets: [...e.sets, newSet] }));
  }

  function removeSet(exIdx: number, setIdx: number) {
    saveExercises(exercises.map((e, i) =>
      i !== exIdx ? e : { ...e, sets: e.sets.filter((_, si) => si !== setIdx).map((s, si) => ({ ...s, set_number: si + 1 })) }
    ));
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

  function handleRestDone() { setPhase("exercise"); setStepIdx(i => Math.min(i + 1, steps.length - 1)); }
  function handlePrev() { if (stepIdx > 0) { setPhase("exercise"); setStepIdx(i => i - 1); } }
  function handleNext() {
    if (step.isLastStep) { setPhase("done"); }
    else { setPhase("exercise"); setStepIdx(i => Math.min(i + 1, steps.length - 1)); }
  }

  // ── RENDER PHASES ──────────────────────────────────────────────────────────
  if (phase === "done") return <CompletionScreen session={{ ...session, exercises }} elapsed={elapsed} onClose={onClose} />;

  if (phase === "rest") {
    return (
      <RestScreen
        key={stepIdx} // remount on each step so timer resets cleanly
        initialSeconds={restSeconds}
        nextStep={nextStep}
        onDone={handleRestDone}
        onSkip={handleRestDone}
      />
    );
  }

  if (!step) return null;

  const { exercise: ex, set, setIdx: curSet, exerciseIdx: curEx } = step;
  const splitColor = session.split === "chest_triceps_abs" ? "#ff4757" : session.split === "back_biceps_abs" ? "#2ed573" : session.split === "legs_shoulders_cardio" ? "#a78bfa" : "#e8c547";
  const completedSteps = steps.slice(0, stepIdx).filter(s => s.set.completed).length;
  const overallPct = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
  const timedTarget = set.duration_seconds || 60;
  const timedPct = timedTarget > 0 ? Math.max(0, (timedLeft / timedTarget) * 100) : 0;
  const timedCirc = 2 * Math.PI * 60;

  return (
    <Portal>
      {/* Full-screen exercise view */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998,
        background: "#0a0a0f",
        display: "flex", flexDirection: "column",
        paddingTop: "env(safe-area-inset-top, 44px)",
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
      }}>

        {/* ── TOP BAR ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 8px" }}>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} style={{ color: "#fff" }} />
          </button>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: splitColor, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>{session.split_label.toUpperCase()}</p>
            <p style={{ color: "var(--muted)", fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>{fmtTime(elapsed)}</p>
          </div>
          <button onClick={() => setShowEdit(true)} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Settings2 size={16} style={{ color: "#fff" }} />
          </button>
        </div>

        {/* ── PROGRESS BAR ── */}
        <div style={{ padding: "0 20px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>Exercise {curEx + 1}/{exercises.length} · Set {curSet + 1}/{ex.sets.length}</span>
            <span style={{ color: "var(--muted)", fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>{overallPct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, background: splitColor, width: `${overallPct}%`, transition: "width 0.5s ease" }} />
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", minHeight: 0 }}>

          {/* Emoji circle */}
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: `${splitColor}12`, border: `2px solid ${splitColor}25`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <span style={{ fontSize: "3.5rem" }}>{CAT_EMOJI[ex.category] || "💪"}</span>
          </div>

          {/* Name */}
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 4, fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>
            {ex.name.toUpperCase()}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, textTransform: "capitalize", marginBottom: 20 }}>
            {ex.category}
          </p>

          {/* Set dots */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {ex.sets.map((s, i) => (
              <div key={i} style={{
                height: 10, borderRadius: 10, transition: "all 0.3s ease",
                width: i === curSet ? 28 : 10,
                background: s.completed ? "#2ed573" : i === curSet ? splitColor : "rgba(255,255,255,0.15)",
              }} />
            ))}
          </div>

          {/* Reps or Timer display */}
          {ex.is_timed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ position: "relative", width: 140, height: 140 }}>
                <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                  <circle cx="70" cy="70" r="60" fill="none" stroke={splitColor} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(timedPct / 100) * timedCirc} ${timedCirc}`}
                    style={{ transition: "stroke-dasharray 0.9s linear" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 30, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace" }}>{fmtTime(timedLeft)}</span>
                  <span style={{ color: "var(--muted)", fontSize: 10 }}>/ {fmtTime(timedTarget)}</span>
                </div>
              </div>
              <button onClick={() => setTimedRunning(r => !r)}
                style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, padding: "12px 32px", borderRadius: 100, background: timedRunning ? "rgba(255,71,87,0.2)" : `${splitColor}22`, color: timedRunning ? "#ff4757" : splitColor, border: `1.5px solid ${timedRunning ? "rgba(255,71,87,0.4)" : `${splitColor}50`}`, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {timedRunning ? <><Pause size={16} />Pause</> : <><Play size={16} />Start Timer</>}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Weight row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <button onClick={() => updateSet(curEx, curSet, { weight: Math.max(0, (set.weight || 0) - 2.5) })}
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={14} /></button>
                <span style={{ color: "var(--muted)", fontSize: 16, fontFamily: "'JetBrains Mono',monospace", minWidth: 80, textAlign: "center" }}>
                  {set.weight > 0 ? `${set.weight} kg` : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>bodyweight</span>}
                </span>
                <button onClick={() => updateSet(curEx, curSet, { weight: (set.weight || 0) + 2.5 })}
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={14} /></button>
              </div>

              {/* Big reps counter */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 8 }}>
                <button onClick={() => updateSet(curEx, curSet, { reps: Math.max(1, (set.reps || 1) - 1) })}
                  style={{ width: 60, height: 60, borderRadius: 18, background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", fontSize: 28, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <div style={{ textAlign: "center" }}>
                  <span style={{ color: "#fff", fontSize: 72, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>×{set.reps || "—"}</span>
                  <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Reps</p>
                </div>
                <button onClick={() => updateSet(curEx, curSet, { reps: (set.reps || 0) + 1 })}
                  style={{ width: 60, height: 60, borderRadius: 18, background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", fontSize: 28, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
            </div>
          )}

          {/* Notes tip */}
          {ex.notes && (
            <div style={{ marginTop: 12, padding: "8px 16px", borderRadius: 12, background: "rgba(232,197,71,0.06)", border: "1px solid rgba(232,197,71,0.12)", maxWidth: 320 }}>
              <p style={{ color: "var(--muted)", fontSize: 11, textAlign: "center" }}>💡 {ex.notes}</p>
            </div>
          )}
        </div>

        {/* ── BOTTOM CONTROLS ── */}
        <div style={{ padding: "8px 20px 16px" }}>
          {/* Rest time adjuster */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 }}>
            <Timer size={12} style={{ color: "var(--muted)" }} />
            <span style={{ color: "var(--muted)", fontSize: 12 }}>Rest</span>
            <button onClick={() => setRestSeconds(r => Math.max(15, r - 15))}
              style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={10} /></button>
            <span style={{ color: "var(--accent)", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", minWidth: 36, textAlign: "center" }}>{fmtTime(restSeconds)}</span>
            <button onClick={() => setRestSeconds(r => r + 15)}
              style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={10} /></button>
          </div>

          {/* Prev / Done / Next */}
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handlePrev} disabled={stepIdx === 0}
              style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,255,255,0.07)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: stepIdx === 0 ? "not-allowed" : "pointer", opacity: stepIdx === 0 ? 0.3 : 1, flexShrink: 0 }}>
              <ChevronLeft size={24} style={{ color: "#fff" }} />
            </button>

            <button onClick={handleDone}
              style={{ flex: 1, height: 56, borderRadius: 18, background: splitColor, border: "none", color: "#0a0a0f", fontSize: 16, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Check size={20} />
              {step.isLastStep ? "Finish 🏁" : "Done"}
            </button>

            <button onClick={handleNext}
              style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,255,255,0.07)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ChevronRight size={24} style={{ color: "#fff" }} />
            </button>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditPanel
          step={{ ...step, exercise: exercises[step.exerciseIdx] }}
          onUpdate={updateSet}
          onClose={() => setShowEdit(false)}
          onAddSet={addSet}
          onRemoveSet={removeSet}
        />
      )}
    </Portal>
  );
}
