"use client";

import { useState, useEffect } from "react";
import { Check, Clock, ChevronRight, Flame } from "lucide-react";

interface RoutineItem {
  id: string;
  time: string;
  title: string;
  tasks: string[];
  category: "morning" | "study" | "gym" | "office" | "evening";
  color: string;
  icon: string;
  isWeekOff?: boolean;
}

const ROUTINE_BLOCKS: RoutineItem[] = [
  {
    id: "wake",
    time: "05:00 – 06:00",
    title: "Morning Ritual",
    icon: "🌅",
    category: "morning",
    color: "#e8c547",
    tasks: ["Make bed", "Pee & drink 1L water", "Stretching & get fresh", "20×3 Push-Ups", "20×3 Squats", "3× Plank", "10 min Kapalbhati", "High carb diet", "Brush & reach library"],
  },
  {
    id: "study1",
    time: "05:45 – 09:00",
    title: "Study Session",
    icon: "📚",
    category: "study",
    color: "#2ed573",
    tasks: ["Focused deep work at library", "Made Easy CS / Target subject"],
  },
  {
    id: "gym_day",
    time: "09:00 – 11:00",
    title: "Gym Block",
    icon: "💪",
    category: "gym",
    color: "#ff4757",
    tasks: ["Move to gym", "Warm-Up: 1km Run", "Double body part training", "Reach PG before 10:00"],
    isWeekOff: false,
  },
  {
    id: "prep_day",
    time: "09:00 – 11:00",
    title: "Home Prep (Week Off)",
    icon: "🏠",
    category: "morning",
    color: "#a78bfa",
    tasks: ["Prepare breakfast", "Complete all chores", "Plan the day", "Time management", "Bath & get ready", "Great breakfast", "Reach library by 11:00"],
    isWeekOff: true,
  },
  {
    id: "study2",
    time: "11:00 – 13:00",
    title: "Library Session",
    icon: "🎯",
    category: "study",
    color: "#2ed573",
    tasks: ["Library — Made Easy CS"],
  },
  {
    id: "office",
    time: "13:00+",
    title: "Office Block",
    icon: "🏢",
    category: "office",
    color: "#ffa502",
    tasks: ["Get to the bus", "Lunch", "Newspaper reading", "CA prep"],
  },
];

const WORKOUT_SPLITS = [
  { day: "Day 1", split: "Chest + Triceps + Abs", muscles: "Chest · Tri · Core", color: "#ff4757", tag: "PUSH" },
  { day: "Day 2", split: "Back + Biceps + Abs",   muscles: "Back · Bi · Core",   color: "#2ed573", tag: "PULL" },
  { day: "Day 3", split: "Legs + Shoulders + Cardio", muscles: "Quads · Delts · Cardio", color: "#a78bfa", tag: "LEGS" },
];

const WEEK_OFF_STUDIES = [
  { slot: "Week Off 1", topic: "Quant", color: "#ffa502" },
  { slot: "Week Off 2", topic: "Revision + Test", color: "#a78bfa" },
];

interface Props {
  isWeekOff?: boolean;
}

export default function Routine({ isWeekOff = false }: Props) {
  const [now, setNow] = useState(new Date());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);

  const currentMins = now.getHours() * 60 + now.getMinutes();

  function parseTime(t: string): number {
    const match = t.match(/(\d+):(\d+)/);
    if (!match) return -1;
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }

  function getBlockStatus(block: RoutineItem): "upcoming" | "active" | "done" {
    const [start, end] = block.time.split("–").map(s => parseTime(s.trim()));
    if (end === -1) return currentMins >= start ? "active" : "upcoming";
    if (currentMins < start) return "upcoming";
    if (currentMins >= start && currentMins <= end) return "active";
    return "done";
  }

  function toggleTask(blockId: string, taskIdx: number) {
    const key = `${blockId}_${taskIdx}`;
    setCompletedTasks(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  const visibleBlocks = ROUTINE_BLOCKS.filter(b => b.isWeekOff === undefined || b.isWeekOff === isWeekOff);

  return (
    <div className="pb-20 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>Daily Routine</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            {isWeekOff && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>Week Off</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--muted)" }}>{completedTasks.size} tasks done</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        {visibleBlocks.map(block => {
          const status = getBlockStatus(block);
          const blockTaskKeys = block.tasks.map((_, i) => `${block.id}_${i}`);
          const completedCount = blockTaskKeys.filter(k => completedTasks.has(k)).length;
          const allComplete = completedCount === block.tasks.length;

          return (
            <div key={block.id} className="relative flex gap-4 mb-6 pl-12">
              {/* Timeline dot */}
              <div className="absolute left-3.5 top-2 w-3 h-3 rounded-full flex-shrink-0 -translate-x-1/2"
                style={{
                  background: status === "active" ? block.color : status === "done" ? "rgba(46,213,115,0.5)" : "rgba(255,255,255,0.1)",
                  border: status === "active" ? `2px solid ${block.color}` : "2px solid rgba(255,255,255,0.1)",
                  boxShadow: status === "active" ? `0 0 12px ${block.color}60` : "none",
                  zIndex: 1,
                }} />

              <div className={`flex-1 rounded-xl p-3 ${status === "active" ? "animate-fade-in" : ""}`}
                style={{
                  background: status === "active" ? `${block.color}10` : "rgba(26,26,36,0.7)",
                  border: `1px solid ${status === "active" ? `${block.color}35` : "rgba(255,255,255,0.05)"}`,
                  opacity: status === "done" ? 0.65 : 1,
                }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "1rem" }}>{block.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: status === "active" ? block.color : "#fff" }}>{block.title}</span>
                      {status === "active" && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-bold animate-pulse" style={{ background: `${block.color}20`, color: block.color, fontSize: "9px" }}>NOW</span>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{block.time}</span>
                  </div>
                  <span className="text-xs" style={{ color: allComplete ? "var(--success)" : "var(--muted)" }}>{completedCount}/{block.tasks.length}</span>
                </div>
                <div className="space-y-1.5">
                  {block.tasks.map((task, i) => {
                    const key = `${block.id}_${i}`;
                    const done = completedTasks.has(key);
                    return (
                      <button key={i} onClick={() => toggleTask(block.id, i)}
                        className="w-full flex items-center gap-2 text-left group">
                        <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                          style={{ background: done ? "var(--success)" : "rgba(255,255,255,0.05)", border: `1px solid ${done ? "var(--success)" : "rgba(255,255,255,0.1)"}` }}>
                          {done && <Check size={9} style={{ color: "#0a0a0f" }} />}
                        </div>
                        <span className="text-xs" style={{ color: done ? "var(--muted)" : "var(--soft)", textDecoration: done ? "line-through" : "none" }}>{task}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Workout Split Reference */}
      <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(26,26,36,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)", letterSpacing: "0.08em" }}>WORKOUT SPLIT</p>
        <div className="space-y-2">
          {WORKOUT_SPLITS.map(s => (
            <div key={s.day} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: `${s.color}08` }}>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: s.color, color: "#0a0a0f", minWidth: 44, textAlign: "center" }}>{s.tag}</span>
              <div>
                <p className="text-xs font-medium" style={{ color: "#fff" }}>{s.split}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{s.muscles}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Week Off Study Plan */}
      <div className="mt-3 rounded-xl p-4" style={{ background: "rgba(26,26,36,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)", letterSpacing: "0.08em" }}>WEEK OFF STUDY PLAN</p>
        <div className="grid grid-cols-2 gap-2">
          {WEEK_OFF_STUDIES.map(s => (
            <div key={s.slot} className="p-3 rounded-xl" style={{ background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{s.slot}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: s.color }}>{s.topic}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
