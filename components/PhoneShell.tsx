"use client";
/**
 * PhoneShell — wraps content in a realistic phone UI on desktop,
 * renders full-screen on actual mobile devices.
 */
import { useEffect, useState } from "react";

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function update() {
      const d = new Date();
      setTime(d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:false}));
    }
    update();
    const iv = setInterval(update, 10000);
    return () => clearInterval(iv);
  }, []);
  return <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,color:"#fff"}}>{time}</span>;
}

export default function PhoneShell({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(window.innerWidth <= 500); }, []);

  if (isMobile) {
    return <div style={{minHeight:"100vh",background:"#0a0a0f"}}>{children}</div>;
  }

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
              <svg width="16" height="12" viewBox="0 0 16 12" fill="rgba(255,255,255,0.8)">
                <rect x="0" y="4" width="3" height="8" rx="1"/>
                <rect x="4" y="2.5" width="3" height="9.5" rx="1"/>
                <rect x="8" y="1" width="3" height="11" rx="1"/>
                <rect x="12" y="0" width="3" height="12" rx="1"/>
              </svg>
              <svg width="16" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2">
                <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0L12 19l-3.47-2.89z"/>
              </svg>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.8)",fontWeight:600}}>100%</span>
              <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
                <rect x="0" y="1" width="18" height="10" rx="2.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"/>
                <rect x="1" y="2" width="14" height="8" rx="1.5" fill="rgba(46,213,115,0.9)"/>
                <path d="M19 4v4a2 2 0 0 0 0-4z" fill="rgba(255,255,255,0.4)"/>
              </svg>
            </div>
          </div>
          {/* App content */}
          <div style={{position:"absolute",inset:0,overflow:"hidden"}}>
            {children}
          </div>
          {/* Home indicator */}
          <div className="home-indicator"/>
        </div>
      </div>

      {/* Desktop info panel - right side */}
      <div style={{width:300,display:"flex",flexDirection:"column",gap:16,position:"relative",zIndex:10}}>
        <div style={{background:"rgba(20,20,32,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:20}}>
          <p style={{color:"var(--muted)",fontSize:11,fontWeight:600,letterSpacing:"0.1em",marginBottom:8}}>NAVEEN'S WORKSPACE</p>
          <p style={{color:"#fff",fontSize:20,fontWeight:700,fontFamily:"'Playfair Display',serif",lineHeight:1.2}}>Personal OS</p>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>
            {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </p>
        </div>
        <div style={{background:"rgba(20,20,32,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:16}}>
          <p style={{color:"var(--muted)",fontSize:11,fontWeight:600,letterSpacing:"0.08em",marginBottom:12}}>QUICK TIPS</p>
          {[
            {icon:"👆",text:"Tap any app icon to open"},
            {icon:"🏠",text:"Tap ← to go back to home"},
            {icon:"📱",text:"On mobile, opens full screen"},
          ].map(({icon,text})=>(
            <div key={text} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:16}}>{icon}</span>
              <span style={{fontSize:12,color:"var(--soft)"}}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
