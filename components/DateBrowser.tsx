"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Coffee } from "lucide-react";

interface DateBrowserProps {
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  taskCountsByDate: Record<string, { total: number; completed: number }>;
  weekOffDays?: string[];
  onToggleWeekOff?: (date: string) => void;
}

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}
function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toLocalDateStr(d);
}

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DateBrowser({ selectedDate, onDateSelect, taskCountsByDate, weekOffDays = [], onToggleWeekOff }: DateBrowserProps) {
  const today = toLocalDateStr(new Date());
  const [weekStart, setWeekStart] = useState(() => getMondayOf(selectedDate || today));
  const [showPicker, setShowPicker] = useState(false);
  const [weekOffMode, setWeekOffMode] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keep week in sync when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) setWeekStart(getMondayOf(selectedDate));
  }, [selectedDate]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthsShown = Array.from(new Set(days.map(d => {
    const dt = new Date(d + "T00:00:00");
    return `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
  })));

  function handleDayClick(dateStr: string) {
    if (weekOffMode && onToggleWeekOff) {
      onToggleWeekOff(dateStr);
      return;
    }
    onDateSelect(selectedDate === dateStr ? null : dateStr);
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--soft)" }}>{monthsShown.join(" / ")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedDate !== today && (
            <button onClick={() => { setWeekStart(getMondayOf(today)); onDateSelect(today); }}
              className="text-xs px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(232,197,71,0.1)", border: "1px solid rgba(232,197,71,0.25)", color: "var(--accent)" }}>
              Today
            </button>
          )}
          {selectedDate !== null && !weekOffMode && (
            <button onClick={() => onDateSelect(null)}
              className="text-xs px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              All
            </button>
          )}
          {onToggleWeekOff && (
            <button
              onClick={() => setWeekOffMode(o => !o)}
              className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
              style={{
                background: weekOffMode ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${weekOffMode ? "rgba(139,92,246,0.4)" : "var(--border)"}`,
                color: weekOffMode ? "#a78bfa" : "var(--muted)",
              }}>
              <Coffee size={11} />
              {weekOffMode ? "Done" : "Week-off"}
            </button>
          )}
          <button onClick={() => setWeekStart(w => addDays(w, -7))} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "var(--muted)" }}><ChevronLeft size={16} /></button>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "var(--muted)" }}><ChevronRight size={16} /></button>
          <div className="relative" ref={pickerRef}>
            <button onClick={() => setShowPicker(v => !v)} className="p-1 rounded-lg hover:bg-white/5" style={{ color: showPicker ? "var(--accent)" : "var(--muted)" }}>
              <CalendarDays size={15} />
            </button>
            {showPicker && (
              <div className="absolute right-0 top-8 z-50 rounded-xl p-3 animate-slide-down" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", minWidth: "220px" }}>
                <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Jump to date</p>
                <input type="date" defaultValue={selectedDate || today} className="input-field text-sm" style={{ padding: "0.5rem 0.75rem", colorScheme: "dark" }}
                  onChange={e => {
                    if (!e.target.value) return;
                    setWeekStart(getMondayOf(e.target.value));
                    onDateSelect(e.target.value);
                    setShowPicker(false);
                  }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Week-off mode hint */}
      {weekOffMode && (
        <div className="mb-2 px-3 py-2 rounded-lg text-xs animate-fade-in flex items-center gap-2"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa" }}>
          <Coffee size={11} />
          Tap any day to mark/unmark as week-off (shown in purple). Tasks still work normally on those days.
        </div>
      )}

      {/* Week Strip */}
      <div className="grid rounded-xl overflow-hidden" style={{ gridTemplateColumns: "repeat(7,1fr)", background: "var(--card)", border: "1px solid var(--border)" }}>
        {days.map((dateStr, i) => {
          const dt = new Date(dateStr + "T00:00:00");
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isPast = dt < new Date(today + "T00:00:00");
          const isWeekOff = weekOffDays.includes(dateStr);
          const counts = taskCountsByDate[dateStr];
          const hasTasks = counts && counts.total > 0;
          const allDone = hasTasks && counts.completed === counts.total;

          // Background: week-off gets purple tint, selected gets gold tint, today gets faint gold
          const cellBg = isSelected
            ? "rgba(232,197,71,0.12)"
            : isWeekOff
            ? "rgba(139,92,246,0.10)"  // subtle purple background only
            : isToday
            ? "rgba(232,197,71,0.04)"
            : "transparent";

          // Day label color: week-off gets purple, others normal
          const dayLabelColor = isWeekOff
            ? "#a78bfa"
            : isSelected || isToday
            ? "var(--accent)"
            : isPast
            ? "var(--border)"
            : "var(--muted)";

          // Date number color: week-off selected = white on purple, week-off = purple, rest normal
          const dateNumColor = isSelected
            ? "var(--obsidian)"
            : isWeekOff
            ? "#c4b5fd"
            : isToday
            ? "var(--accent)"
            : isPast
            ? "var(--border)"
            : "var(--soft)";

          // Circle bg: selected = gold (or purple if week-off+selected), today = faint gold ring
          const circleBg = isSelected
            ? isWeekOff ? "#8b5cf6" : "var(--accent)"
            : isToday
            ? "rgba(232,197,71,0.1)"
            : "transparent";

          const circleBorder = isToday && !isSelected ? "1px solid rgba(232,197,71,0.4)" : "none";

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              className="flex flex-col items-center py-3 px-1 transition-all relative"
              style={{
                background: cellBg,
                borderRight: i < 6 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
              }}
            >
              {/* Week-off indicator — tiny dot in corner, not covering content */}
              {isWeekOff && (
                <span style={{
                  position: "absolute", top: 3, right: 3,
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#8b5cf6", opacity: 0.8,
                }} />
              )}

              {/* Day name */}
              <span className="text-xs mb-1.5 font-medium" style={{
                color: dayLabelColor,
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: "0.65rem",
                letterSpacing: "0.05em",
              }}>
                {DAY_LABELS[dt.getDay()]}
              </span>

              {/* Date circle */}
              <span className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-all" style={{
                background: circleBg,
                border: circleBorder,
                color: dateNumColor,
              }}>
                {dt.getDate()}
              </span>

              {/* Task dots — always shown regardless of week-off */}
              <div className="mt-1.5 h-3 flex items-center justify-center gap-0.5">
                {hasTasks ? (
                  allDone ? (
                    <span style={{ color: "var(--success)", fontSize: "0.6rem" }}>✓</span>
                  ) : (
                    Array.from({ length: Math.min(counts.total - counts.completed, 3) }).map((_, j) => (
                      <span key={j} className="rounded-full" style={{
                        width: 4, height: 4,
                        background: isSelected ? "var(--accent)" : isWeekOff ? "#a78bfa" : "var(--muted)",
                        display: "block",
                      }} />
                    ))
                  )
                ) : (
                  <span style={{ width: 4, height: 4, display: "block" }} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected date label */}
      {selectedDate && (
        <div className="mt-3 flex items-center gap-2 animate-fade-in">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs px-2 flex items-center gap-1.5" style={{ color: weekOffDays.includes(selectedDate) ? "#a78bfa" : "var(--muted)" }}>
            {weekOffDays.includes(selectedDate) && <Coffee size={10} />}
            {selectedDate === today ? "Today"
              : selectedDate === addDays(today, 1) ? "Tomorrow"
              : selectedDate === addDays(today, -1) ? "Yesterday"
              : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {weekOffDays.includes(selectedDate) && " · Week-off"}
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>
      )}
    </div>
  );
}
