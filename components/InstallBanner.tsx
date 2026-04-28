"use client";

import { useEffect, useState } from "react";

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const safari = /safari/.test(navigator.userAgent.toLowerCase());
    if (ios && safari && !isInstalled) {
      setIsIOS(true);
      const dismissed = localStorage.getItem("pwa-ios-dismissed");
      if (!dismissed) setShow(true);
      return;
    }

    // Android/Chrome install prompt
    window.addEventListener("beforeinstallprompt", (e: any) => {
      e.preventDefault();
      setPrompt(e);
      const dismissed = localStorage.getItem("pwa-dismissed");
      if (!dismissed) setShow(true);
    });
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setPrompt(null);
  }

  function dismiss() {
    setShow(false);
    localStorage.setItem(isIOS ? "pwa-ios-dismissed" : "pwa-dismissed", "1");
  }

  if (!show || isInstalled) return null;

  return (
    <div
      className="animate-slide-down"
      style={{
        position: "fixed",
        bottom: 20,
        left: 16,
        right: 16,
        zIndex: 1000,
        background: "var(--card)",
        border: "1px solid rgba(232,197,71,0.3)",
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: "rgba(232,197,71,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}
      >
        ✦
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          Add to Home Screen
        </p>
        {isIOS ? (
          <p style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.4 }}>
            Tap <strong style={{ color: "var(--accent)" }}>Share</strong> → <strong style={{ color: "var(--accent)" }}>Add to Home Screen</strong>
          </p>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 11 }}>
            Install for offline access
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {!isIOS && (
          <button
            onClick={handleInstall}
            style={{
              background: "var(--accent)", border: "none", borderRadius: 8,
              padding: "6px 14px", color: "var(--obsidian)",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          style={{
            background: "transparent", border: "1px solid var(--border)",
            borderRadius: 8, padding: "6px 10px",
            color: "var(--muted)", fontSize: 12, cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
