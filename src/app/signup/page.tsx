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
      setError("Invalid invite code. Please contact your admin for a valid code.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm p-6 rounded-2xl border text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4" style={{ background: "var(--accent)" }}>✓</div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>Check your email</h2>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>We sent a confirmation link to <strong style={{ color: "var(--foreground)" }}>{email}</strong>. Click the link to activate your account.</p>
          <a href="/login" className="text-sm font-medium" style={{ color: "var(--accent)" }}>Go to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm p-6 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: "var(--accent)" }}>C</div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Claude OS</h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Create your account</p>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Invite Code</label>
            <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="Enter your invite code" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="Min 6 characters" />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50" style={{ background: "var(--accent)" }}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-xs text-center mt-4" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <a href="/login" className="font-medium" style={{ color: "var(--accent)" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
