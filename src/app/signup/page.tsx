"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const VALID_INVITE_CODES = ["CLAUDEOS2026", "RUMAJIA", "ALPHACENTURY"];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!VALID_INVITE_CODES.includes(inviteCode.trim().toUpperCase())) {
      setError("Invalid invite code. Contact your admin for a valid code.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { setSuccess(true); setLoading(false); }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: "rgba(34,197,94,0.15)" }}>✓</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>You&apos;re in!</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Your account has been created. You can now sign in.</p>
          <a href="/login" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: "var(--accent)" }}>Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4" style={{ background: "var(--accent)", boxShadow: "0 0 40px rgba(124, 92, 252, 0.25)" }}>C</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Create your account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Get started with Claude OS</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted)" }}>Invite Code</label>
            <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="Enter your invite code" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted)" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted)" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="Min 6 characters" />
          </div>
          {error && <p className="text-xs px-1" style={{ color: "var(--error)" }}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90" style={{ background: "var(--accent)" }}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <a href="/login" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
