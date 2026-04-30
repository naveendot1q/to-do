"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Todo } from "@/lib/types";

interface Props {
  todos: Todo[];
  selectedDate: string | null;
}

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

export default function NotificationManager({ todos, selectedDate }: Props) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showBanner, setShowBanner] = useState(false);
  const scheduledRef = useRef<Set<string>>(new Set());
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);
    if (Notification.permission === "default") {
      // Show banner after 3 seconds
      const t = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => { swRef.current = reg; });
    }
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    scheduleNotifications();
    // Re-check every minute
    const iv = setInterval(scheduleNotifications, 60000);
    return () => clearInterval(iv);
  }, [todos, permission]);

  function scheduleNotifications() {
    const todayStr = toLocalDateStr(new Date());
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // Only schedule for today's tasks with start_time
    const todayTasks = todos.filter(t =>
      !t.completed && t.start_time && t.due_date === todayStr
    );

    todayTasks.forEach(task => {
      if (!task.start_time) return;
      const [h, m] = task.start_time.split(":").map(Number);
      const taskMins = h * 60 + m;
      const fiveBefore = taskMins - 5;
      const key = `${task.id}-${task.start_time}`;

      // Don't reschedule already scheduled ones
      if (scheduledRef.current.has(key)) return;

      const minsUntilNotify = fiveBefore - nowMins;

      // Schedule if it's in the future (within next 24h)
      if (minsUntilNotify > 0 && minsUntilNotify < 1440) {
        const delayMs = minsUntilNotify * 60 * 1000;
        scheduledRef.current.add(key);

        const timeLabel = `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;

        // Send to SW for reliable delivery
        if (swRef.current) {
          swRef.current.active?.postMessage({
            type: "SCHEDULE_NOTIFICATION",
            title: `⏰ Starting soon: ${task.title}`,
            body: `Task starts at ${timeLabel} · 5 minutes away`,
            delay: delayMs,
          });
        } else {
          // Fallback: browser setTimeout
          setTimeout(() => {
            new Notification(`⏰ Starting soon: ${task.title}`, {
              body: `Task starts at ${timeLabel} · 5 minutes away`,
              icon: "/icons/icon-192x192.png",
              tag: key,
            });
          }, delayMs);
        }
      }
    });
  }

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setPermission(result);
    setShowBanner(false);
    if (result === "granted") scheduleNotifications();
  }

  if (!("Notification" in window)) return null;

  return (
    <>
      {/* Floating permission banner */}
      {showBanner && permission === "default" && (
        <div className="animate-slide-up" style={{
          position: "fixed", bottom: 80, left: 16, right: 16, zIndex: 100,
          background: "var(--card)", border: "1px solid rgba(232,197,71,0.25)",
          borderRadius: 16, padding: "14px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "rgba(232,197,71,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Enable Notifications</p>
            <p style={{ color: "var(--muted)", fontSize: 11 }}>Get reminded 5 min before each task starts</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={requestPermission} style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "6px 14px", color: "var(--obsidian)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Enable
            </button>
            <button onClick={() => setShowBanner(false)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Status indicator in corner */}
      {permission === "granted" && (
        <div title="Notifications active" style={{ position: "fixed", top: 16, right: 16, zIndex: 100, width: 8, height: 8, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
      )}
    </>
  );
}
