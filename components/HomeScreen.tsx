"use client";
import { useState, useEffect } from "react";

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  badge?: number;
  docked?: boolean;
}

interface Props {
  apps: AppDefinition[];
  onOpen: (id: string) => void;
  userName?: string;
}

function LiveClock() {
  const [time, setTime] = useState({ h: "", m: "", date: "" });
  useEffect(() => {
    function update() {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      const date = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
      setTime({ h, m, date });
    }
    update();
    const iv = setInterval(update, 10000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="home-time">
      <div className="home-clock">{time.h}:{time.m}</div>
      <div className="home-date">{time.date}</div>
    </div>
  );
}

export default function HomeScreen({ apps, onOpen, userName }: Props) {
  const gridApps = apps.filter(a => !a.docked);
  const dockApps = apps.filter(a => a.docked);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <div className="home-wallpaper" />

      {/* Status bar space */}
      <div style={{ height: "var(--statusbar-h)", flexShrink: 0 }} />

      {/* Time widget */}
      <LiveClock />

      {/* Greeting */}
      <div style={{ textAlign: "center", marginBottom: 4, position: "relative", zIndex: 5 }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
          Welcome back, {userName || "Naveen"} 👋
        </p>
      </div>

      {/* App grid */}
      <div className="app-grid">
        {gridApps.map(app => (
          <div key={app.id} className="app-icon-wrap" onClick={() => onOpen(app.id)}>
            <div className="app-icon" style={{ background: app.gradient }}>
              <span>{app.icon}</span>
              {(app.badge ?? 0) > 0 && (
                <div className="app-badge">{app.badge! > 99 ? "99+" : app.badge}</div>
              )}
            </div>
            <span className="app-icon-label">{app.name}</span>
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Dock */}
      {dockApps.length > 0 && (
        <div className="dock">
          {dockApps.map(app => (
            <div key={app.id} className="dock-app" onClick={() => onOpen(app.id)}>
              <div className="dock-icon" style={{ background: app.gradient }}>
                <span>{app.icon}</span>
              </div>
              <span className="dock-label">{app.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
