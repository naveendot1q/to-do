"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface DateBrowserProps {
  selectedDate: string | null; // "YYYY-MM-DD" or null = all
  onDateSelect: (date: string | null) => void;
  taskCountsByDate: Record<string, { total: number; completed: number }>;
}

function toLocalDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DateBrowser({ selectedDate, onDateSelect, taskCountsByDate }: DateBrowserProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(today);

  // weekStart: Monday of the currently shown week
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date(today);
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - ((day + 6) % 7)); // shift to Monday
    return d;
  });

  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build 7 days from weekStart
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function prevWeek() {
    setWeekStart((w) => addDays(w, -7));
  }

  function nextWeek() {
    setWeekStart((w) => addDays(w, 7));
  }

  function jumpToToday() {
    const d = new Date(today);
    const day = d.getDay();
    d.setDate(d.getDate() - ((day + 6) % 7));
    setWeekStart(d);
    onDateSelect(todayStr);
  }

  function handleDayClick(dateStr: string) {
    if (selectedDate === dateStr) {
      onDateSelect(null); // deselect = show all
    } else {
      onDateSelect(dateStr);
    }
  }

  // Month label for header
  const monthsShown = Array.from(new Set(days.map((d) => `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`)));
  const headerLabel = monthsShown.join(" / ");

  return (
    <div className="mb-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--soft)" }}>
            {headerLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Today button */}
          {selectedDate !== todayStr && (
            <button
              onClick={jumpToToday}
              className="text-xs px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: "rgba(232,197,71,0.1)",
                border: "1px solid rgba(232,197,71,0.25)",
                color: "var(--accent)",
              }}
            >
              Today
            </button>
          )}

          {/* Show All button */}
          {selectedDate !== null && (
            <button
              onClick={() => onDateSelect(null)}
              className="text-xs px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              All tasks
            </button>
          )}

          {/* Nav arrows */}
          <button onClick={prevWeek} className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--muted)" }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextWeek} className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--muted)" }}>
            <ChevronRight size={16} />
          </button>

          {/* Date picker trigger */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: showPicker ? "var(--accent)" : "var(--muted)" }}
              title="Jump to date"
            >
              <CalendarDays size={15} />
            </button>

            {showPicker && (
              <div
                className="absolute right-0 top-8 z-50 rounded-xl p-3 animate-slide-down"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                  minWidth: "220px",
                }}
              >
                <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Jump to date</p>
                <input
                  type="date"
                  defaultValue={selectedDate || todayStr}
                  className="input-field text-sm"
                  style={{ padding: "0.5rem 0.75rem", colorScheme: "dark" }}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const picked = new Date(e.target.value + "T00:00:00");
                    // Move week to contain this date
                    const day = picked.getDay();
                    const monday = new Date(picked);
                    monday.setDate(picked.getDate() - ((day + 6) % 7));
                    setWeekStart(monday);
                    onDateSelect(e.target.value);
                    setShowPicker(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Week strip */}
      <div
        className="grid rounded-xl overflow-hidden"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        {days.map((day, i) => {
          const dateStr = toLocalDateStr(day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isPast = day < today;
          const counts = taskCountsByDate[dateStr];
          const hasTasks = counts && counts.total > 0;
          const allDone = hasTasks && counts.completed === counts.total;

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              className="flex flex-col items-center py-3 px-1 transition-all relative"
              style={{
                background: isSelected
                  ? "rgba(232,197,71,0.12)"
                  : isToday && !isSelected
                  ? "rgba(232,197,71,0.04)"
                  : "transparent",
                borderRight: i < 6 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
              }}
            >
              {/* Day label */}
              <span
                className="text-xs mb-1.5 font-medium"
                style={{
                  color: isSelected
                    ? "var(--accent)"
                    : isToday
                    ? "var(--accent)"
                    : isPast
                    ? "var(--border)"
                    : "var(--muted)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.05em",
                }}
              >
                {DAY_LABELS[day.getDay()]}
              </span>

              {/* Date number */}
              <span
                className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-all"
                style={{
                  background: isSelected
                    ? "var(--accent)"
                    : isToday && !isSelected
                    ? "rgba(232,197,71,0.15)"
                    : "transparent",
                  color: isSelected
                    ? "var(--obsidian)"
                    : isToday
                    ? "var(--accent)"
                    : isPast
                    ? "var(--border)"
                    : "var(--soft)",
                  border: isToday && !isSelected ? "1px solid rgba(232,197,71,0.4)" : "none",
                }}
              >
                {day.getDate()}
              </span>

              {/* Task dots */}
              <div className="mt-1.5 h-3 flex items-center justify-center gap-0.5">
                {hasTasks ? (
                  allDone ? (
                    <span style={{ color: "var(--success)", fontSize: "0.6rem" }}>✓</span>
                  ) : (
                    <>
                      {Array.from({ length: Math.min(counts.total - counts.completed, 3) }).map((_, j) => (
                        <span
                          key={j}
                          className="rounded-full"
                          style={{
                            width: "4px",
                            height: "4px",
                            background: isSelected ? "var(--accent)" : "var(--muted)",
                          }}
                        />
                      ))}
                    </>
                  )
                ) : (
                  <span style={{ width: "4px", height: "4px" }} />
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
          <span className="text-xs px-2" style={{ color: "var(--muted)" }}>
            {selectedDate === todayStr
              ? "Today"
              : selectedDate === toLocalDateStr(addDays(today, 1))
              ? "Tomorrow"
              : selectedDate === toLocalDateStr(addDays(today, -1))
              ? "Yesterday"
              : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>
      )}
    </div>
  );
}
