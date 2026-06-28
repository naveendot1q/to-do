"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const router   = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError("Invalid email or password."); setLoading(false); return; }
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === "aal2" && data?.currentLevel !== "aal2") router.push("/verify-totp");
    else router.push("/setup-totp");
    setLoading(false);
  }

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"linear-gradient(135deg,#07070d 0%,#0f0f1a 60%,#0a0a0f 100%)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)",
      minHeight:"100dvh",
    }}>
      {/* Background glow */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at 30% 20%,rgba(99,102,241,0.18) 0%,transparent 50%),radial-gradient(ellipse at 75% 80%,rgba(232,197,71,0.1) 0%,transparent 45%)"}}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(232,197,71,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(232,197,71,0.025) 1px,transparent 1px)",
        backgroundSize:"60px 60px"}}/>

      <div style={{position:"relative",zIndex:10,width:"100%",maxWidth:400,padding:"0 24px"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:72,height:72,borderRadius:22,background:"linear-gradient(135deg,#667eea,#764ba2)",
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            fontSize:"2rem",marginBottom:20,
            boxShadow:"0 8px 32px rgba(99,102,241,0.4)"}}>
            🌅
          </div>
          <h1 style={{fontSize:28,fontWeight:800,color:"#fff",fontFamily:"'Playfair Display',serif",marginBottom:6}}>
            Naveen's OS
          </h1>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>Your private workspace</p>
        </div>

        {/* Form card */}
        <div style={{background:"rgba(26,26,36,0.9)",border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:24,padding:28,backdropFilter:"blur(20px)"}}>
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",
                letterSpacing:"0.08em",marginBottom:8}}>EMAIL</label>
              <div style={{position:"relative"}}>
                <Mail size={15} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.3)"}}/>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  style={{width:"100%",background:"rgba(10,10,15,0.8)",border:"1px solid rgba(255,255,255,0.1)",
                    borderRadius:12,color:"#fff",fontSize:15,padding:"14px 14px 14px 42px",
                    outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box"}}
                  placeholder="you@example.com" required autoComplete="email"
                  onFocus={e=>{e.target.style.borderColor="rgba(232,197,71,0.5)";}}
                  onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.1)";}}/>
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",
                letterSpacing:"0.08em",marginBottom:8}}>PASSWORD</label>
              <div style={{position:"relative"}}>
                <Lock size={15} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.3)"}}/>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                  style={{width:"100%",background:"rgba(10,10,15,0.8)",border:"1px solid rgba(255,255,255,0.1)",
                    borderRadius:12,color:"#fff",fontSize:15,padding:"14px 14px 14px 42px",
                    outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box"}}
                  placeholder="••••••••" required autoComplete="current-password"
                  onFocus={e=>{e.target.style.borderColor="rgba(232,197,71,0.5)";}}
                  onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.1)";}}/>
              </div>
            </div>
            {error&&<div style={{background:"rgba(255,71,87,0.12)",border:"1px solid rgba(255,71,87,0.3)",
              borderRadius:10,padding:"10px 14px",fontSize:13,color:"#ff4757",marginBottom:16}}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{width:"100%",background:"linear-gradient(135deg,#e8c547,#f0d060)",
                border:"none",borderRadius:14,color:"#0a0a0f",fontSize:16,fontWeight:800,
                padding:"16px",cursor:loading?"not-allowed":"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                boxShadow:"0 4px 20px rgba(232,197,71,0.3)",opacity:loading?0.7:1}}>
              {loading?<Loader2 size={20} style={{animation:"spin 1s linear infinite"}}/>:<>Sign In <ArrowRight size={18}/></>}
            </button>
          </form>
        </div>
        <p style={{textAlign:"center",fontSize:12,color:"rgba(255,255,255,0.25)",marginTop:20}}>
          🔐 Protected by Microsoft Authenticator (TOTP)
        </p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
