"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Dumbbell, X, Scale, Timer, Pencil, TrendingUp, TrendingDown, Minus, Info, BookOpen } from "lucide-react";
import { GymSession, Exercise, ExerciseSet, WorkoutSplit, ExerciseCategory, BodyWeightLog } from "@/lib/types";
import WorkoutPlayer from "@/components/WorkoutPlayer";

interface Props {
  sessions: GymSession[];
  bodyWeightLogs: BodyWeightLog[];
  selectedDate: string | null;
  onAdd: (session: Omit<GymSession, "id" | "user_id" | "created_at">) => Promise<void>;
  onUpdate: (id: string, updates: Partial<GymSession>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddWeight: (log: Omit<BodyWeightLog, "id" | "user_id" | "created_at">) => Promise<void>;
  onUpdateWeight: (id: string, updates: Partial<BodyWeightLog>) => Promise<void>;
}

// ── HISTORY HELPERS ───────────────────────────────────────────────────────────
function getPrevSession(sessions: GymSession[], currentDate: string, split: WorkoutSplit): GymSession | null {
  return sessions.filter(s => s.split === split && s.date < currentDate).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}
interface ExerciseHistory { date: string; maxWeight: number; maxReps: number; volume: number; sets: ExerciseSet[] }
function getExerciseHistory(sessions: GymSession[], name: string): ExerciseHistory[] {
  const hist: ExerciseHistory[] = [];
  sessions.filter(s => s.exercises.some(e => e.name === name)).sort((a,b)=>a.date.localeCompare(b.date)).forEach(s => {
    const ex = s.exercises.find(e => e.name === name); if (!ex) return;
    const cs = ex.sets.filter(set => set.completed); if (!cs.length) return;
    hist.push({ date: s.date, maxWeight: Math.max(...cs.map(s=>s.weight||0)), maxReps: Math.max(...cs.map(s=>s.reps||0)), volume: cs.reduce((a,s)=>a+(s.weight||0)*(s.reps||0),0), sets: cs });
  });
  return hist;
}

// ── SVG LINE CHART ────────────────────────────────────────────────────────────
function LineChart({ data, color="#e8c547", label="", unit="", height=72 }: { data:{x:string;y:number}[]; color?:string; label?:string; unit?:string; height?:number }) {
  if (data.length < 2) return null;
  const W=320,H=height,pad={t:8,b:22,l:8,r:8},w=W-pad.l-pad.r,h=H-pad.t-pad.b;
  const ys=data.map(d=>d.y),minY=Math.min(...ys),maxY=Math.max(...ys),rangeY=maxY-minY||1;
  const cx=(i:number)=>pad.l+(i/(data.length-1))*w;
  const cy=(y:number)=>pad.t+h-((y-minY)/rangeY)*h;
  const pts=data.map((d,i)=>`${cx(i)},${cy(d.y)}`).join(" ");
  const area=`M${cx(0)},${cy(data[0].y)} `+data.map((d,i)=>`L${cx(i)},${cy(d.y)}`).join(" ")+` L${cx(data.length-1)},${H-pad.b} L${cx(0)},${H-pad.b} Z`;
  const diff=ys[ys.length-1]-ys[0];
  return (
    <div style={{width:"100%"}}>
      {label&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,color:"var(--muted)",fontWeight:600,letterSpacing:"0.06em"}}>{label.toUpperCase()}</span>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:12,color,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{ys[ys.length-1]}{unit}</span>
          {diff!==0&&<span style={{fontSize:10,color:diff>0?"#2ed573":"#ff4757",display:"flex",alignItems:"center",gap:2}}>{diff>0?<TrendingUp size={10}/>:<TrendingDown size={10}/>}{diff>0?"+":""}{diff%1===0?diff:diff.toFixed(1)}{unit}</span>}
        </div>
      </div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height,overflow:"visible"}}>
        <defs><linearGradient id={`ag-${label}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0.02"/></linearGradient></defs>
        <path d={area} fill={`url(#ag-${label})`}/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {data.map((d,i)=><circle key={i} cx={cx(i)} cy={cy(d.y)} r={i===data.length-1?4:3} fill={i===data.length-1?color:"#0a0a0f"} stroke={color} strokeWidth="2"/>)}
        {data.map((d,i)=>{const show=i===0||i===data.length-1||i%Math.max(1,Math.floor(data.length/4))===0;return show?<text key={i} x={cx(i)} y={H-2} textAnchor="middle" style={{fontSize:8,fill:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace"}}>{d.x.slice(5)}</text>:null;})}
      </svg>
    </div>
  );
}

// ── BUILT WITH SCIENCE — UPPER/LOWER PLAN ─────────────────────────────────────
// Effort types: "2-3_shy" = 2-3 reps shy of failure, "failure" = to failure, "failure_partials" = to failure + lengthened partials

type EffortType = "2-3_shy" | "failure" | "failure_partials";
interface BWSSplit { key: WorkoutSplit; label: string; short: string; day: string; color: string; focus: string; schedule: string }

const BWS_SPLITS: BWSSplit[] = [
  { key:"upper_body_1" as WorkoutSplit, label:"Upper Body 1",  short:"UB1", day:"Monday",   color:"#4facfe", focus:"Chest · Back · Shoulders · Arms", schedule:"Mon or any upper day" },
  { key:"lower_body_1" as WorkoutSplit, label:"Lower Body 1",  short:"LB1", day:"Tuesday",  color:"#a78bfa", focus:"Quads · Hamstrings · Calves",       schedule:"Tue or any lower day" },
  { key:"upper_body_2" as WorkoutSplit, label:"Upper Body 2",  short:"UB2", day:"Thursday", color:"#2ed573", focus:"Chest · Back · Shoulders · Arms",    schedule:"Thu or any upper day" },
  { key:"lower_body_2" as WorkoutSplit, label:"Lower Body 2",  short:"LB2", day:"Friday",   color:"#ffa502", focus:"Glutes · Hamstrings · Calves",       schedule:"Fri or any lower day" },
  { key:"custom"       as WorkoutSplit, label:"Custom Workout", short:"CUSTOM", day:"Any", color:"#e8c547", focus:"Your choice",                         schedule:"Flexible" },
];

interface BWSExercise {
  name: string;
  category: ExerciseCategory;
  sets: number;
  repRange: string;      // e.g. "6-10", "10-15", "10-20"
  defaultReps: number;
  effort: EffortType[];  // one per set
  restMin: string;       // e.g. "2-3 min", "2 min"
  notes: string;         // form cue from the PDF
  alternatives?: string[];
  superset?: string;     // superset partner exercise name (for A1/A2)
  supersetLabel?: string; // "A1" or "A2"
  is_timed?: boolean;
}

const BWS_WORKOUTS: Record<string, BWSExercise[]> = {
  upper_body_1: [
    {
      name:"Flat Dumbbell Press", category:"chest", sets:3, repRange:"6-10", defaultReps:8,
      effort:["2-3_shy","2-3_shy","failure"], restMin:"2-3 min",
      notes:"Elbows 45-60° from torso. Kick dumbbells up one at a time. Shoulder blades pinched and pulled down. Push as if trying to touch biceps together at top. Lower until weights reach torso level.",
      alternatives:["Barbell Bench Press","Flat Machine Chest Press","Flat Smith Machine Chest Press","Seated Flat Cable Press","Neutral Grip DB Press"],
    },
    {
      name:"Dumbbell Chest Supported Row", category:"back", sets:3, repRange:"8-12", defaultReps:10,
      effort:["2-3_shy","2-3_shy","failure"], restMin:"2-3 min",
      notes:"Incline bench ~30°. Thumbless grip, chest on pad. Pull elbows back at 45-60° angle, squeeze shoulder blades at top. Let shoulder blades open up on descent. Think about pulling with elbows.",
      alternatives:["Barbell Row (mid/upper back)","Seated Cable Row","Chest Supported Machine Row"],
    },
    {
      name:"Seated Mid-Chest Cable Fly", category:"chest", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","failure_partials","failure_partials"], restMin:"2 min",
      notes:"Bench ~75°. Cables at mid-chest level. Arms out to sides, elbows bent. Think about squeezing biceps together. PAUSE at end position briefly. Lower with control, elbows to torso level.",
      alternatives:["Standing Mid-Chest Cable Fly","Pec-Deck Machine Fly","Dumbbell Fly","Banded Push-Ups"],
    },
    {
      name:"Lat Pulldowns", category:"back", sets:3, repRange:"8-12", defaultReps:10,
      effort:["2-3_shy","2-3_shy","failure_partials"], restMin:"2 min",
      notes:"Overhand grip just outside shoulder-width. Thighs locked under pad. Tilt upper back slightly back. Pull elbows DOWN to chin level. Use thumbless grip and think about pulling with elbows not hands.",
      alternatives:["(Weighted) Pull-Ups","Kneeling One Arm Lat Pulldown","3 Point Dumbbell Row","Barbell Row (lat focus)"],
    },
    {
      name:"Cable Lateral Raises", category:"shoulders", sets:3, repRange:"10-20", defaultReps:15,
      effort:["2-3_shy","failure_partials","failure_partials"], restMin:"1 min between arms",
      notes:"Cable at bottom. Face AWAY from cable, grab handle behind body. Step forward and sideways toward working arm. Raise arm diagonally 15-30° IN FRONT of body to shoulder height. Switch arms after 30s rest.",
      alternatives:["Dumbbell Lateral Raise","Lying Incline Lateral Raise","Lean In Lateral Raise"],
    },
    {
      name:"Behind Body Cable Curls", category:"biceps", sets:2, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","failure_partials"], restMin:"2 min",
      notes:"Handle at lowest position. Face AWAY from cable, arms hang slightly BEHIND body. Curl up and slightly inward to match cable direction. Keep elbows locked in place. Arms reach chest level at top.",
      alternatives:["Incline Dumbbell Curls","Barbell Curl"],
    },
    {
      name:"Cable Pushdowns (Elbow Friendly)", category:"triceps", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","failure_partials","failure_partials"], restMin:"2 min",
      notes:"Two rope attachments at highest position. 2-3 steps back, torso forward ~30°. Elbows at sides angled out slightly. PULL the ropes DOWN and OUT apart. Feel as if spreading the ropes. Hands return to chest height.",
      alternatives:["Incline DB Overhead Extensions","Overhead Rope Extensions","Incline Barbell Skullcrushers","Cross Cable Tricep Extensions"],
    },
  ],
  lower_body_1: [
    {
      name:"Barbell Back Squat", category:"legs", sets:3, repRange:"6-10", defaultReps:8,
      effort:["2-3_shy","2-3_shy","2-3_shy"], restMin:"2-3 min",
      notes:"Bar on upper traps. Stance just outside shoulder-width, toes 15° out. BAR STAYS OVER MID-FOOT. Weight even across big toe, little toe, heels. Knees track toes. Squat until thighs at least parallel. Core braced throughout. Bar makes vertical path.",
      alternatives:["Quad-Focused Leg Press","Smith Machine Squat","Dumbbell Goblet Squat","Bulgarian Split Squat (quad focus)"],
    },
    {
      name:"Seated Leg Curls", category:"legs", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","failure_partials","failure_partials"], restMin:"Superset — 1 min between A1/A2",
      superset:"Seated Leg Extensions", supersetLabel:"A1",
      notes:"SUPERSET A1: Knees aligned with pivot point. Toes pointed straight up. Pull LAT handles up to engage lats. Stop JUST BEFORE legs fully straighten at top (avoid first 15° to target hamstrings not calves).",
      alternatives:["Lying Leg Curls","Swiss Ball Leg Curls","Dumbbell Lying Leg Curls"],
    },
    {
      name:"Seated Leg Extensions", category:"legs", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","failure_partials","failure_partials"], restMin:"Superset — 1 min between A1/A2",
      superset:"Seated Leg Curls", supersetLabel:"A2",
      notes:"SUPERSET A2: Knees aligned with pivot point. Legs at ~90° starting position. Toes straight up, knees forward throughout. Extend fully, PAUSE at top briefly. Control all the way back down.",
      alternatives:["Sissy Squat","Heel Elevated Goblet Squat","Reverse Lunges"],
    },
    {
      name:"Hyperextensions (Back/Hamstring)", category:"legs", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","2-3_shy","2-3_shy"], restMin:"1.5-2 min",
      notes:"Thigh pads just BELOW hip crease. Heels firmly on foot pad. Cross hands over chest. Start slightly below parallel. TUCK CHIN to align neck. Lift chest until torso inline with lower body. Pause 1 second at top. Can progress to weighted (barbell or dumbbells).",
      alternatives:["Barbell Deadlift","Sumo Deadlift","Dumbbell Romanian Deadlift","Glute Focused Leg Press"],
    },
    {
      name:"Standing Weighted Calf Raises", category:"legs", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","failure_partials","failure_partials"], restMin:"1.5-2 min",
      notes:"Barbell or dumbbells. Feet hip-width apart. Push STRAIGHT UP onto toes, pressure on big toes. Control heels slowly back down to ground. Progress by adding weight plate under toes for greater ROM.",
      alternatives:["Single Leg Weighted Calf Raise","Toes-Elevated Smith Machine Calf Raise","Leg Press Calf Raise"],
    },
  ],
  upper_body_2: [
    {
      name:"Low Incline Dumbbell Press", category:"chest", sets:3, repRange:"6-10", defaultReps:8,
      effort:["2-3_shy","2-3_shy","failure"], restMin:"2-3 min",
      notes:"Bench at 15-30° (1st-2nd notch). Elbows 45-60° from torso. Same as flat press but inclined. Think about pulling biceps together to move weight up. Lower to chest level.",
      alternatives:["Incline Machine Chest Press","Low Incline Smith Machine Press","Low Incline Barbell Press","Low Incline Cable Press","(Banded) Decline Push-Ups"],
    },
    {
      name:"Pull-Ups", category:"back", sets:3, repRange:"6-10", defaultReps:6,
      effort:["2-3_shy","2-3_shy","failure"], restMin:"2-3 min",
      notes:"Overhand grip just OUTSIDE shoulder-width. Feet together, quads + glutes + abs tight. INITIATE by bringing shoulders DOWN from ears. Then pull elbows DOWN AND BACK into back pockets. Bring chest up to bar. Control descent until arms almost straight.",
      alternatives:["Lat Pulldown","Kneeling One Arm Lat Pulldown","3 Point Dumbbell Row","Barbell Row (lat focus)"],
    },
    {
      name:"Seated Mid-Chest Cable Fly", category:"chest", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","2-3_shy","failure_partials"], restMin:"2 min",
      notes:"Same setup as UB1. Bench ~75°, cables at mid-chest. Squeeze biceps together at top. PAUSE at end position. Control back down.",
      alternatives:["Standing Mid-Chest Cable Fly","Pec-Deck Machine Fly","Dumbbell Fly","Banded Push-Ups"],
    },
    {
      name:"Seated Cable Row (Mid/Upper Back)", category:"back", sets:3, repRange:"8-12", defaultReps:10,
      effort:["2-3_shy","2-3_shy","failure_partials"], restMin:"2 min",
      notes:"Wider handle setup (not V-bar) so elbows flare outward. Knees slightly bent, back straight. Shoulders down from ears. Pull elbows back at 45-60° angle. Squeeze shoulder blades together. Can let upper body lean forward to open back fully — keep lower back stable.",
      alternatives:["Barbell Row (mid/upper back)","DB Chest Supported Row","Chest Supported Machine Row"],
    },
    {
      name:"Dumbbell Lateral Raises", category:"shoulders", sets:3, repRange:"10-20", defaultReps:15,
      effort:["2-3_shy","2-3_shy","failure_partials"], restMin:"2 min",
      notes:"Feet shoulder-width, knees slightly bent, torso FORWARD 15°. Raise arms in a Y position 15-30° IN FRONT of body (not straight to sides). Raise to shoulder height. Use THUMBLESS GRIP and think about pushing hands OUT toward walls.",
      alternatives:["Cable Lateral Raise","Lying Incline Lateral Raise","Lean In Lateral Raise"],
    },
    {
      name:"Incline DB Overhead Extensions", category:"triceps", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","2-3_shy","failure_partials"], restMin:"2 min",
      notes:"Bench at 45° (2-3 notches up). Arms straight over shoulders, palms facing in. Move arms BACK parallel to torso and LOCK ELBOWS there. Bend forearms behind head as far as possible. Extend without moving elbows.",
      alternatives:["Overhead Rope Extensions","Cable Pushdowns","Incline Barbell Skullcrushers","Cross Cable Tricep Extensions"],
    },
    {
      name:"Incline Dumbbell Curls", category:"biceps", sets:2, repRange:"8-12", defaultReps:10,
      effort:["2-3_shy","failure_partials"], restMin:"2 min",
      notes:"Bench at ~60° (2-3 notches down from top). Arms hang STRAIGHT DOWN by sides, palms facing in. Shoulders down from ears. KEEP ELBOWS LOCKED. Curl up and rotate palms to face ceiling at top. Let arms fully straighten between reps.",
      alternatives:["Behind Body Cable Curls","Barbell Curl"],
    },
  ],
  lower_body_2: [
    {
      name:"Barbell Hip Thrust", category:"legs", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","2-3_shy","failure"], restMin:"2 min",
      notes:"Bench/platform at knee/shin height. Bar padded, over hips. Feet shoulder-width, toes slightly out. At top: knees at 90°, shins vertical. TUCK CHIN down. Squeeze GLUTES before initiating. Push through HEELS, drive hips FORWARD. Pause 1-2 seconds at top squeezing glutes. Lower halfway down and repeat.",
      alternatives:["Smith Machine Hip Thrust","(Weighted) Single Leg Hip Thrusts","Hyperextensions (glute focus)","Reverse Hyperextensions"],
    },
    {
      name:"Barbell Romanian Deadlift", category:"legs", sets:3, repRange:"6-10", defaultReps:8,
      effort:["2-3_shy","2-3_shy","2-3_shy"], restMin:"2-3 min",
      notes:"Bar at mid-thigh to start. Shoulder-width overhand grip. Push HIPS STRAIGHT BACK on descent. Slight knee bend throughout. BAR STAYS CLOSE to body over mid-foot. Lower to knee/mid-shin — stop when lower back starts to round. 2-3s descent, 1s ascent. Think: pull floor back with heels as you come up.",
      alternatives:["Dumbbell Romanian Deadlift","Hyperextensions (back/hamstring)"],
    },
    {
      name:"Front Foot Elevated Reverse Lunges", category:"legs", sets:3, repRange:"6-10 per leg", defaultReps:8,
      effort:["2-3_shy","2-3_shy","failure"], restMin:"2 min",
      notes:"Stand on weight plate with dumbbells. Keep FRONT FOOT PLANTED. Long step back, drive back knee toward ground. Lean torso forward ~20° to engage glutes. Back knee almost touches ground. Push through HEEL of front foot to drive hips forward. Back leg is just a kickstand — don't rely on it.",
      alternatives:["Bulgarian Split Squat (glute focus)","Reverse Lunges","Weighted Step-Ups","Single-Leg Leg Press"],
    },
    {
      name:"Standing Weighted Calf Raises", category:"legs", sets:3, repRange:"10-15", defaultReps:12,
      effort:["2-3_shy","failure_partials","failure_partials"], restMin:"1.5-2 min",
      notes:"Same as LB1. Barbell or dumbbells. Push straight up on toes, pressure on big toes. Control heels slowly down. Elevate toes on plates for greater range of motion as you progress.",
      alternatives:["Single Leg Weighted Calf Raise","Toes-Elevated Smith Machine Calf Raise","Leg Press Calf Raise"],
    },
  ],
  custom: [],
};

// Exercise templates for add exercise panel
const EXERCISE_TEMPLATES: Record<ExerciseCategory, { name: string; is_timed?: boolean }[]> = {
  chest:    [{name:"Flat Dumbbell Press"},{name:"Low Incline Dumbbell Press"},{name:"Barbell Bench Press"},{name:"Cable Chest Fly"},{name:"Pec Deck Fly"},{name:"Push-Ups"},{name:"Dips"}],
  back:     [{name:"Lat Pulldowns"},{name:"Pull-Ups"},{name:"Dumbbell Chest Supported Row"},{name:"Seated Cable Row"},{name:"Barbell Row"},{name:"T-Bar Row"},{name:"Face Pulls"}],
  shoulders:[{name:"Dumbbell Lateral Raises"},{name:"Cable Lateral Raises"},{name:"Overhead Press"},{name:"Arnold Press"},{name:"Rear Delt Fly"},{name:"Face Pulls"},{name:"Shrugs"}],
  biceps:   [{name:"Incline Dumbbell Curls"},{name:"Behind Body Cable Curls"},{name:"Barbell Curl"},{name:"Hammer Curl"},{name:"Preacher Curl"},{name:"Cable Curl"}],
  triceps:  [{name:"Cable Pushdowns"},{name:"Incline DB Overhead Extensions"},{name:"Skull Crushers"},{name:"Overhead Rope Extensions"},{name:"Close Grip Bench"},{name:"Dips"}],
  legs:     [{name:"Barbell Back Squat"},{name:"Barbell Romanian Deadlift"},{name:"Barbell Hip Thrust"},{name:"Seated Leg Curls"},{name:"Seated Leg Extensions"},{name:"Front Foot Elevated Reverse Lunges"},{name:"Leg Press"},{name:"Calf Raises"},{name:"Hyperextensions"}],
  abs:      [{name:"Cable Crunches"},{name:"Hanging Leg Raises"},{name:"Ab Wheel"},{name:"Plank",is_timed:true},{name:"Russian Twists"},{name:"Dead Bug"}],
  forearms: [{name:"Wrist Curls"},{name:"Reverse Curls"},{name:"Farmer's Walk",is_timed:true}],
  cardio:   [{name:"Treadmill Run",is_timed:true},{name:"Cycling",is_timed:true},{name:"Jump Rope",is_timed:true},{name:"Rowing Machine",is_timed:true},{name:"HIIT",is_timed:true}],
  compound: [{name:"Deadlift"},{name:"Power Clean"},{name:"Barbell Back Squat"},{name:"Pull-Ups"},{name:"Dips"}],
};

const SPLIT_CATEGORIES: Record<string, ExerciseCategory[]> = {
  upper_body_1: ["chest","back","shoulders","biceps","triceps","abs"],
  lower_body_1: ["legs","abs","cardio"],
  upper_body_2: ["chest","back","shoulders","biceps","triceps","abs"],
  lower_body_2: ["legs","abs","cardio"],
  custom:       ["chest","back","legs","shoulders","biceps","triceps","forearms","abs","cardio","compound"],
};

// Effort label & color
function effortLabel(e: EffortType) {
  if (e === "2-3_shy") return { text:"2-3 shy of fail", color:"#4facfe" };
  if (e === "failure") return { text:"To failure", color:"#ffa502" };
  return { text:"Failure + partials", color:"#ff4757" };
}

function uid() { return Math.random().toString(36).slice(2,9); }
function fmtDuration(s: number) { if(s<60) return `${s}s`; return `${Math.floor(s/60)}m${s%60>0?` ${s%60}s`:""}`; }
function calcVolume(exercises: Exercise[]) {
  return exercises.reduce((t,ex)=>t+ex.sets.reduce((s,set)=>s+(set.completed&&!ex.is_timed?set.weight*set.reps:0),0),0);
}

function buildPresetExercises(split: string, prevSession?: GymSession|null): Exercise[] {
  return (BWS_WORKOUTS[split]||[]).map((p,i) => {
    const prevEx = prevSession?.exercises.find(e=>e.name===p.name);
    const prevSets = prevEx?.sets.filter(s=>s.completed)||[];
    return {
      id: uid(), name: p.name, category: p.category, order: i,
      is_timed: p.is_timed||false, notes: p.notes||"",
      sets: Array.from({length:p.sets},(_,si)=>{
        const prev = prevSets[si]||prevSets[prevSets.length-1];
        return {
          set_number: si+1, weight: prev?.weight??0, reps: prev?.reps??p.defaultReps,
          duration_seconds: p.is_timed?60:undefined, set_type: p.is_timed?"duration":"reps" as any,
          completed: false,
        };
      }),
    };
  });
}

// ── FORM CUES MODAL ───────────────────────────────────────────────────────────
function FormCuesModal({ exercise, onClose }: { exercise: BWSExercise; onClose: () => void }) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{background:"#14141e",borderRadius:"24px 24px 0 0",padding:20,width:"100%",maxHeight:"75vh",overflowY:"auto",border:"1px solid rgba(255,255,255,0.1)",paddingBottom:"calc(20px + env(safe-area-inset-bottom,16px))"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:"rgba(255,255,255,0.2)",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <BookOpen size={16} style={{color:"#4facfe",flexShrink:0}}/>
          <p style={{color:"#fff",fontWeight:700,fontSize:16}}>{exercise.name}</p>
        </div>
        <div style={{background:"rgba(79,172,254,0.08)",border:"1px solid rgba(79,172,254,0.2)",borderRadius:14,padding:14,marginBottom:14}}>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:700,letterSpacing:"0.1em",marginBottom:6}}>FORM CUES</p>
          <p style={{color:"rgba(255,255,255,0.8)",fontSize:13,lineHeight:1.6}}>{exercise.notes}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[{label:"Sets",value:String(exercise.sets)},{label:"Reps",value:exercise.repRange},{label:"Rest",value:exercise.restMin}].map(({label,value})=>(
            <div key={label} style={{background:"rgba(26,26,36,0.9)",borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
              <p style={{color:"var(--accent)",fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{value}</p>
              <p style={{color:"var(--muted)",fontSize:10}}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{marginBottom:14}}>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>EFFORT PER SET</p>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {exercise.effort.map((e,i)=>{const{text,color}=effortLabel(e);return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",background:"rgba(255,255,255,0.03)",borderRadius:8,border:`1px solid ${color}20`}}>
                <span style={{color:"var(--muted)",fontSize:11,minWidth:40}}>Set {i+1}</span>
                <span style={{color,fontSize:12,fontWeight:600}}>{text}</span>
              </div>
            );})}
          </div>
        </div>
        {exercise.alternatives&&exercise.alternatives.length>0&&(
          <div>
            <p style={{color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>ALTERNATIVES</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {exercise.alternatives.map(a=>(
                <span key={a} style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:"rgba(255,255,255,0.06)",color:"var(--muted)"}}>{a}</span>
              ))}
            </div>
          </div>
        )}
        {exercise.superset&&(
          <div style={{background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.25)",borderRadius:12,padding:12,marginTop:12}}>
            <p style={{color:"#a78bfa",fontSize:12,fontWeight:700}}>🔄 SUPERSET {exercise.supersetLabel} with: {exercise.superset}</p>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:11,marginTop:4}}>Perform both exercises back-to-back with ≤1 min rest between them</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SET ROW ───────────────────────────────────────────────────────────────────
function SetRow({ set, prevSet, effort, isTimed, onUpdate, onRemove }: {
  set: ExerciseSet; prevSet?: ExerciseSet; effort?: EffortType;
  isTimed: boolean; onUpdate:(u:Partial<ExerciseSet>)=>void; onRemove:()=>void;
}) {
  const improved = prevSet&&set.completed&&set.weight>0&&(set.weight>prevSet.weight||set.reps>prevSet.reps);
  const el = effort ? effortLabel(effort) : null;
  return (
    <div style={{paddingBottom:6,marginBottom:4,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      {el&&<div style={{marginBottom:3}}>
        <span style={{fontSize:9,color:el.color,fontWeight:700,letterSpacing:"0.06em",background:`${el.color}15`,padding:"1px 6px",borderRadius:4}}>{el.text.toUpperCase()}</span>
      </div>}
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:11,width:20,textAlign:"center",color:"var(--muted)",fontFamily:"'JetBrains Mono',monospace"}}>{set.set_number}</span>
        {isTimed ? (
          <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
            <input type="number" value={Math.floor((set.duration_seconds||60)/60)} onChange={e=>onUpdate({duration_seconds:parseInt(e.target.value||"0")*60+((set.duration_seconds||60)%60)})} className="input-field" style={{width:44,padding:"0.25rem",textAlign:"center",fontSize:12}}/>
            <span style={{color:"var(--muted)",fontSize:11}}>m</span>
            <input type="number" value={(set.duration_seconds||60)%60} onChange={e=>onUpdate({duration_seconds:Math.floor((set.duration_seconds||60)/60)*60+(parseInt(e.target.value||"0"))})} className="input-field" style={{width:44,padding:"0.25rem",textAlign:"center",fontSize:12}}/>
            <span style={{color:"var(--muted)",fontSize:11}}>s</span>
          </div>
        ) : (
          <>
            <input type="number" value={set.weight||""} onChange={e=>onUpdate({weight:parseFloat(e.target.value)||0})} className="input-field" style={{width:56,padding:"0.25rem",textAlign:"center",fontSize:12,borderColor:improved?"rgba(46,213,115,0.4)":undefined}} placeholder="kg"/>
            <span style={{color:"var(--muted)",fontSize:11}}>×</span>
            <input type="number" value={set.reps||""} onChange={e=>onUpdate({reps:parseInt(e.target.value)||0})} className="input-field" style={{width:50,padding:"0.25rem",textAlign:"center",fontSize:12}} placeholder="reps"/>
          </>
        )}
        <button onClick={()=>onUpdate({completed:!set.completed})} style={{width:24,height:24,borderRadius:6,background:set.completed?"var(--success)":"transparent",border:`1.5px solid ${set.completed?"var(--success)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}>
          {set.completed&&<Check size={11} style={{color:"#0a0a0f"}}/>}
        </button>
        <button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",padding:2}}><X size={11}/></button>
      </div>
      {prevSet&&!isTimed&&(
        <div style={{marginLeft:26,marginTop:2,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace"}}>
            prev: {prevSet.weight>0?`${prevSet.weight}kg`:"bw"} × {prevSet.reps||"—"}
          </span>
          {improved&&<span style={{fontSize:10,color:"#2ed573",fontWeight:700}}>↑ PR!</span>}
        </div>
      )}
    </div>
  );
}

// ── EXERCISE CARD ─────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, prevExercise, bwsData, allSessions, onUpdate, onRemove }: {
  exercise: Exercise; prevExercise?: Exercise; bwsData?: BWSExercise;
  allSessions: GymSession[]; onUpdate:(u:Partial<Exercise>)=>void; onRemove:()=>void;
}) {
  const [open, setOpen] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const completedSets = exercise.sets.filter(s=>s.completed).length;
  const volume = exercise.is_timed ? exercise.sets.filter(s=>s.completed).reduce((a,s)=>a+(s.duration_seconds||0),0) : exercise.sets.filter(s=>s.completed).reduce((a,s)=>a+s.weight*s.reps,0);
  const history = getExerciseHistory(allSessions,exercise.name);
  const weightData = history.map(h=>({x:h.date,y:h.maxWeight})).filter(d=>d.y>0);
  const volData    = history.map(h=>({x:h.date,y:h.volume})).filter(d=>d.y>0);

  function addSet() {
    const last=exercise.sets[exercise.sets.length-1];
    onUpdate({sets:[...exercise.sets,{set_number:exercise.sets.length+1,weight:last?.weight||0,reps:last?.reps||8,duration_seconds:exercise.is_timed?(last?.duration_seconds||60):undefined,set_type:exercise.is_timed?"duration":"reps" as any,completed:false}]});
  }
  function updateSet(idx:number,updates:Partial<ExerciseSet>) { onUpdate({sets:exercise.sets.map((s,i)=>i===idx?{...s,...updates}:s)}); }
  function removeSet(idx:number) { onUpdate({sets:exercise.sets.filter((_,i)=>i!==idx).map((s,i)=>({...s,set_number:i+1}))}); }

  return (
    <>
      {showForm&&bwsData&&<FormCuesModal exercise={bwsData} onClose={()=>setShowForm(false)}/>}
      <div style={{background:"rgba(26,26,36,0.9)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,marginBottom:10,overflow:"hidden"}}>
        <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
              <span style={{color:"#fff",fontSize:13,fontWeight:700}}>{exercise.name}</span>
              {bwsData?.superset&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:4,background:"rgba(167,139,250,0.15)",color:"#a78bfa"}}>{bwsData.supersetLabel} SUPERSET</span>}
              {history.length>=2&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:4,background:"rgba(99,102,241,0.12)",color:"#818cf8"}}>📈 {history.length}</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:11,color:"var(--muted)",fontFamily:"'JetBrains Mono',monospace"}}>{completedSets}/{exercise.sets.length} sets</span>
              {volume>0&&<span style={{fontSize:11,color:"var(--accent)",fontFamily:"'JetBrains Mono',monospace"}}>{exercise.is_timed?fmtDuration(volume):`${volume}kg`}</span>}
              {prevExercise&&<span style={{fontSize:10,color:"rgba(255,255,255,0.22)"}}>prev {prevExercise.sets.filter(s=>s.completed&&s.weight>0).reduce((a,s)=>a+s.weight*s.reps,0)}kg vol</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {bwsData&&<button onClick={e=>{e.stopPropagation();setShowForm(true);}} style={{background:"rgba(79,172,254,0.1)",border:"1px solid rgba(79,172,254,0.2)",borderRadius:8,padding:"4px 6px",cursor:"pointer",display:"flex",alignItems:"center"}}><Info size={13} style={{color:"#4facfe"}}/></button>}
            {history.length>=2&&<button onClick={e=>{e.stopPropagation();setShowChart(o=>!o);}} style={{background:showChart?"rgba(129,140,248,0.15)":"transparent",border:"none",borderRadius:8,padding:"4px",cursor:"pointer"}}><TrendingUp size={13} style={{color:showChart?"#818cf8":"var(--muted)"}}/></button>}
            <button onClick={e=>{e.stopPropagation();onRemove();}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)"}}><Trash2 size={12}/></button>
            {open?<ChevronUp size={14} style={{color:"var(--muted)"}}/>:<ChevronDown size={14} style={{color:"var(--muted)"}}/>}
          </div>
        </button>

        {open&&showChart&&history.length>=2&&(
          <div style={{padding:"0 14px 10px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{background:"rgba(10,10,15,0.6)",borderRadius:12,padding:12}}>
              {weightData.length>=2&&<div style={{marginBottom:10}}><LineChart data={weightData} color="#e8c547" label="Max Weight" unit="kg" height={64}/></div>}
              {volData.length>=2&&<LineChart data={volData} color="#818cf8" label="Session Volume" unit="kg" height={56}/>}
              <div style={{display:"flex",gap:12,marginTop:10,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                {weightData.length>0&&<div><p style={{color:"var(--muted)",fontSize:10}}>Best weight</p><p style={{color:"var(--accent)",fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{Math.max(...weightData.map(d=>d.y))}kg</p></div>}
                {volData.length>0&&<div><p style={{color:"var(--muted)",fontSize:10}}>Best volume</p><p style={{color:"#818cf8",fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{Math.max(...volData.map(d=>d.y))}kg</p></div>}
                <div><p style={{color:"var(--muted)",fontSize:10}}>Sessions</p><p style={{color:"#2ed573",fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{history.length}</p></div>
              </div>
            </div>
          </div>
        )}

        {open&&(
          <div style={{padding:"4px 14px 12px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
            {!exercise.is_timed&&(
              <div style={{display:"flex",gap:6,paddingBottom:4,marginBottom:2,color:"var(--muted)",fontSize:10,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{width:20}}>#</span><span style={{width:56,textAlign:"center"}}>kg</span><span style={{width:10}}></span><span style={{width:50,textAlign:"center"}}>Reps</span>
              </div>
            )}
            {exercise.sets.map((set,idx)=>(
              <SetRow key={idx} set={set} prevSet={prevExercise?.sets[idx]} effort={bwsData?.effort[idx]} isTimed={!!exercise.is_timed}
                onUpdate={u=>updateSet(idx,u)} onRemove={()=>removeSet(idx)}/>
            ))}
            <button onClick={addSet} style={{width:"100%",marginTop:6,padding:"7px",borderRadius:10,background:"none",border:"1px dashed rgba(232,197,71,0.25)",color:"var(--accent)",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
              <Plus size={11}/> Add Set
            </button>
            {exercise.notes&&<p style={{color:"rgba(255,255,255,0.3)",fontSize:11,marginTop:8,fontStyle:"italic",lineHeight:1.4}}>💡 {exercise.notes.slice(0,120)}{exercise.notes.length>120?"…":""}</p>}
          </div>
        )}
      </div>
    </>
  );
}

// ── ADD EXERCISE PANEL ─────────────────────────────────────────────────────────
function AddExercisePanel({ split, onAdd, onClose }: { split:string; onAdd:(e:Exercise)=>void; onClose:()=>void }) {
  const [category, setCategory] = useState<ExerciseCategory>((SPLIT_CATEGORIES[split]||SPLIT_CATEGORIES.custom)[0]);
  const [custom, setCustom] = useState("");
  const [isTimed, setIsTimed] = useState(false);
  function add(name:string,timed=isTimed) {
    onAdd({id:uid(),name,category,order:0,is_timed:timed,sets:[{set_number:1,weight:0,reps:timed?0:8,duration_seconds:timed?60:undefined,set_type:timed?"duration":"reps" as any,completed:false}]});
    onClose();
  }
  const cats = SPLIT_CATEGORIES[split]||SPLIT_CATEGORIES.custom;
  return (
    <div style={{background:"rgba(10,10,15,0.97)",border:"1px solid rgba(232,197,71,0.25)",borderRadius:16,padding:14,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{color:"#fff",fontSize:13,fontWeight:700}}>Add Exercise</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)"}}><X size={14}/></button>
      </div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
        {cats.map(cat=>(
          <button key={cat} onClick={()=>setCategory(cat)} style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:category===cat?"var(--accent)":"rgba(255,255,255,0.06)",color:category===cat?"#0a0a0f":"var(--muted)",border:"none",cursor:"pointer",textTransform:"capitalize"}}>{cat}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:10,maxHeight:160,overflowY:"auto"}}>
        {(EXERCISE_TEMPLATES[category]||[]).map(({name,is_timed:t})=>(
          <button key={name} onClick={()=>add(name,t||false)} style={{textAlign:"left",fontSize:12,padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,0.04)",color:"var(--soft)",border:"1px solid rgba(255,255,255,0.07)",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            {t&&<Timer size={9} style={{color:"#2ed573",flexShrink:0}}/>}{name}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
        <button onClick={()=>setIsTimed(t=>!t)} style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:isTimed?"rgba(46,213,115,0.15)":"rgba(255,255,255,0.06)",color:isTimed?"#2ed573":"var(--muted)",border:`1px solid ${isTimed?"rgba(46,213,115,0.3)":"var(--border)"}`,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
          <Timer size={10}/>{isTimed?"Timed":"Reps"}
        </button>
        <span style={{color:"var(--muted)",fontSize:11}}>for custom</span>
      </div>
      <div style={{display:"flex",gap:6}}>
        <input value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>e.key==="Enter"&&custom.trim()&&add(custom.trim())} className="input-field" style={{flex:1,padding:"0.4rem 0.7rem",fontSize:13}} placeholder="Custom exercise name..." autoFocus/>
        <button onClick={()=>custom.trim()&&add(custom.trim())} disabled={!custom.trim()} className="btn-primary" style={{fontSize:12,padding:"0.4rem 0.9rem",display:"flex",alignItems:"center",gap:4}}><Plus size={11}/>Add</button>
      </div>
    </div>
  );
}

// ── SESSION VIEW ───────────────────────────────────────────────────────────────
function SessionView({ session, prevSession, allSessions, onUpdate, onDelete }: {
  session: GymSession; prevSession: GymSession|null; allSessions: GymSession[];
  onUpdate:(u:Partial<GymSession>)=>void; onDelete:()=>void;
}) {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [playing, setPlaying] = useState(false);
  if (playing) return <WorkoutPlayer session={session} onUpdate={onUpdate} onClose={()=>setPlaying(false)}/>;

  const split = BWS_SPLITS.find(s=>s.key===session.split)||BWS_SPLITS[BWS_SPLITS.length-1];
  const volume = calcVolume(session.exercises);
  const prevVolume = prevSession?calcVolume(prevSession.exercises):0;
  const completedEx = session.exercises.filter(ex=>ex.sets.every(s=>s.completed)).length;
  const volDiff = prevVolume>0?volume-prevVolume:0;

  function addExercise(ex:Exercise) { const exercises=[...session.exercises,{...ex,order:session.exercises.length}]; onUpdate({exercises,total_volume:calcVolume(exercises)}); }
  function updateExercise(id:string,updates:Partial<Exercise>) { const exercises=session.exercises.map(ex=>ex.id===id?{...ex,...updates}:ex); onUpdate({exercises,total_volume:calcVolume(exercises)}); }
  function removeExercise(id:string) { const exercises=session.exercises.filter(ex=>ex.id!==id); onUpdate({exercises,total_volume:calcVolume(exercises)}); }
  function bwsDataFor(name:string) { return BWS_WORKOUTS[session.split]?.find(e=>e.name===name); }
  function prevExFor(name:string) { return prevSession?.exercises.find(e=>e.name===name); }

  return (
    <div>
      <div style={{background:`linear-gradient(135deg,${split.color}18 0%,rgba(26,26,36,0.9) 100%)`,border:`1px solid ${split.color}30`,borderRadius:16,padding:14,marginBottom:10}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:6,background:split.color,color:"#0a0a0f"}}>{split.short}</span>
              <span style={{color:"#fff",fontSize:14,fontWeight:700}}>{split.label}</span>
            </div>
            <p style={{color:"var(--muted)",fontSize:11}}>{split.focus}</p>
            <p style={{color:"rgba(255,255,255,0.3)",fontSize:10,marginTop:2}}>{split.schedule}</p>
          </div>
          <button onClick={onDelete} style={{background:"rgba(255,71,87,0.1)",border:"none",borderRadius:8,padding:"6px",cursor:"pointer"}}><Trash2 size={13} style={{color:"var(--muted)"}}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          {[
            {label:"Volume",value:volume>0?`${volume}kg`:"—",sub:prevVolume>0?`prev ${prevVolume}kg`:"",color:"var(--accent)",trend:volDiff},
            {label:"Done",value:`${completedEx}/${session.exercises.length} ex`,color:"#2ed573",trend:0,sub:""},
            {label:"Warmup",value:session.warmup_done?"✓ Done":"Pending",color:session.warmup_done?"#2ed573":"var(--warning)",trend:0,sub:""},
          ].map(({label,value,sub,color,trend})=>(
            <div key={label} style={{background:"rgba(10,10,15,0.5)",borderRadius:10,padding:"8px 6px",textAlign:"center"}}>
              <p style={{color,fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{value}</p>
              {trend!==0&&<p style={{color:trend>0?"#2ed573":"#ff4757",fontSize:9}}>{trend>0?"+":""}{trend}kg</p>}
              {sub&&!trend&&<p style={{color:"rgba(255,255,255,0.2)",fontSize:9}}>{sub}</p>}
              <p style={{color:"var(--muted)",fontSize:9}}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
          <button onClick={()=>onUpdate({warmup_done:!session.warmup_done})} style={{fontSize:11,padding:"5px 10px",borderRadius:8,background:session.warmup_done?"rgba(46,213,115,0.15)":"rgba(255,255,255,0.05)",color:session.warmup_done?"#2ed573":"var(--muted)",border:`1px solid ${session.warmup_done?"rgba(46,213,115,0.3)":"var(--border)"}`,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            {session.warmup_done&&<Check size={11}/>} WarmUp
          </button>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <input type="number" value={session.duration_minutes||""} onChange={e=>onUpdate({duration_minutes:parseInt(e.target.value)||undefined})} className="input-field" style={{width:56,padding:"0.3rem 0.4rem",fontSize:12}} placeholder="mins"/>
            <span style={{color:"var(--muted)",fontSize:11}}>min</span>
          </div>
        </div>
        {prevSession&&<p style={{color:"rgba(255,255,255,0.25)",fontSize:10}}>vs {new Date(prevSession.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}{prevSession.duration_minutes?` · ${prevSession.duration_minutes}min`:""}</p>}
        <input value={session.notes||""} onChange={e=>onUpdate({notes:e.target.value})} className="input-field" style={{padding:"0.35rem 0.6rem",fontSize:12,marginTop:8}} placeholder="Session notes..."/>
      </div>

      {/* BWS Week Schedule Info */}
      <div style={{background:"rgba(79,172,254,0.06)",border:"1px solid rgba(79,172,254,0.15)",borderRadius:12,padding:10,marginBottom:10}}>
        <p style={{color:"rgba(79,172,254,0.8)",fontSize:10,fontWeight:700,letterSpacing:"0.08em",marginBottom:4}}>📋 BUILT WITH SCIENCE — UPPER/LOWER PLAN</p>
        <p style={{color:"rgba(255,255,255,0.45)",fontSize:11}}>4 days/week · Mon UB1 · Tue LB1 · Thu UB2 · Fri LB2 · Rest Wed/Sat/Sun</p>
        <p style={{color:"rgba(255,255,255,0.3)",fontSize:10,marginTop:3}}>Tap ℹ on any exercise for form cues, effort guide & alternatives</p>
      </div>

      {showAddExercise&&<AddExercisePanel split={session.split} onAdd={addExercise} onClose={()=>setShowAddExercise(false)}/>}

      {session.exercises.length===0&&!showAddExercise&&(
        <div style={{textAlign:"center",padding:"32px 0",background:"rgba(26,26,36,0.5)",border:"1px dashed rgba(255,255,255,0.08)",borderRadius:14,marginBottom:10}}>
          <Dumbbell size={28} style={{color:"var(--muted)",margin:"0 auto 8px"}}/>
          <p style={{color:"var(--muted)",fontSize:13}}>No exercises yet</p>
        </div>
      )}

      {session.exercises.map(ex=>(
        <ExerciseCard key={ex.id} exercise={ex} prevExercise={prevExFor(ex.name)} bwsData={bwsDataFor(ex.name)}
          allSessions={allSessions} onUpdate={u=>updateExercise(ex.id,u)} onRemove={()=>removeExercise(ex.id)}/>
      ))}

      <button onClick={()=>setShowAddExercise(o=>!o)} style={{width:"100%",padding:"10px",borderRadius:14,background:"rgba(232,197,71,0.06)",border:"1px dashed rgba(232,197,71,0.25)",color:"var(--accent)",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:8}}>
        <Plus size={14}/> Add Exercise
      </button>

      {session.exercises.length>0&&(
        <button onClick={()=>setPlaying(true)} style={{width:"100%",padding:"13px",borderRadius:14,background:"linear-gradient(135deg,#6366f1 0%,#a78bfa 100%)",color:"#fff",border:"none",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 20px rgba(99,102,241,0.35)",marginBottom:8}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          Start Guided Workout
        </button>
      )}

      <button onClick={()=>onUpdate({completed:!session.completed})} style={{width:"100%",padding:"12px",borderRadius:14,background:session.completed?"rgba(46,213,115,0.15)":"var(--accent)",color:session.completed?"#2ed573":"#0a0a0f",border:session.completed?"1px solid rgba(46,213,115,0.3)":"none",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        {session.completed?<><Check size={16}/>Session Complete!</>:<><Dumbbell size={16}/>Mark Complete</>}
      </button>
    </div>
  );
}

// ── BODY WEIGHT WIDGET ────────────────────────────────────────────────────────
function BodyWeightWidget({ logs, date, onAdd, onUpdate }: { logs:BodyWeightLog[]; date:string; onAdd:Props["onAddWeight"]; onUpdate:Props["onUpdateWeight"] }) {
  const sorted=[...logs].sort((a,b)=>a.date.localeCompare(b.date));
  const today=logs.find(l=>l.date===date);
  const [editing,setEditing]=useState(!today);
  const [val,setVal]=useState(today?String(today.weight_kg):"");
  useEffect(()=>{ if(today){setEditing(false);setVal(String(today.weight_kg));}else{setEditing(true);} },[today?.id]);
  async function save() { const kg=parseFloat(val); if(!kg) return; if(today){await onUpdate(today.id,{weight_kg:kg});}else{await onAdd({date,weight_kg:kg});} setEditing(false); }
  const prev=sorted.filter(l=>l.date<date).slice(-1)[0];
  const diff=today&&prev?+(today.weight_kg-prev.weight_kg).toFixed(1):null;
  const chartData=sorted.slice(-12).map(l=>({x:l.date,y:l.weight_kg}));
  return (
    <div style={{background:"rgba(26,26,36,0.9)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:14,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Scale size={14} style={{color:"var(--accent)"}}/><span style={{color:"#fff",fontSize:14,fontWeight:700}}>Body Weight</span></div>
        {today&&!editing&&<button onClick={()=>{setVal(String(today.weight_kg));setEditing(true);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)"}}><Pencil size={13}/></button>}
      </div>
      {(editing||!today)?(
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <input type="number" value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} className="input-field" style={{flex:1,padding:"0.5rem 0.7rem",fontSize:20,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"var(--accent)"}} placeholder="e.g. 72.5" autoFocus step="0.1"/>
          <span style={{color:"var(--muted)",fontSize:13}}>kg</span>
          <button onClick={save} disabled={!val} className="btn-primary" style={{padding:"0.5rem 1rem",fontSize:13,display:"flex",alignItems:"center",gap:4}}><Check size={13}/>Save</button>
        </div>
      ):(
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span style={{color:"var(--accent)",fontSize:36,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{today?.weight_kg}</span>
          <span style={{color:"var(--muted)",fontSize:14}}>kg</span>
          {diff!==null&&<span style={{fontSize:13,padding:"4px 10px",borderRadius:100,fontWeight:700,display:"flex",alignItems:"center",gap:4,background:diff<0?"rgba(46,213,115,0.12)":diff>0?"rgba(255,71,87,0.12)":"rgba(255,255,255,0.06)",color:diff<0?"#2ed573":diff>0?"#ff4757":"var(--muted)"}}>
            {diff>0&&<TrendingUp size={12}/>}{diff<0&&<TrendingDown size={12}/>}{diff>0?"+":""}{diff} kg
          </span>}
        </div>
      )}
      {chartData.length>=2&&(
        <div style={{paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <LineChart data={chartData} color="#e8c547" label="Weight trend" unit="kg" height={72}/>
          <div style={{display:"flex",gap:14,marginTop:8}}>
            {[{label:"Low",value:Math.min(...chartData.map(d=>d.y)),color:"#2ed573"},{label:"High",value:Math.max(...chartData.map(d=>d.y)),color:"#ff4757"},{label:"Avg",value:+(chartData.reduce((a,d)=>a+d.y,0)/chartData.length).toFixed(1),color:"var(--muted)"}].map(({label,value,color})=>(
              <div key={label}><p style={{color:"var(--muted)",fontSize:10}}>{label}</p><p style={{color,fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{value}kg</p></div>
            ))}
            <div><p style={{color:"var(--muted)",fontSize:10}}>Entries</p><p style={{color:"var(--accent)",fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{chartData.length}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────────
export default function Gym({ sessions, bodyWeightLogs, selectedDate, onAdd, onUpdate, onDelete, onAddWeight, onUpdateWeight }: Props) {
  const date = selectedDate||new Date().toISOString().split("T")[0];
  const todaySession = sessions.find(s=>s.date===date);
  const [creating, setCreating] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit>("upper_body_1" as WorkoutSplit);
  const [usePreset, setUsePreset] = useState(true);

  async function createSession() {
    const split = BWS_SPLITS.find(s=>s.key===selectedSplit)!;
    const prevForNew = getPrevSession(sessions, date, selectedSplit);
    await onAdd({ date, split:selectedSplit, split_label:split.label, exercises:usePreset&&selectedSplit!=="custom"?buildPresetExercises(selectedSplit,prevForNew):[], warmup_done:false, warmup_type:"Dynamic warmup", completed:false });
    setCreating(false);
  }

  const prevSession = todaySession ? getPrevSession(sessions, date, todaySession.split) : null;
  const recentSessions = sessions.filter(s=>s.date!==date).slice(0,5);
  const volumeByDate = sessions.filter(s=>s.total_volume&&s.total_volume>0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-16).map(s=>({x:s.date,y:s.total_volume||0}));

  return (
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <h2 style={{color:"#fff",fontSize:16,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>Gym</h2>
          <p style={{color:"var(--muted)",fontSize:11}}>{date===new Date().toISOString().split("T")[0]?"Today":new Date(date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</p>
        </div>
        {!todaySession&&!creating&&<button onClick={()=>setCreating(true)} className="btn-primary" style={{fontSize:12,padding:"6px 14px",display:"flex",alignItems:"center",gap:6}}><Plus size={13}/>New Session</button>}
      </div>

      <BodyWeightWidget logs={bodyWeightLogs} date={date} onAdd={onAddWeight} onUpdate={onUpdateWeight}/>

      {volumeByDate.length>=3&&(
        <div style={{background:"rgba(26,26,36,0.8)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:12,marginBottom:12}}>
          <LineChart data={volumeByDate} color="#a78bfa" label="Total Session Volume" unit="kg" height={72}/>
        </div>
      )}

      {creating&&(
        <div style={{background:"rgba(26,26,36,0.9)",border:"1px solid rgba(232,197,71,0.2)",borderRadius:16,padding:14,marginBottom:12}}>
          <p style={{color:"#fff",fontSize:14,fontWeight:700,marginBottom:12}}>Choose Workout</p>
          <div style={{marginBottom:10}}>
            {BWS_SPLITS.map(s=>(
              <button key={s.key} onClick={()=>setSelectedSplit(s.key as WorkoutSplit)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,marginBottom:6,background:selectedSplit===s.key?`${s.color}15`:"rgba(255,255,255,0.03)",border:`1px solid ${selectedSplit===s.key?`${s.color}50`:"rgba(255,255,255,0.07)"}`,cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:6,background:s.color,color:"#0a0a0f",minWidth:44,textAlign:"center"}}>{s.short}</span>
                <div>
                  <p style={{color:"#fff",fontSize:13,fontWeight:600}}>{s.label}</p>
                  <p style={{color:"var(--muted)",fontSize:11}}>{s.focus} · {s.schedule}</p>
                </div>
              </button>
            ))}
          </div>
          {selectedSplit!=="custom"&&(
            <button onClick={()=>setUsePreset(p=>!p)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,marginBottom:10,background:usePreset?"rgba(79,172,254,0.08)":"rgba(255,255,255,0.03)",border:`1px solid ${usePreset?"rgba(79,172,254,0.3)":"var(--border)"}`,color:usePreset?"#4facfe":"var(--muted)",cursor:"pointer",fontSize:12}}>
              {usePreset?<Check size={14}/>:<div style={{width:14,height:14,border:"1px solid var(--border)",borderRadius:3}}/>}
              Load Built With Science exercises + form cues + effort guide
            </button>
          )}
          <div style={{display:"flex",gap:8}}>
            <button onClick={createSession} className="btn-primary" style={{flex:1,padding:"11px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Dumbbell size={14}/>Start Session</button>
            <button onClick={()=>setCreating(false)} className="btn-ghost" style={{padding:"11px 16px",fontSize:13}}><X size={14}/></button>
          </div>
        </div>
      )}

      {todaySession&&<SessionView session={todaySession} prevSession={prevSession} allSessions={sessions} onUpdate={u=>onUpdate(todaySession.id,u)} onDelete={()=>onDelete(todaySession.id)}/>}

      {!todaySession&&!creating&&(
        <div style={{textAlign:"center",padding:"40px 0",background:"rgba(26,26,36,0.5)",border:"1px solid var(--border)",borderRadius:16,marginBottom:12}}>
          <Dumbbell size={36} style={{color:"var(--muted)",margin:"0 auto 12px"}}/>
          <p style={{color:"var(--soft)",fontWeight:600,marginBottom:4}}>No session for this day</p>
          <p style={{color:"var(--muted)",fontSize:12,marginBottom:16}}>Built With Science Upper/Lower plan ready to load</p>
          <button onClick={()=>setCreating(true)} className="btn-primary" style={{fontSize:13,display:"inline-flex",alignItems:"center",gap:6}}><Plus size={14}/>New Session</button>
        </div>
      )}

      {recentSessions.length>0&&(
        <div>
          <p style={{color:"var(--muted)",fontSize:11,marginBottom:8}}>Recent Sessions</p>
          {recentSessions.map(s=>{
            const spl=BWS_SPLITS.find(sp=>sp.key===s.split)||BWS_SPLITS[BWS_SPLITS.length-1];
            return(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(26,26,36,0.6)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,marginBottom:6}}>
                <span style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:5,background:spl.color,color:"#0a0a0f",minWidth:40,textAlign:"center"}}>{spl.short}</span>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{color:"var(--soft)",fontSize:13,fontWeight:600}}>{s.split_label}</p>
                  <p style={{color:"var(--muted)",fontSize:11}}>{new Date(s.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}{s.total_volume?` · ${s.total_volume}kg`:""}{ s.duration_minutes?` · ${s.duration_minutes}min`:""}</p>
                </div>
                {s.completed&&<Check size={13} style={{color:"#2ed573",flexShrink:0}}/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
