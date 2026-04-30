"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Todo } from "@/lib/types";

interface Props {
  todos: Todo[];
  weekOffDays: string[];
  startDate?: string; // "YYYY-MM-DD" default May 1 current year
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["M","T","W","T","F","S","S"];

function toStr(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function getDayStatus(dateStr: string, todos: Todo[], weekOffDays: string[]): "off" | "success" | "partial" | "missed" | "future" | "empty" {
  const today = new Date();
  today.setHours(0,0,0,0);
  const date = new Date(dateStr + "T00:00:00");

  if (date > today) return "future";
  if (weekOffDays.includes(dateStr)) return "off";

  // Only count high + medium priority tasks
  const dayTasks = todos.filter(t => t.due_date === dateStr && t.priority !== "low");
  if (dayTasks.length === 0) return "empty";

  const done = dayTasks.filter(t => t.completed).length;
  if (done === dayTasks.length) return "success";
  if (done > 0) return "partial";
  return "missed";
}

const STATUS_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  success: { bg: "#2ed573", border: "#2ed573", label: "All done" },
  partial: { bg: "rgba(255,165,2,0.7)", border: "#ffa502", label: "Partial" },
  missed:  { bg: "rgba(255,71,87,0.6)", border: "#ff4757", label: "Missed" },
  off:     { bg: "rgba(139,92,246,0.3)", border: "rgba(139,92,246,0.5)", label: "Week-off" },
  empty:   { bg: "rgba(42,42,58,0.5)", border: "rgba(42,42,58,0.8)", label: "No tasks" },
  future:  { bg: "transparent", border: "var(--border)", label: "Future" },
};

export default function ConsistencyCalendar({ todos, weekOffDays, startDate }: Props) {
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = 4; // May = index 4

  const [view, setView] = useState<"month" | "year">("month");
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  // Month view
  function renderMonth(y: number, m: number, mini = false) {
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m+1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
    const daysInMonth = lastDay.getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toStr(y, m, d));

    const todayStr = toStr(now.getFullYear(), now.getMonth(), now.getDate());

    return (
      <div>
        {!mini && (
          <div className="grid gap-0.5 mb-1" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
            {DAYS_SHORT.map((d, i) => (
              <div key={i} className="text-center text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", padding: "2px 0" }}>{d}</div>
            ))}
          </div>
        )}
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const status = getDayStatus(dateStr, todos, weekOffDays);
            const s = STATUS_STYLE[status];
            const isToday = dateStr === todayStr;
            const d = parseInt(dateStr.split("-")[2]);
            const cellSize = mini ? 20 : 32;

            return (
              <div key={i} className="flex items-center justify-center rounded" title={`${dateStr} · ${s.label}`}
                style={{
                  width: cellSize, height: cellSize,
                  background: s.bg,
                  border: `1px solid ${isToday ? "var(--accent)" : s.border}`,
                  borderRadius: mini ? 4 : 6,
                  boxShadow: isToday ? "0 0 0 2px rgba(232,197,71,0.4)" : "none",
                  cursor: "default",
                  margin: "0 auto",
                }}>
                {!mini && (
                  <span style={{ fontSize: "0.65rem", fontWeight: isToday ? 700 : 400, color: status === "success" ? "#0a0a0f" : status === "future" ? "var(--muted)" : "#fff", lineHeight: 1 }}>
                    {d}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Stats
  const allDates = todos.filter(t => t.due_date).map(t => t.due_date!);
  const uniqueDates = Array.from(new Set(allDates));
  const successDays = uniqueDates.filter(d => getDayStatus(d, todos, weekOffDays) === "success").length;
  const partialDays = uniqueDates.filter(d => getDayStatus(d, todos, weekOffDays) === "partial").length;
  const missedDays = uniqueDates.filter(d => getDayStatus(d, todos, weekOffDays) === "missed").length;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "rgba(26,26,36,0.9)" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "#fff" }}>Consistency</span>
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "rgba(10,10,15,0.5)", border: "1px solid var(--border)" }}>
            {(["month","year"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className="text-xs px-2 py-0.5 rounded capitalize"
                style={{ background: view === v ? "var(--accent)" : "transparent", color: view === v ? "var(--obsidian)" : "var(--muted)", fontWeight: view === v ? 600 : 400 }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: "#2ed573", display: "inline-block" }} /><span style={{ color: "var(--muted)" }}>{successDays} ✓</span></span>
          <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(255,165,2,0.7)", display: "inline-block" }} /><span style={{ color: "var(--muted)" }}>{partialDays} ~</span></span>
          <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(255,71,87,0.6)", display: "inline-block" }} /><span style={{ color: "var(--muted)" }}>{missedDays} ✗</span></span>
        </div>
      </div>

      <div className="p-4">
        {view === "month" ? (
          <>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }}
                className="p-1 rounded hover:bg-white/5" style={{ color: "var(--muted)" }}><ChevronLeft size={16} /></button>
              <span className="text-sm font-medium" style={{ color: "#fff" }}>{MONTHS[month]} {year}</span>
              <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }}
                className="p-1 rounded hover:bg-white/5" style={{ color: "var(--muted)" }}><ChevronRight size={16} /></button>
            </div>

            {/* Day labels */}
            <div className="grid gap-0.5 mb-2" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <div key={d} className="text-center text-xs" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem" }}>{d}</div>
              ))}
            </div>

            {renderMonth(year, month)}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
              {[
                { color: "#2ed573", label: "All done (High+Med)" },
                { color: "rgba(255,165,2,0.7)", label: "Partial" },
                { color: "rgba(255,71,87,0.6)", label: "Missed" },
                { color: "rgba(139,92,246,0.3)", label: "Week-off" },
                { color: "rgba(42,42,58,0.5)", label: "No tasks" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Year navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setYear(y => y-1)} className="p-1 rounded hover:bg-white/5" style={{ color: "var(--muted)" }}><ChevronLeft size={16} /></button>
              <span className="text-sm font-medium" style={{ color: "#fff" }}>{year} — Full Year</span>
              <button onClick={() => setYear(y => y+1)} className="p-1 rounded hover:bg-white/5" style={{ color: "var(--muted)" }}><ChevronRight size={16} /></button>
            </div>

            {/* 12 mini months — start from May if current year */}
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              {Array.from({ length: 12 }, (_, mi) => {
                // Start from May (index 4) for default year
                const startM = (year === defaultYear) ? 4 : 0;
                const actualM = (startM + mi) % 12;
                const actualY = year + Math.floor((startM + mi) / 12);

                return (
                  <div key={mi} className="cursor-pointer" onClick={() => { setMonth(actualM); setYear(actualY); setView("month"); }}>
                    <p className="text-xs text-center mb-1.5" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem" }}>
                      {MONTHS[actualM].slice(0,3)} {actualY !== year ? actualY : ""}
                    </p>
                    {renderMonth(actualY, actualM, true)}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
              {[
                { color: "#2ed573", label: "All done" },
                { color: "rgba(255,165,2,0.7)", label: "Partial" },
                { color: "rgba(255,71,87,0.6)", label: "Missed" },
                { color: "rgba(139,92,246,0.3)", label: "Off" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
