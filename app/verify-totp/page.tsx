"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Smartphone, Loader2, ArrowLeft, RefreshCw } from "lucide-react";

export default function VerifyTOTPPage() {
  const [code, setCode] = useState(["","","","","",""]);
  const [factorId, setFactorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
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

  function handleChange(i: number, v: string) {
    if (!/^\d*$/.test(v)) return;
    const n = [...code]; n[i] = v.slice(-1); setCode(n);
    if (v && i < 5) inputs.current[i+1]?.focus();
    if (n.every(d => d) && n.join("").length === 6) handleVerify(n.join(""));
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent) { if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i-1]?.focus(); }
  function handlePaste(e: React.ClipboardEvent) { e.preventDefault(); const p = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6); if (p.length===6) { setCode(p.split("")); handleVerify(p); } }

  async function handleVerify(c: string) {
    setError(""); setVerifying(true);
    const { data: ch, error: ce } = await supabase.auth.mfa.challenge({ factorId });
    if (ce || !ch) { setError("Challenge failed."); setVerifying(false); return; }
    const { error: ve } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: c });
    if (ve) { setError("Invalid code. Check Microsoft Authenticator."); setCode(["","","","","",""]); inputs.current[0]?.focus(); setVerifying(false); return; }
    router.push("/");
  }

  if (loading) return <div className="auth-bg min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} /></div>;

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(232,197,71,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(232,197,71,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div className="glass rounded-2xl p-8 w-full max-w-md animate-slide-up" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
        <button onClick={() => router.push("/login")} className="flex items-center gap-1.5 text-sm mb-6 hover:text-white transition-colors" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ background: "rgba(232,197,71,0.1)", border: "1px solid rgba(232,197,71,0.2)" }}>
            <Smartphone size={24} style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Playfair Display',serif", color: "#fff" }}>Two-Factor Auth</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Enter the 6-digit code from Microsoft Authenticator</p>
        </div>
        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {code.map((d,i) => (
            <input key={i} ref={el => { inputs.current[i]=el; }} type="text" inputMode="numeric" value={d}
              onChange={e => handleChange(i,e.target.value)} onKeyDown={e => handleKeyDown(i,e)}
              className="otp-input" maxLength={1} disabled={verifying} />
          ))}
        </div>
        {error && <div className="rounded-lg p-3 text-sm mb-4 text-center" style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.2)", color: "var(--danger)" }}>{error}</div>}
        <button onClick={() => handleVerify(code.join(""))} className="btn-primary w-full flex items-center justify-center gap-2" disabled={verifying || code.join("").length < 6}>
          {verifying ? <Loader2 size={18} className="animate-spin" /> : "Verify & Sign In"}
        </button>
        <p className="text-center text-xs mt-4" style={{ color: "var(--muted)" }}>Code refreshes every 30 seconds</p>
      </div>
    </div>
  );
}
