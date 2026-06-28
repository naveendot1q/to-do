"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, X, Check } from "lucide-react";
import { Todo } from "@/lib/types";

interface Props { todos: Todo[]; selectedDate: string | null; }

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function NotificationManager({ todos, selectedDate }: Props) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showBanner, setShowBanner] = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);
    if (Notification.permission === "default") {
      // Show banner after 2 seconds
      setTimeout(() => setShowBanner(true), 2000);
    }
  }, []);

  // Get SW ref
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => { swRef.current = reg; });
    }
  }, []);

  // Sync tasks to SW every minute
  useEffect(() => {
    if (permission !== "granted") return;
    syncTasks();
    syncRef.current = setInterval(syncTasks, 60_000);
    return () => { if (syncRef.current) clearInterval(syncRef.current); };
  }, [todos, permission]);

  function syncTasks() {
    if (!swRef.current?.active) return;
    const today = toLocalDateStr(new Date());
    const todayTasks = todos
      .filter(t => t.due_date === today)
      .map(t => ({
        id: t.id,
        title: t.title,
        start_time: t.start_time || null,
        end_time: t.end_time || null,
        priority: t.priority,
        completed: t.completed,
        due_date: t.due_date,
      }));
    swRef.current.active!.postMessage({ type: "SYNC_TASKS", tasks: todayTasks });
  }

  async function requestPermission() {
    const r = await Notification.requestPermission();
    setPermission(r);
    setShowBanner(false);
    if (r === "granted") {
      // Immediately sync + show status
      await navigator.serviceWorker.ready.then(reg => { swRef.current = reg; syncTasks(); });
    }
  }

  if (!("Notification" in window)) return null;

  return (
    <>
      {/* Permission banner */}
      {showBanner && permission === "default" && (
        <div style={{
          position:"fixed",bottom:20,left:12,right:12,zIndex:9990,
          background:"rgba(26,26,36,0.97)",
          border:"1px solid rgba(232,197,71,0.3)",
          borderRadius:20,padding:"16px 16px",
          boxShadow:"0 8px 40px rgba(0,0,0,0.6)",
          display:"flex",alignItems:"flex-start",gap:12,
          backdropFilter:"blur(20px)",
        }}>
          <div style={{width:44,height:44,borderRadius:14,flexShrink:0,
            background:"linear-gradient(135deg,rgba(232,197,71,0.2),rgba(232,197,71,0.05))",
            border:"1px solid rgba(232,197,71,0.3)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem"}}>
            🔔
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={{color:"#fff",fontSize:14,fontWeight:700,marginBottom:3}}>Enable Notifications</p>
            <p style={{color:"rgba(255,255,255,0.45)",fontSize:12,lineHeight:1.4}}>
              Get notified when tasks start, are running, and show a live status in your notification bar
            </p>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={requestPermission}
                style={{flex:1,background:"linear-gradient(135deg,#e8c547,#f0d060)",border:"none",
                  borderRadius:12,padding:"10px",color:"#0a0a0f",fontSize:13,fontWeight:800,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <Bell size={14}/> Enable
              </button>
              <button onClick={()=>setShowBanner(false)}
                style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",
                  borderRadius:12,padding:"10px 14px",color:"rgba(255,255,255,0.4)",fontSize:13,cursor:"pointer"}}>
                Later
              </button>
            </div>
          </div>
          <button onClick={()=>setShowBanner(false)}
            style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",flexShrink:0,padding:2}}>
            <X size={16}/>
          </button>
        </div>
      )}

      {/* Notification active dot */}
      {permission === "granted" && (
        <div style={{position:"fixed",top:14,right:14,zIndex:9990,
          width:8,height:8,borderRadius:"50%",
          background:"#2ed573",
          boxShadow:"0 0 0 2px rgba(46,213,115,0.3), 0 0 8px rgba(46,213,115,0.6)"}}
          title="Notifications active — live status showing in notification bar"/>
      )}

      {/* Denied state - show re-request hint */}
      {permission === "denied" && (
        <div style={{position:"fixed",bottom:20,left:12,right:12,zIndex:9990,
          background:"rgba(255,71,87,0.1)",border:"1px solid rgba(255,71,87,0.2)",
          borderRadius:14,padding:"12px 16px",
          display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>🔕</span>
          <div style={{flex:1}}>
            <p style={{color:"#ff4757",fontSize:12,fontWeight:600}}>Notifications blocked</p>
            <p style={{color:"rgba(255,255,255,0.4)",fontSize:11}}>Enable in browser Settings → Site Settings → Notifications</p>
          </div>
          <button onClick={()=>setPermission("default")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer"}}><X size={14}/></button>
        </div>
      )}
    </>
  );
}
