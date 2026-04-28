"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ShieldCheck, Loader2, Copy, Check } from "lucide-react";

export default function SetupTOTPPage() {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState(["","","","","",""]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { setup(); }, []);

  async function setup() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") { router.push("/"); return; }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "MyTodo", friendlyName: "Microsoft Authenticator" });
    if (error || !data) { setError("Setup failed."); setLoading(false); return; }
    setFactorId(data.id); setQrCode(data.totp.qr_code); setSecret(data.totp.secret);
    setLoading(false);
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
    if (ve) { setError("Invalid code. Try again."); setCode(["","","","","",""]); inputs.current[0]?.focus(); setVerifying(false); return; }
    router.push("/");
  }

  if (loading) return <div className="auth-bg min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} /></div>;

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(232,197,71,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(232,197,71,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div className="glass rounded-2xl p-8 w-full max-w-md animate-slide-up" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ background: "rgba(232,197,71,0.1)", border: "1px solid rgba(232,197,71,0.2)" }}>
            <ShieldCheck size={24} style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Playfair Display',serif", color: "#fff" }}>Set Up 2FA</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Scan with Microsoft Authenticator</p>
        </div>
        <div className="space-y-2 mb-4">
          {["Open Microsoft Authenticator","Tap + → Other account","Scan the QR code","Enter the 6-digit code"].map((s,i) => (
            <div key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--muted)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(232,197,71,0.15)", color: "var(--accent)" }}>{i+1}</span>{s}
            </div>
          ))}
        </div>
        {qrCode && (
          <div className="flex flex-col items-center mb-4 gap-3">
            <div className="p-3 rounded-xl" style={{ background: "#fff" }}>
              <img src={qrCode} alt="QR" width={160} height={160} />
            </div>
            <div className="w-full flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(10,10,15,0.8)", border: "1px solid var(--border)" }}>
              <code className="flex-1 text-xs break-all" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>{secret}</code>
              <button onClick={async () => { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-1.5 rounded hover:bg-white/5" style={{ color: copied ? "var(--success)" : "var(--muted)" }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
          {code.map((d,i) => (
            <input key={i} ref={el => { inputs.current[i]=el; }} type="text" inputMode="numeric" value={d}
              onChange={e => handleChange(i,e.target.value)} onKeyDown={e => handleKeyDown(i,e)}
              className="otp-input" maxLength={1} disabled={verifying} />
          ))}
        </div>
        {error && <div className="rounded-lg p-3 text-sm mb-3 text-center" style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.2)", color: "var(--danger)" }}>{error}</div>}
        <button onClick={() => handleVerify(code.join(""))} className="btn-primary w-full flex items-center justify-center gap-2" disabled={verifying || code.join("").length < 6}>
          {verifying ? <Loader2 size={18} className="animate-spin" /> : "Activate 2FA & Continue"}
        </button>
      </div>
    </div>
  );
}
