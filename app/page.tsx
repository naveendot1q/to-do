"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  Todo, Note, Meal, GymSession, BodyWeightLog,
  FilterType, SortType, Priority, AppMood
} from "@/lib/types";

import PhoneShell   from "@/components/PhoneShell";
import HomeScreen, { AppDefinition } from "@/components/HomeScreen";
import AppWindow    from "@/components/AppWindow";
import AddTodo      from "@/components/AddTodo";
import ReorderableTodoList from "@/components/ReorderableTodoList";
import DateBrowser  from "@/components/DateBrowser";
import Notes        from "@/components/Notes";
import Meals        from "@/components/Meals";
import Gym          from "@/components/Gym";
import Routine      from "@/components/Routine";
import ConsistencyCalendar from "@/components/ConsistencyCalendar";

import {
  Search, SlidersHorizontal, CheckCircle2, Clock,
  AlertTriangle, LayoutList, CalendarDays, LogOut
} from "lucide-react";

const NotificationManager = dynamic(() => import("@/components/NotificationManager"), { ssr: false });
const InstallBanner = dynamic(() => import("@/components/InstallBanner"), { ssr: false });

// ── HELPERS ──────────────────────────────────────────────────────────────────
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function computeMood(todos: Todo[], sel: string | null): AppMood {
  const today = toLocalDateStr(new Date());
  const now = new Date(); const nm = now.getHours()*60+now.getMinutes();
  const rel = todos.filter(t => t.due_date === (sel||today));
  if (!rel.length) return "calm";
  if (rel.every(t => t.completed)) return "success";
  const overdue = rel.some(t => {
    if (t.completed||!t.end_time||t.due_date!==today) return false;
    const [h,m]=t.end_time.split(":").map(Number); return nm>h*60+m;
  });
  if (overdue) return "critical";
  const active = rel.some(t => {
    if (t.completed||!t.start_time||!t.end_time||t.due_date!==today) return false;
    const [sh,sm]=t.start_time.split(":").map(Number);
    const [eh,em]=t.end_time.split(":").map(Number);
    return nm>=sh*60+sm&&nm<=eh*60+em;
  });
  return active ? "warning" : "calm";
}

// ── APP REGISTRY ─────────────────────────────────────────────────────────────
const APP_DEFS: AppDefinition[] = [
  { id:"routine",  name:"Routine",  icon:"🌅", gradient:"linear-gradient(135deg,#667eea,#764ba2)", docked:true  },
  { id:"tasks",    name:"Tasks",    icon:"✅", gradient:"linear-gradient(135deg,#11998e,#38ef7d)", docked:true  },
  { id:"gym",      name:"Gym",      icon:"💪", gradient:"linear-gradient(135deg,#f7374f,#88023f)", docked:true  },
  { id:"meals",    name:"Meals",    icon:"🥗", gradient:"linear-gradient(135deg,#f7971e,#ffd200)", docked:true  },
  { id:"notes",    name:"Notes",    icon:"📝", gradient:"linear-gradient(135deg,#4facfe,#00f2fe)"  },
  { id:"calendar", name:"Calendar", icon:"📅", gradient:"linear-gradient(135deg,#a18cd1,#fbc2eb)"  },
  { id:"settings", name:"Settings", icon:"⚙️", gradient:"linear-gradient(135deg,#434343,#000)"     },
];

// Nav tabs per app
const APP_NAV: Record<string, {id:string;icon:string;label:string}[]> = {
  routine:  [{id:"today",icon:"🌅",label:"Today"},{id:"calendar",icon:"📅",label:"Cal"}],
  tasks:    [{id:"list",icon:"📋",label:"Tasks"},{id:"calendar",icon:"📅",label:"Cal"}],
  gym:      [{id:"workout",icon:"💪",label:"Workout"},{id:"history",icon:"📈",label:"History"}],
  meals:    [{id:"today",icon:"🥗",label:"Today"},{id:"history",icon:"📊",label:"Trends"}],
  notes:    [{id:"notes",icon:"📝",label:"Notes"}],
  calendar: [{id:"cal",icon:"📅",label:"Calendar"},{id:"stats",icon:"📊",label:"Stats"}],
};

// Accent color per app
const APP_ACCENT: Record<string, string> = {
  routine:"#a78bfa", tasks:"#2ed573", gym:"#ff4757",
  meals:"#ffa502",   notes:"#4facfe", calendar:"#a18cd1", settings:"#888",
};

// Mood backgrounds (applied inside the active app window)
const MOOD_BG: Record<AppMood, string> = {
  calm:    "radial-gradient(ellipse at 20% 50%,rgba(100,80,200,0.09) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(232,197,71,0.05) 0%,transparent 60%)",
  success: "radial-gradient(ellipse at 30% 40%,rgba(46,213,115,0.11) 0%,transparent 55%)",
  warning: "radial-gradient(ellipse at 15% 60%,rgba(255,165,2,0.11) 0%,transparent 55%)",
  critical:"radial-gradient(ellipse at 50% 30%,rgba(255,71,87,0.13) 0%,transparent 55%)",
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function OS() {
  // ── State ──
  const [todos,          setTodos]          = useState<Todo[]>([]);
  const [notes,          setNotes]          = useState<Note[]>([]);
  const [meals,          setMeals]          = useState<Meal[]>([]);
  const [gymSessions,    setGymSessions]    = useState<GymSession[]>([]);
  const [bodyWeightLogs, setBodyWeightLogs] = useState<BodyWeightLog[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [user,           setUser]           = useState<{id:string;email?:string}|null>(null);
  const [selectedDate,   setSelectedDate]   = useState<string|null>(() => toLocalDateStr(new Date()));
  const [weekOffDays,    setWeekOffDays]    = useState<string[]>([]);
  const [activeApp,      setActiveApp]      = useState<string|null>(null);
  const [appNav,         setAppNav]         = useState<Record<string,string>>({});
  const [mood,           setMood]           = useState<AppMood>("calm");
  const moodRef = useRef<AppMood>("calm");

  // Tasks-specific
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState<FilterType>("all");
  const [sort,        setSort]        = useState<SortType>("start_time");
  const [showFilters, setShowFilters] = useState(false);
  const [allOrder,    setAllOrder]    = useState<string[]>([]);

  const router = useRouter();
  const supabase = createClient();

  // ── Boot ──
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel==="aal2"&&aal?.currentLevel!=="aal2") { router.replace("/verify-totp"); return; }
      if (aal?.currentLevel==="aal1"&&aal?.nextLevel==="aal1") { router.replace("/setup-totp");  return; }
      setUser({ id: session.user.id, email: session.user.email });
      await Promise.all([
        fetchTodos(session.user.id), fetchWeekOff(session.user.id),
        fetchNotes(session.user.id), fetchMeals(session.user.id),
        fetchGymSessions(session.user.id), fetchBodyWeight(session.user.id),
      ]);
    })();
  }, []);

  useEffect(() => { setAllOrder([]); }, [selectedDate]);

  useEffect(() => {
    const update = () => {
      const m = computeMood(todos, selectedDate);
      if (m !== moodRef.current) { moodRef.current = m; setMood(m); }
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [todos, selectedDate]);

  // ── Fetch ──
  async function fetchTodos(uid:string) {
    const { data } = await supabase.from("todos").select("*").eq("user_id",uid).order("start_time",{ascending:true,nullsFirst:false});
    setTodos(data||[]); setLoading(false);
  }
  async function fetchWeekOff(uid:string) {
    const { data } = await supabase.from("week_off_days").select("date").eq("user_id",uid);
    setWeekOffDays((data||[]).map((r:any)=>r.date));
  }
  async function fetchNotes(uid:string) {
    const { data } = await supabase.from("notes").select("*").eq("user_id",uid).order("updated_at",{ascending:false});
    setNotes(data||[]);
  }
  async function fetchMeals(uid:string) {
    const { data } = await supabase.from("meals").select("*").eq("user_id",uid).order("created_at",{ascending:false});
    setMeals(data||[]);
  }
  async function fetchGymSessions(uid:string) {
    const { data } = await supabase.from("gym_sessions").select("*").eq("user_id",uid).order("date",{ascending:false});
    setGymSessions(data||[]);
  }
  async function fetchBodyWeight(uid:string) {
    const { data } = await supabase.from("body_weight_logs").select("*").eq("user_id",uid).order("date",{ascending:false});
    setBodyWeightLogs(data||[]);
  }

  // ── Week off ──
  async function toggleWeekOff(date:string) {
    if (!user) return;
    if (weekOffDays.includes(date)) {
      await supabase.from("week_off_days").delete().eq("user_id",user.id).eq("date",date);
      setWeekOffDays(p=>p.filter(d=>d!==date));
    } else {
      await supabase.from("week_off_days").insert({user_id:user.id,date});
      setWeekOffDays(p=>[...p,date]);
    }
  }

  // ── Todos CRUD ──
  async function addTodo(todo:any) {
    if (!user) return;
    const { data } = await supabase.from("todos").insert({...todo,due_date:todo.due_date||selectedDate||undefined,user_id:user.id,completed:false,task_type:todo.task_type||"custom"}).select().single();
    if (data) setTodos(p=>[data,...p]);
  }
  async function toggleTodo(id:string, completed:boolean) {
    await supabase.from("todos").update({completed:!completed}).eq("id",id);
    setTodos(p=>p.map(t=>t.id===id?{...t,completed:!completed}:t));
  }
  async function deleteTodo(id:string) {
    await supabase.from("todos").delete().eq("id",id);
    setTimeout(()=>setTodos(p=>p.filter(t=>t.id!==id)),300);
  }
  async function updateTodo(id:string, updates:Partial<Todo>) {
    await supabase.from("todos").update(updates).eq("id",id);
    setTodos(p=>p.map(t=>t.id===id?{...t,...updates}:t));
  }

  // ── Notes CRUD ──
  async function addNote(note:any) {
    if (!user) return;
    const { data } = await supabase.from("notes").insert({...note,user_id:user.id}).select().single();
    if (data) setNotes(p=>[data,...p]);
  }
  async function updateNote(id:string,updates:Partial<Note>) {
    await supabase.from("notes").update({...updates,updated_at:new Date().toISOString()}).eq("id",id);
    setNotes(p=>p.map(n=>n.id===id?{...n,...updates}:n));
  }
  async function deleteNote(id:string) {
    await supabase.from("notes").delete().eq("id",id);
    setNotes(p=>p.filter(n=>n.id!==id));
  }

  // ── Meals CRUD ──
  async function addMeal(meal:any) {
    if (!user) return;
    const { data } = await supabase.from("meals").insert({...meal,user_id:user.id}).select().single();
    if (data) setMeals(p=>[data,...p]);
  }
  async function updateMeal(id:string,updates:Partial<Meal>) {
    await supabase.from("meals").update(updates).eq("id",id);
    setMeals(p=>p.map(m=>m.id===id?{...m,...updates}:m));
  }
  async function deleteMeal(id:string) {
    await supabase.from("meals").delete().eq("id",id);
    setMeals(p=>p.filter(m=>m.id!==id));
  }

  // ── Gym CRUD ──
  async function addGymSession(session:any) {
    if (!user) return;
    const { data } = await supabase.from("gym_sessions").insert({...session,user_id:user.id}).select().single();
    if (data) setGymSessions(p=>[data,...p]);
  }
  async function updateGymSession(id:string,updates:Partial<GymSession>) {
    await supabase.from("gym_sessions").update(updates).eq("id",id);
    setGymSessions(p=>p.map(s=>s.id===id?{...s,...updates}:s));
  }
  async function deleteGymSession(id:string) {
    await supabase.from("gym_sessions").delete().eq("id",id);
    setGymSessions(p=>p.filter(s=>s.id!==id));
  }

  // ── Body weight ──
  async function addBodyWeight(log:any) {
    if (!user) return;
    const { data } = await supabase.from("body_weight_logs").insert({...log,user_id:user.id}).select().single();
    if (data) setBodyWeightLogs(p=>[data,...p]);
  }
  async function updateBodyWeight(id:string,updates:Partial<BodyWeightLog>) {
    await supabase.from("body_weight_logs").update(updates).eq("id",id);
    setBodyWeightLogs(p=>p.map(l=>l.id===id?{...l,...updates}:l));
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  // ── Derived ──
  const todayStr   = toLocalDateStr(new Date());
  const viewDate   = selectedDate || todayStr;
  const isWeekOff  = weekOffDays.includes(viewDate);

  const taskCountsByDate: Record<string,{total:number;completed:number}> = {};
  todos.forEach(t => {
    if (!t.due_date) return;
    if (!taskCountsByDate[t.due_date]) taskCountsByDate[t.due_date]={total:0,completed:0};
    taskCountsByDate[t.due_date].total++;
    if (t.completed) taskCountsByDate[t.due_date].completed++;
  });
  const weekOffDaysDisplay = weekOffDays.map(d=>({
    date:d,
    allDone:(taskCountsByDate[d]?.total||0)>0&&taskCountsByDate[d]?.completed===taskCountsByDate[d]?.total,
  }));

  const viewTodos = todos.filter(t=>t.due_date===viewDate);
  const pendingCount = viewTodos.filter(t=>!t.completed).length;
  const nowMins = new Date().getHours()*60+new Date().getMinutes();
  const overdueCount = viewTodos.filter(t=>{
    if(t.completed||!t.end_time||t.due_date!==todayStr) return false;
    const [h,m]=t.end_time.split(":").map(Number); return nowMins>h*60+m;
  }).length;

  // Filtered for tasks app
  const filtered = todos.filter(t=>{
    if(t.due_date!==viewDate) return false;
    if(search&&!t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if(filter==="active") return !t.completed;
    if(filter==="completed") return t.completed;
    if(filter==="overdue"){
      if(t.completed||!t.end_time||t.due_date!==todayStr) return false;
      const [h,m]=t.end_time.split(":").map(Number); return nowMins>h*60+m;
    }
    return true;
  }).sort((a,b)=>{
    if(sort==="priority"){const o={high:0,medium:1,low:2};return o[a.priority]-o[b.priority];}
    if(sort==="start_time") return (a.start_time||"99:99").localeCompare(b.start_time||"99:99");
    return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
  });
  const allTodos = allOrder.length>0
    ? [...filtered].sort((a,b)=>allOrder.indexOf(a.id)-allOrder.indexOf(b.id))
    : filtered;

  // ── App badges (notification dots) ──
  const appsWithBadges: AppDefinition[] = APP_DEFS.map(a => ({
    ...a,
    badge:
      a.id==="tasks"   ? (pendingCount>0?pendingCount:undefined) :
      a.id==="routine" ? (pendingCount>0?pendingCount:undefined) :
      a.id==="notes"   ? (notes.filter(n=>n.pinned).length||undefined) :
      undefined,
  }));

  // ── App nav helper ──
  function getNav(id:string) { return appNav[id] || APP_NAV[id]?.[0]?.id || ""; }
  function setNav(id:string, tab:string) { setAppNav(p=>({...p,[id]:tab})); }

  function openApp(id:string) {
    if(id==="settings") return; // TODO: settings app
    setActiveApp(id);
  }

  // ── Mood banner ──
  const moodBanner = mood==="critical"
    ? {text:"⚠️ Overdue tasks!",  color:"#ff4757"}
    : mood==="success"
    ? {text:"✅ All done today!",  color:"#2ed573"}
    : mood==="warning"
    ? {text:"🕐 Task in progress",color:"#ffa502"}
    : null;

  // ── Date bar (shared across apps) ──
  const DateBar = () => (
    <div style={{padding:"8px 0 4px"}}>
      <DateBrowser
        selectedDate={selectedDate} onDateSelect={setSelectedDate}
        taskCountsByDate={taskCountsByDate} weekOffDays={weekOffDays}
        onToggleWeekOff={toggleWeekOff} weekOffDaysDisplay={weekOffDaysDisplay}
      />
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <PhoneShell>
      {/* Mood ambient layer */}
      <div style={{position:"absolute",inset:0,zIndex:0,background:MOOD_BG[mood],transition:"background 1.2s ease",pointerEvents:"none"}}/>

      {/* Home Screen */}
      {!activeApp && (
        <HomeScreen apps={appsWithBadges} onOpen={openApp} userName="Naveen" />
      )}

      {/* ── ROUTINE APP ── */}
      {activeApp==="routine" && (
        <AppWindow title="Routine" accentColor={APP_ACCENT.routine} onBack={()=>setActiveApp(null)}
          navItems={APP_NAV.routine} activeNav={getNav("routine")} onNavChange={t=>setNav("routine",t)}>
          {moodBanner&&<div style={{margin:"8px 0 4px",padding:"8px 12px",borderRadius:10,background:`${moodBanner.color}15`,border:`1px solid ${moodBanner.color}30`,fontSize:12,color:moodBanner.color,fontWeight:600}}>{moodBanner.text}</div>}
          {getNav("routine")==="today" && (
            <>
              <DateBar/>
              <Routine todos={todos} selectedDate={selectedDate} isWeekOff={isWeekOff}
                onToggle={toggleTodo} onAdd={addTodo} onDelete={deleteTodo} onUpdate={updateTodo}/>
            </>
          )}
          {getNav("routine")==="calendar" && (
            <>
              <DateBar/>
              <ConsistencyCalendar todos={todos} weekOffDays={weekOffDays}/>
            </>
          )}
        </AppWindow>
      )}

      {/* ── TASKS APP ── */}
      {activeApp==="tasks" && (
        <AppWindow title="Tasks" accentColor={APP_ACCENT.tasks} onBack={()=>setActiveApp(null)}
          navItems={APP_NAV.tasks} activeNav={getNav("tasks")} onNavChange={t=>setNav("tasks",t)}>
          {getNav("tasks")==="list" && (
            <>
              <DateBar/>
              {moodBanner&&<div style={{margin:"4px 0 6px",padding:"8px 12px",borderRadius:10,background:`${moodBanner.color}15`,border:`1px solid ${moodBanner.color}30`,fontSize:12,color:moodBanner.color,fontWeight:600}}>{moodBanner.text}</div>}
              <div style={{marginBottom:10}}>
                <AddTodo onAdd={addTodo} selectedDate={selectedDate}/>
              </div>
              {/* Search + filter */}
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <div style={{position:"relative",flex:1}}>
                  <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--muted)"}}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} className="input-field" style={{paddingLeft:"2.1rem",paddingTop:"0.45rem",paddingBottom:"0.45rem",fontSize:13}} placeholder="Search tasks..."/>
                </div>
                <button onClick={()=>setShowFilters(o=>!o)} className="btn-ghost" style={{padding:"0.45rem 0.75rem",display:"flex",alignItems:"center",gap:6,fontSize:13,borderColor:showFilters?"var(--accent)":"undefined",color:showFilters?"var(--accent)":"undefined"}}>
                  <SlidersHorizontal size={13}/>
                </button>
              </div>
              {showFilters&&(
                <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}} className="animate-slide-down">
                  <div style={{display:"flex",gap:4,padding:4,borderRadius:10,background:"var(--card)"}}>
                    {(["all","active","completed","overdue"] as FilterType[]).map(f=>(
                      <button key={f} onClick={()=>setFilter(f)} style={{fontSize:11,padding:"4px 10px",borderRadius:7,background:filter===f?"var(--accent)":"transparent",color:filter===f?"var(--obsidian)":"var(--muted)",border:"none",cursor:"pointer",fontWeight:filter===f?700:400,transition:"all 0.15s"}}>
                        {f.charAt(0).toUpperCase()+f.slice(1)}
                      </button>
                    ))}
                  </div>
                  <select value={sort} onChange={e=>setSort(e.target.value as SortType)} className="input-field" style={{padding:"4px 8px",width:"auto",fontSize:12}}>
                    <option value="start_time">Time</option>
                    <option value="priority">Priority</option>
                    <option value="created_at">Newest</option>
                  </select>
                </div>
              )}
              {loading ? (
                Array.from({length:3}).map((_,i)=><div key={i} className="shimmer" style={{borderRadius:12,height:60,marginBottom:8}}/>)
              ) : filtered.length===0 ? (
                <div style={{textAlign:"center",padding:"40px 0",color:"var(--muted)",fontSize:14}}>
                  <div style={{fontSize:36,marginBottom:8}}>📝</div>
                  {search?"No tasks match":"No tasks for this day"}
                </div>
              ) : (
                <ReorderableTodoList todos={allTodos} onToggle={toggleTodo} onDelete={deleteTodo} onUpdate={updateTodo} onReorder={r=>setAllOrder(r.map(t=>t.id))}/>
              )}
              {filtered.length>0&&<p style={{textAlign:"center",fontSize:11,color:"var(--border)",marginTop:12}}>{filtered.length} tasks · press N to add</p>}
            </>
          )}
          {getNav("tasks")==="calendar" && (
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>
                {[
                  {icon:<LayoutList size={14}/>,  label:"Total",   value:filtered.length,         color:"var(--soft)"},
                  {icon:<CheckCircle2 size={14}/>, label:"Done",    value:filtered.filter(t=>t.completed).length, color:"var(--success)"},
                  {icon:<Clock size={14}/>,        label:"Pending", value:pendingCount,             color:"var(--accent)"},
                  {icon:<AlertTriangle size={14}/>,label:"Late",    value:overdueCount,             color:"var(--danger)"},
                ].map(({icon,label,value,color})=>(
                  <div key={label} style={{background:"rgba(26,26,36,0.85)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"10px 6px",textAlign:"center"}}>
                    <div style={{color,display:"flex",justifyContent:"center",marginBottom:4}}>{icon}</div>
                    <p style={{color,fontSize:18,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{value}</p>
                    <p style={{color:"var(--muted)",fontSize:10}}>{label}</p>
                  </div>
                ))}
              </div>
              <DateBar/>
              <ConsistencyCalendar todos={todos} weekOffDays={weekOffDays}/>
            </>
          )}
        </AppWindow>
      )}

      {/* ── GYM APP ── */}
      {activeApp==="gym" && (
        <AppWindow title="Gym" accentColor={APP_ACCENT.gym} onBack={()=>setActiveApp(null)}
          navItems={APP_NAV.gym} activeNav={getNav("gym")} onNavChange={t=>setNav("gym",t)}>
          {getNav("gym")==="workout" && (
            <>
              <DateBar/>
              <Gym sessions={gymSessions} bodyWeightLogs={bodyWeightLogs}
                selectedDate={selectedDate}
                onAdd={addGymSession} onUpdate={updateGymSession} onDelete={deleteGymSession}
                onAddWeight={addBodyWeight} onUpdateWeight={updateBodyWeight}/>
            </>
          )}
          {getNav("gym")==="history" && (
            <div style={{paddingTop:8}}>
              <p style={{fontSize:11,color:"var(--muted)",fontWeight:600,letterSpacing:"0.08em",marginBottom:12}}>SESSION HISTORY</p>
              {gymSessions.length===0 ? (
                <div style={{textAlign:"center",padding:"40px 0",color:"var(--muted)",fontSize:14}}>
                  <div style={{fontSize:36,marginBottom:8}}>💪</div>No sessions yet
                </div>
              ) : gymSessions.map(s=>{
                const colors: Record<string,string> = {chest_triceps_abs:"#ff4757",back_biceps_abs:"#2ed573",legs_shoulders_cardio:"#a78bfa",custom:"#e8c547"};
                const tags: Record<string,string> = {chest_triceps_abs:"PUSH",back_biceps_abs:"PULL",legs_shoulders_cardio:"LEGS",custom:"CUSTOM"};
                const c = colors[s.split]||"#e8c547";
                return (
                  <div key={s.id} style={{background:"rgba(26,26,36,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:6,background:c,color:"#0a0a0f",flexShrink:0}}>{tags[s.split]}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{color:"var(--soft)",fontSize:13,fontWeight:600}}>{s.split_label}</p>
                      <p style={{color:"var(--muted)",fontSize:11}}>
                        {new Date(s.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                        {s.total_volume?` · ${s.total_volume}kg`:""}
                        {s.duration_minutes?` · ${s.duration_minutes}min`:""}
                      </p>
                    </div>
                    {s.completed&&<span style={{color:"#2ed573",fontSize:16}}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </AppWindow>
      )}

      {/* ── MEALS APP ── */}
      {activeApp==="meals" && (
        <AppWindow title="Meals" accentColor={APP_ACCENT.meals} onBack={()=>setActiveApp(null)}
          navItems={APP_NAV.meals} activeNav={getNav("meals")} onNavChange={t=>setNav("meals",t)}>
          {getNav("meals")==="today" && (
            <>
              <DateBar/>
              <Meals meals={meals} selectedDate={selectedDate}
                onAdd={addMeal} onUpdate={updateMeal} onDelete={deleteMeal}/>
            </>
          )}
          {getNav("meals")==="history" && (
            <div style={{paddingTop:8}}>
              <p style={{fontSize:11,color:"var(--muted)",fontWeight:600,letterSpacing:"0.08em",marginBottom:12}}>RECENT MEALS</p>
              {Array.from(new Set(meals.map(m=>m.date))).sort().reverse().slice(0,10).map(date=>{
                const dayMeals = meals.filter(m=>m.date===date);
                const totalCal = dayMeals.reduce((a,m)=>a+(m.calories||0),0);
                return(
                  <div key={date} style={{background:"rgba(26,26,36,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 14px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <p style={{color:"var(--soft)",fontSize:13,fontWeight:600}}>
                        {new Date(date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                      </p>
                      {totalCal>0&&<p style={{color:"var(--accent)",fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>{totalCal} kcal</p>}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {dayMeals.slice(0,4).map(m=>(
                        <span key={m.id} style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:"rgba(255,255,255,0.06)",color:"var(--muted)",display:"flex",alignItems:"center",gap:4}}>
                          {m.completed?"✓ ":""}{m.name}
                        </span>
                      ))}
                      {dayMeals.length>4&&<span style={{fontSize:10,color:"var(--muted)"}}>+{dayMeals.length-4} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AppWindow>
      )}

      {/* ── NOTES APP ── */}
      {activeApp==="notes" && (
        <AppWindow title="Notes" accentColor={APP_ACCENT.notes} onBack={()=>setActiveApp(null)}>
          <Notes notes={notes} onAdd={addNote} onUpdate={updateNote} onDelete={deleteNote}/>
        </AppWindow>
      )}

      {/* ── CALENDAR APP ── */}
      {activeApp==="calendar" && (
        <AppWindow title="Calendar" accentColor={APP_ACCENT.calendar} onBack={()=>setActiveApp(null)}
          navItems={APP_NAV.calendar} activeNav={getNav("calendar")} onNavChange={t=>setNav("calendar",t)}>
          {getNav("calendar")==="cal" && (
            <>
              <DateBar/>
              <ConsistencyCalendar todos={todos} weekOffDays={weekOffDays}/>
              {viewTodos.length>0&&(
                <div style={{marginTop:12}}>
                  <p style={{fontSize:11,color:"var(--muted)",fontWeight:600,marginBottom:8}}>{viewTodos.length} TASKS ON {viewDate}</p>
                  {viewTodos.slice(0,5).map(t=>(
                    <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(26,26,36,0.7)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,marginBottom:6}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:t.completed?"var(--success)":t.priority==="high"?"var(--danger)":t.priority==="medium"?"var(--warning)":"var(--success)",flexShrink:0}}/>
                      <span style={{fontSize:13,flex:1,color:t.completed?"var(--muted)":"var(--soft)",textDecoration:t.completed?"line-through":"none"}}>{t.title}</span>
                      {t.start_time&&<span style={{fontSize:11,color:"var(--muted)",fontFamily:"'JetBrains Mono',monospace"}}>{t.start_time}</span>}
                    </div>
                  ))}
                  {viewTodos.length>5&&<button onClick={()=>{setActiveApp("tasks");setNav("tasks","list");}} style={{width:"100%",padding:"8px",borderRadius:10,background:"none",border:"1px dashed rgba(232,197,71,0.2)",color:"var(--accent)",fontSize:12,cursor:"pointer"}}>+{viewTodos.length-5} more — open Tasks</button>}
                </div>
              )}
            </>
          )}
          {getNav("calendar")==="stats" && (
            <div style={{paddingTop:8}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                {[
                  {label:"Total Tasks",   value:todos.length,                         color:"var(--soft)"},
                  {label:"Completed",     value:todos.filter(t=>t.completed).length,  color:"var(--success)"},
                  {label:"Gym Sessions",  value:gymSessions.length,                   color:"#ff4757"},
                  {label:"Week-Off Days", value:weekOffDays.length,                   color:"#a78bfa"},
                  {label:"Notes",         value:notes.length,                         color:"#4facfe"},
                  {label:"Meals Logged",  value:meals.length,                         color:"#ffa502"},
                ].map(({label,value,color})=>(
                  <div key={label} style={{background:"rgba(26,26,36,0.85)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"14px 12px"}}>
                    <p style={{color,fontSize:26,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{value}</p>
                    <p style={{color:"var(--muted)",fontSize:11,marginTop:2}}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AppWindow>
      )}

      {/* Sign out button on home */}
      {!activeApp && (
        <button onClick={handleLogout}
          style={{position:"absolute",top:52,right:16,zIndex:20,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.6)",borderRadius:12,padding:"5px 10px",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5,backdropFilter:"blur(10px)"}}>
          <LogOut size={11}/> Out
        </button>
      )}

      <NotificationManager todos={todos} selectedDate={selectedDate}/>
      <InstallBanner/>
    </PhoneShell>
  );
}
