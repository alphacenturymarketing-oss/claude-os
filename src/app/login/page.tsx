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
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm p-6 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: "var(--accent)" }}>C</div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Claude OS</h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="••••••••" />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50" style={{ background: "var(--accent)" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-center mt-4" style={{ color: "var(--muted)" }}>
          Don&apos;t have an account?{" "}
          <a href="/signup" className="font-medium" style={{ color: "var(--accent)" }}>Sign up</a>
        </p>
      </div>
    </div>
  );
}
