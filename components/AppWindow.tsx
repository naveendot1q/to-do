"use client";
import { useEffect, useState, useRef } from "react";

interface Props {
  title: string;
  accentColor?: string;
  onBack: () => void;
  children: React.ReactNode;
  navItems?: { id: string; icon: string; label: string }[];
  activeNav?: string;
  onNavChange?: (id: string) => void;
  rightAction?: React.ReactNode;
  noPadding?: boolean;
}

export default function AppWindow({
  title, accentColor = "var(--accent)", onBack,
  children, navItems, activeNav, onNavChange,
  rightAction, noPadding,
}: Props) {
  const [animState, setAnimState] = useState<"opening" | "open" | "closing">("opening");

  useEffect(() => {
    const t = setTimeout(() => setAnimState("open"), 280);
    return () => clearTimeout(t);
  }, []);

  function handleBack() {
    setAnimState("closing");
    setTimeout(onBack, 200);
  }

  return (
    <div
      className={`app-window ${animState === "opening" ? "opening" : animState === "closing" ? "closing" : ""}`}
      style={{ background: "var(--obsidian)" }}
    >
      {/* Status bar area */}
      <div style={{ height: "var(--statusbar-h)", flexShrink: 0 }} />

      {/* Top bar */}
      <div className="app-topbar" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <button className="back-btn" onClick={handleBack} style={{ color: accentColor }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </button>
        <span className="app-topbar-title">{title}</span>
        <div style={{ minWidth: 60, display: "flex", justifyContent: "flex-end" }}>
          {rightAction}
        </div>
      </div>

      {/* Content */}
      <div
        className={noPadding ? "" : "app-content"}
        style={{ flex: 1, overflow: "hidden auto", display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        {children}
      </div>

      {/* Bottom nav */}
      {navItems && navItems.length > 0 && (
        <div className="app-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? "active" : ""}`}
              onClick={() => onNavChange?.(item.id)}
              style={{ color: activeNav === item.id ? accentColor : "var(--muted)" }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label" style={{ color: activeNav === item.id ? accentColor : "var(--muted)" }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
