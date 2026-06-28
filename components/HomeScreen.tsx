"use client";
import { useState, useEffect } from "react";

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  badge?: number;
  docked?: boolean;
  description?: string;
}

interface Props {
  apps: AppDefinition[];
  onOpen: (id: string) => void;
  userName?: string;
}

function LiveClock() {
  const [t, setT] = useState({ h:"", m:"", date:"", greeting:"" });
  useEffect(() => {
    function update() {
      const d = new Date();
      const h = d.getHours(); const m = d.getMinutes();
      const greeting = h<5?"Night 🌙":h<12?"Morning ☀️":h<17?"Afternoon 🌤":h<21?"Evening 🌆":"Night 🌙";
      setT({
        h: String(h).padStart(2,"0"),
        m: String(m).padStart(2,"0"),
        date: d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"}),
        greeting,
      });
    }
    update(); const iv=setInterval(update,10000); return ()=>clearInterval(iv);
  },[]);
  return (
    <div style={{padding:"16px 20px 12px",position:"relative",zIndex:5}}>
      <p style={{fontSize:13,color:"rgba(255,255,255,0.45)",fontWeight:500,marginBottom:2}}>
        Good {t.greeting}
      </p>
      <div style={{fontSize:60,fontWeight:200,color:"#fff",lineHeight:1,letterSpacing:-2,fontFamily:"'DM Sans',sans-serif"}}>
        {t.h}<span style={{opacity:0.5}}>:</span>{t.m}
      </div>
      <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:4}}>{t.date}</p>
    </div>
  );
}

export default function HomeScreen({ apps, onOpen, userName }: Props) {
  const allApps = apps; // show all as tiles

  return (
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div className="home-wallpaper"/>
      <div style={{height:"var(--statusbar-h)",flexShrink:0}}/>

      {/* Clock */}
      <LiveClock/>

      {/* App tiles grid — 2 columns, big tiles */}
      <div style={{
        flex:1, overflowY:"auto", overflowX:"hidden",
        padding:"8px 16px 24px",
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:12,
        alignContent:"start",
      }}>
        {allApps.map(app => (
          <button key={app.id} onClick={()=>onOpen(app.id)}
            style={{
              background:"rgba(20,20,32,0.75)",
              backdropFilter:"blur(20px)",
              border:"1px solid rgba(255,255,255,0.09)",
              borderRadius:24,
              padding:"20px 18px",
              cursor:"pointer",
              textAlign:"left",
              position:"relative",
              overflow:"hidden",
              transition:"transform 0.15s, box-shadow 0.15s",
              WebkitTapHighlightColor:"transparent",
            }}
            onMouseDown={e=>(e.currentTarget.style.transform="scale(0.96)")}
            onMouseUp={e=>(e.currentTarget.style.transform="scale(1)")}
            onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}
            onTouchStart={e=>(e.currentTarget.style.transform="scale(0.96)")}
            onTouchEnd={e=>(e.currentTarget.style.transform="scale(1)")}
          >
            {/* Gradient glow blob in background */}
            <div style={{
              position:"absolute",top:-20,right:-20,width:80,height:80,
              borderRadius:"50%",
              background:app.gradient,
              opacity:0.25,
              filter:"blur(20px)",
              pointerEvents:"none",
            }}/>

            {/* Badge */}
            {(app.badge ?? 0) > 0 && (
              <div style={{
                position:"absolute",top:14,right:14,
                background:"#ff4757",color:"#fff",
                fontSize:10,fontWeight:800,
                minWidth:20,height:20,borderRadius:10,
                padding:"0 5px",
                display:"flex",alignItems:"center",justifyContent:"center",
                border:"2px solid #0a0a0f",
              }}>{app.badge! > 99 ? "99+" : app.badge}</div>
            )}

            {/* Icon */}
            <div style={{
              width:52,height:52,borderRadius:16,
              background:app.gradient,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:"1.6rem",
              marginBottom:14,
              boxShadow:`0 6px 20px rgba(0,0,0,0.3)`,
              position:"relative",zIndex:1,
            }}>
              {app.icon}
            </div>

            {/* Name */}
            <p style={{
              color:"#fff",fontSize:15,fontWeight:700,
              marginBottom:3,position:"relative",zIndex:1,
            }}>{app.name}</p>

            {/* Description */}
            {app.description && (
              <p style={{color:"rgba(255,255,255,0.38)",fontSize:11,lineHeight:1.4,position:"relative",zIndex:1}}>
                {app.description}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Bottom safe area */}
      <div style={{height:"env(safe-area-inset-bottom,16px)",flexShrink:0}}/>
    </div>
  );
}
