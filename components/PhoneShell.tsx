"use client";
import { useEffect, useState } from "react";

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function update() {
      const d = new Date();
      setTime(d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:false}));
    }
    update(); const iv=setInterval(update,10000); return ()=>clearInterval(iv);
  },[]);
  return <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,color:"#fff"}}>{time}</span>;
}

export default function PhoneShell({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"loading"|"mobile"|"pwa"|"desktop">("loading");

  useEffect(() => {
    const w = window.innerWidth;
    const isPWA = window.matchMedia("(display-mode: fullscreen)").matches
               || window.matchMedia("(display-mode: standalone)").matches
               || (window.navigator as any).standalone === true;
    const isMobile = w <= 500;

    if (isPWA || isMobile) setMode(isMobile || isPWA ? "mobile" : "desktop");
    else setMode("desktop");
  }, []);

  // Loading state — avoid flash
  if (mode === "loading") {
    return <div style={{position:"fixed",inset:0,background:"#07070d"}}/>;
  }

  // Mobile / PWA — true full screen, no shell
  if (mode === "mobile") {
    return (
      <div style={{
        position:"fixed", inset:0,
        background:"#0a0a0f",
        overflow:"hidden",
        // Use safe-area for notch devices
        paddingTop:"env(safe-area-inset-top,0px)",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
      }}>
        {children}
      </div>
    );
  }

  // Desktop — phone shell centered
  return (
    <div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",gap:40,padding:"24px 40px",overflow:"hidden"}}>
      {/* Desktop background */}
      <div className="desktop-bg"/>
      <div className="desktop-grid"/>

      {/* Phone shell */}
      <div className="phone-shell" style={{flexShrink:0}}>
        <div className="phone-screen">
          {/* Notch */}
          <div className="notch">
            <div className="notch-cam"/>
            <div className="notch-dot"/>
          </div>
          {/* Status bar */}
          <div className="status-bar" style={{background:"transparent"}}>
            <Clock/>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {/* Signal bars */}
              <svg width="16" height="12" viewBox="0 0 16 12" fill="rgba(255,255,255,0.8)">
                <rect x="0" y="4" width="3" height="8" rx="1"/>
                <rect x="4" y="2.5" width="3" height="9.5" rx="1"/>
                <rect x="8" y="1" width="3" height="11" rx="1"/>
                <rect x="12" y="0" width="3" height="12" rx="1"/>
              </svg>
              {/* WiFi */}
              <svg width="16" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2">
                <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0L12 19l-3.47-2.89z"/>
              </svg>
              {/* Battery */}
              <span style={{fontSize:12,color:"rgba(255,255,255,0.8)",fontWeight:600}}>100%</span>
              <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
                <rect x="0" y="1" width="18" height="10" rx="2.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"/>
                <rect x="1" y="2" width="14" height="8" rx="1.5" fill="rgba(46,213,115,0.9)"/>
                <path d="M19 4v4a2 2 0 0 0 0-4z" fill="rgba(255,255,255,0.4)"/>
              </svg>
            </div>
          </div>
          {/* App content fills entire phone */}
          <div style={{position:"absolute",inset:0,overflow:"hidden"}}>
            {children}
          </div>
          {/* Home indicator */}
          <div className="home-indicator"/>
        </div>
      </div>

      {/* Right info panel */}
      <div style={{width:280,display:"flex",flexDirection:"column",gap:14,position:"relative",zIndex:10}}>
        <div style={{background:"rgba(20,20,32,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:20}}>
          <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,fontWeight:600,letterSpacing:"0.1em",marginBottom:6}}>NAVEEN'S OS</p>
          <p style={{color:"#fff",fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif",lineHeight:1.3}}>
            Personal Workspace
          </p>
          <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,marginTop:4}}>
            {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </p>
        </div>
        <div style={{background:"rgba(20,20,32,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:16}}>
          <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,fontWeight:600,letterSpacing:"0.08em",marginBottom:10}}>TIPS</p>
          {[
            {i:"👆",t:"Tap any tile to open the app"},
            {i:"←",t:"Back button returns to home"},
            {i:"📱",t:"Add to home screen for full-screen"},
          ].map(({i,t})=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:16,width:20,textAlign:"center"}}>{i}</span>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
