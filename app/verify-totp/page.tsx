"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2, ArrowLeft } from "lucide-react";

export default function VerifyTOTPPage() {
  const [code,      setCode]      = useState(["","","","","",""]);
  const [factorId,  setFactorId]  = useState("");
  const [loading,   setLoading]   = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState("");
  const inputs = useRef<(HTMLInputElement|null)[]>([]);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { data } = await supabase.auth.mfa.listFactors();
    const f = data?.totp?.[0];
    if (!f) { router.push("/setup-totp"); return; }
    setFactorId(f.id); setLoading(false);
    setTimeout(() => inputs.current[0]?.focus(), 100);
  }

  function handleChange(i:number, v:string) {
    if (!/^\d*$/.test(v)) return;
    const n=[...code]; n[i]=v.slice(-1); setCode(n);
    if (v && i<5) inputs.current[i+1]?.focus();
    if (n.every(d=>d) && n.join("").length===6) handleVerify(n.join(""));
  }
  function handleKey(i:number, e:React.KeyboardEvent) { if(e.key==="Backspace"&&!code[i]&&i>0) inputs.current[i-1]?.focus(); }
  function handlePaste(e:React.ClipboardEvent) { e.preventDefault(); const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6); if(p.length===6){setCode(p.split(""));handleVerify(p);} }

  async function handleVerify(c:string) {
    setError(""); setVerifying(true);
    const { data:ch, error:ce } = await supabase.auth.mfa.challenge({ factorId });
    if (ce||!ch) { setError("Challenge failed."); setVerifying(false); return; }
    const { error:ve } = await supabase.auth.mfa.verify({ factorId, challengeId:ch.id, code:c });
    if (ve) { setError("Invalid code. Check Microsoft Authenticator."); setCode(["","","","","",""]); inputs.current[0]?.focus(); setVerifying(false); return; }
    router.push("/");
  }

  const inputStyle = {
    width:44, height:56, borderRadius:14,
    background:"rgba(10,10,15,0.8)", border:"1.5px solid rgba(255,255,255,0.12)",
    color:"#fff", fontSize:24, fontWeight:700, textAlign:"center" as const,
    fontFamily:"'JetBrains Mono',monospace", outline:"none",
    transition:"border-color 0.2s, box-shadow 0.2s",
  };

  if (loading) return (
    <div style={{position:"fixed",inset:0,background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <Loader2 size={32} style={{color:"#e8c547",animation:"spin 1s linear infinite"}}/>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"linear-gradient(135deg,#07070d 0%,#0f0f1a 60%,#0a0a0f 100%)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"env(safe-area-inset-top,20px) 24px env(safe-area-inset-bottom,20px)",
      minHeight:"100dvh",
    }}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at 30% 20%,rgba(99,102,241,0.18) 0%,transparent 50%)"}}/>

      <div style={{position:"relative",zIndex:10,width:"100%",maxWidth:400}}>
        <button onClick={()=>router.push("/login")}
          style={{display:"flex",alignItems:"center",gap:6,color:"rgba(255,255,255,0.4)",
            background:"none",border:"none",fontSize:14,cursor:"pointer",marginBottom:32,padding:0}}>
          <ArrowLeft size={16}/> Back to login
        </button>

        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:72,height:72,borderRadius:22,
            background:"rgba(232,197,71,0.12)",border:"1px solid rgba(232,197,71,0.25)",
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            fontSize:"2rem",marginBottom:20}}>
            🔐
          </div>
          <h1 style={{fontSize:24,fontWeight:800,color:"#fff",fontFamily:"'Playfair Display',serif",marginBottom:8}}>
            Two-Factor Auth
          </h1>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,lineHeight:1.5}}>
            Enter the 6-digit code from<br/>Microsoft Authenticator
          </p>
        </div>

        {/* OTP inputs */}
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:28}} onPaste={handlePaste}>
          {code.map((d,i)=>(
            <input key={i} ref={el=>{inputs.current[i]=el;}}
              type="text" inputMode="numeric" value={d}
              onChange={e=>handleChange(i,e.target.value)}
              onKeyDown={e=>handleKey(i,e)}
              style={{...inputStyle, borderColor:d?"rgba(232,197,71,0.6)":"rgba(255,255,255,0.12)",
                boxShadow:d?"0 0 0 3px rgba(232,197,71,0.12)":"none"}}
              maxLength={1} disabled={verifying}/>
          ))}
        </div>

        {error&&<div style={{background:"rgba(255,71,87,0.12)",border:"1px solid rgba(255,71,87,0.3)",
          borderRadius:12,padding:"12px 16px",fontSize:13,color:"#ff4757",marginBottom:20,textAlign:"center"}}>
          {error}
        </div>}

        <button onClick={()=>handleVerify(code.join(""))} disabled={verifying||code.join("").length<6}
          style={{width:"100%",background:"linear-gradient(135deg,#e8c547,#f0d060)",
            border:"none",borderRadius:14,color:"#0a0a0f",fontSize:16,fontWeight:800,
            padding:"16px",cursor:(verifying||code.join("").length<6)?"not-allowed":"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            opacity:(verifying||code.join("").length<6)?0.5:1,
            boxShadow:"0 4px 20px rgba(232,197,71,0.3)"}}>
          {verifying?<Loader2 size={20} style={{animation:"spin 1s linear infinite"}}/>:"Verify & Enter"}
        </button>

        <p style={{textAlign:"center",fontSize:12,color:"rgba(255,255,255,0.25)",marginTop:20}}>
          Code refreshes every 30 seconds
        </p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
