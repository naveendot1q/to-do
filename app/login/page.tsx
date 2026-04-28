"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
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
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(232,197,71,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(232,197,71,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div className="glass rounded-2xl p-8 w-full max-w-md animate-slide-up" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ background: "rgba(232,197,71,0.1)", border: "1px solid rgba(232,197,71,0.2)" }}>
            <span style={{ fontSize: "1.5rem" }}>✦</span>
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display',serif", color: "#fff" }}>Welcome back</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Your private workspace awaits</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--muted)" }}>Email address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" style={{ paddingLeft: "2.5rem" }} placeholder="you@example.com" required autoComplete="email" />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--muted)" }}>Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" style={{ paddingLeft: "2.5rem" }} placeholder="••••••••" required autoComplete="current-password" />
            </div>
          </div>
          {error && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.2)", color: "var(--danger)" }}>{error}</div>}
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <> Continue <ArrowRight size={18} /> </>}
          </button>
        </form>
        <p className="text-center text-xs mt-6" style={{ color: "var(--muted)" }}>🔐 Protected by Microsoft Authenticator (TOTP)</p>
      </div>
    </div>
  );
}
