"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push("/"); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4" style={{ background: "var(--accent)", boxShadow: "0 0 40px rgba(124, 92, 252, 0.25)" }}>C</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Sign in to Claude OS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted)" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted)" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="••••••••" />
          </div>
          {error && <p className="text-xs px-1" style={{ color: "var(--error)" }}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90" style={{ background: "var(--accent)" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: "var(--muted)" }}>
          Don&apos;t have an account?{" "}
          <a href="/signup" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>Sign up</a>
        </p>
      </div>
    </div>
  );
}
