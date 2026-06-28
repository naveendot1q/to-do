"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2, Copy, Check } from "lucide-react";

export default function SetupTOTPPage() {
  const [qrCode,    setQrCode]    = useState("");
  const [secret,    setSecret]    = useState("");
  const [factorId,  setFactorId]  = useState("");
  const [code,      setCode]      = useState(["","","","","",""]);
  const [loading,   setLoading]   = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState("");
  const [copied,    setCopied]    = useState(false);
  const inputs = useRef<(HTMLInputElement|null)[]>([]);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => { setup(); }, []);

  async function setup() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { data:aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel==="aal2") { router.push("/"); return; }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType:"totp", issuer:"NaveenOS", friendlyName:"Microsoft Authenticator" });
    if (error||!data) { setError("Setup failed."); setLoading(false); return; }
    setFactorId(data.id); setQrCode(data.totp.qr_code); setSecret(data.totp.secret);
    setLoading(false);
    setTimeout(()=>inputs.current[0]?.focus(),100);
  }

  function handleChange(i:number,v:string) {
    if(!/^\d*$/.test(v)) return;
    const n=[...code]; n[i]=v.slice(-1); setCode(n);
    if(v&&i<5) inputs.current[i+1]?.focus();
    if(n.every(d=>d)&&n.join("").length===6) handleVerify(n.join(""));
  }
  function handleKey(i:number,e:React.KeyboardEvent) { if(e.key==="Backspace"&&!code[i]&&i>0) inputs.current[i-1]?.focus(); }
  function handlePaste(e:React.ClipboardEvent) { e.preventDefault(); const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6); if(p.length===6){setCode(p.split(""));handleVerify(p);} }

  async function handleVerify(c:string) {
    setError(""); setVerifying(true);
    const { data:ch,error:ce } = await supabase.auth.mfa.challenge({ factorId });
    if(ce||!ch) { setError("Challenge failed."); setVerifying(false); return; }
    const { error:ve } = await supabase.auth.mfa.verify({ factorId, challengeId:ch.id, code:c });
    if(ve) { setError("Invalid code. Try again."); setCode(["","","","","",""]); inputs.current[0]?.focus(); setVerifying(false); return; }
    router.push("/");
  }

  const inputStyle = {
    width:44, height:56, borderRadius:14,
    background:"rgba(10,10,15,0.8)", border:"1.5px solid rgba(255,255,255,0.12)",
    color:"#fff", fontSize:24, fontWeight:700, textAlign:"center" as const,
    fontFamily:"'JetBrains Mono',monospace", outline:"none",
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
      overflowY:"auto",
      padding:"env(safe-area-inset-top,20px) 24px env(safe-area-inset-bottom,20px)",
      minHeight:"100dvh",
    }}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at 30% 20%,rgba(99,102,241,0.18) 0%,transparent 50%)"}}/>

      <div style={{position:"relative",zIndex:10,maxWidth:400,margin:"0 auto",paddingTop:20}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:68,height:68,borderRadius:20,
            background:"rgba(46,213,115,0.12)",border:"1px solid rgba(46,213,115,0.25)",
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            fontSize:"1.8rem",marginBottom:16}}>
            🛡️
          </div>
          <h1 style={{fontSize:22,fontWeight:800,color:"#fff",fontFamily:"'Playfair Display',serif",marginBottom:6}}>Set Up 2FA</h1>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:13}}>Scan with Microsoft Authenticator</p>
        </div>

        {/* Steps */}
        <div style={{background:"rgba(26,26,36,0.8)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:16,marginBottom:20}}>
          {["Open Microsoft Authenticator","Tap + → Other account","Scan the QR code below","Enter the 6-digit code"].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:i<3?10:0}}>
              <span style={{width:24,height:24,borderRadius:"50%",flexShrink:0,
                background:"rgba(232,197,71,0.15)",color:"#e8c547",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>
                {i+1}
              </span>
              <span style={{color:"rgba(255,255,255,0.6)",fontSize:13}}>{s}</span>
            </div>
          ))}
        </div>

        {/* QR code */}
        {qrCode&&(
          <div style={{background:"rgba(26,26,36,0.8)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:20,marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
              <div style={{padding:12,background:"#fff",borderRadius:14}}>
                <img src={qrCode} alt="QR" width={160} height={160}/>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(10,10,15,0.8)",
              border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 12px"}}>
              <code style={{flex:1,fontSize:11,color:"#e8c547",fontFamily:"'JetBrains Mono',monospace",
                wordBreak:"break-all",lineHeight:1.5}}>{secret}</code>
              <button onClick={async()=>{await navigator.clipboard.writeText(secret);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
                style={{background:"none",border:"none",cursor:"pointer",color:copied?"#2ed573":"rgba(255,255,255,0.4)",flexShrink:0,padding:4}}>
                {copied?<Check size={16}/>:<Copy size={16}/>}
              </button>
            </div>
          </div>
        )}

        {/* OTP inputs */}
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:20}} onPaste={handlePaste}>
          {code.map((d,i)=>(
            <input key={i} ref={el=>{inputs.current[i]=el;}}
              type="text" inputMode="numeric" value={d}
              onChange={e=>handleChange(i,e.target.value)} onKeyDown={e=>handleKey(i,e)}
              style={{...inputStyle,borderColor:d?"rgba(232,197,71,0.6)":"rgba(255,255,255,0.12)"}}
              maxLength={1} disabled={verifying}/>
          ))}
        </div>

        {error&&<div style={{background:"rgba(255,71,87,0.12)",border:"1px solid rgba(255,71,87,0.3)",
          borderRadius:12,padding:"12px 16px",fontSize:13,color:"#ff4757",marginBottom:16,textAlign:"center"}}>
          {error}
        </div>}

        <button onClick={()=>handleVerify(code.join(""))} disabled={verifying||code.join("").length<6}
          style={{width:"100%",background:"linear-gradient(135deg,#e8c547,#f0d060)",
            border:"none",borderRadius:14,color:"#0a0a0f",fontSize:16,fontWeight:800,
            padding:"16px",cursor:(verifying||code.join("").length<6)?"not-allowed":"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            opacity:(verifying||code.join("").length<6)?0.5:1,
            boxShadow:"0 4px 20px rgba(232,197,71,0.3)",marginBottom:20}}>
          {verifying?<Loader2 size={20} style={{animation:"spin 1s linear infinite"}}/>:"Activate 2FA & Continue"}
        </button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
