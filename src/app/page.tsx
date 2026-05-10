"use client";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };
type ResultItem = { id: string; label: string; status: "running" | "done" | "error"; detail?: string };

const SKILLS = [
  { id: "post-all-portals", name: "Post to All Portals", description: "Post listing on iProperty, EdgeProp & Propmall" },
  { id: "whatsapp-bot", name: "WhatsApp Auto-Reply", description: "Set up a WhatsApp auto-reply bot" },
  { id: "listing-presentation", name: "Listing Presentation", description: "Create a polished listing presentation" },
  { id: "lead-followup", name: "Lead Follow-Up", description: "Generate lead follow-up sequences" },
  { id: "real-estate-marketing", name: "Marketing Materials", description: "Create property marketing materials" },
];

const MODELS = [
  { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", desc: "Fast & cheap" },
  { id: "claude-sonnet-4-6", name: "Sonnet 4.6", desc: "Balanced" },
  { id: "claude-opus-4-6", name: "Opus 4.6", desc: "Most powerful" },
];

export default function Home() {
  const [mode, setMode] = useState<"chat" | "pa">("chat");
  const [model, setModel] = useState(MODELS[1].id);
  const [personality, setPersonality] = useState("You are a helpful, professional AI assistant.");
  const [showPersonality, setShowPersonality] = useState(false);
  const [projectName, setProjectName] = useState("My Project");
  const [editingProject, setEditingProject] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    function h(e: MouseEvent) { if (showPersonality && !(e.target as HTMLElement).closest("[data-personality]")) setShowPersonality(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPersonality]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    let resultId: string | null = null;
    if (mode === "pa" && selectedSkill) {
      const skill = SKILLS.find((s) => s.id === selectedSkill);
      resultId = Date.now().toString();
      setResults((prev) => [{ id: resultId!, label: skill?.name || "Running...", status: "running" }, ...prev]);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, model, personality, mode, skill: selectedSkill }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error: " + data.error }]);
        if (resultId) setResults((prev) => prev.map((r) => r.id === resultId ? { ...r, status: "error" as const, detail: data.error } : r));
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (resultId) setResults((prev) => prev.map((r) => r.id === resultId ? { ...r, status: "done" as const, detail: "Completed" } : r));
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
      if (resultId) setResults((prev) => prev.map((r) => r.id === resultId ? { ...r, status: "error" as const, detail: "Connection failed" } : r));
    }
    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--background)" }}>
      <header className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--accent)" }}>C</div>
          <span className="font-semibold text-sm hidden sm:inline" style={{ color: "var(--foreground)" }}>Claude OS</span>
        </div>
        <div className="w-px h-6" style={{ background: "var(--border)" }} />
        <div className="relative" data-personality>
          <button onClick={() => setShowPersonality(!showPersonality)} className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" style={{ borderColor: showPersonality ? "var(--accent)" : "var(--border)", background: showPersonality ? "var(--accent-subtle)" : "transparent", color: "var(--foreground)" }}>Personality</button>
          {showPersonality && (
            <div className="absolute top-10 left-0 z-50 w-80 p-3 rounded-xl border shadow-2xl" style={{ background: "var(--surface)", borderColor: "var(--border)" }} data-personality>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>AI Personality</label>
              <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="e.g. You are a friendly Malaysian property agent..." />
              <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>This shapes how the AI talks.</p>
            </div>
          )}
        </div>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setMode("chat")} className="px-3 py-1.5 text-xs font-medium transition-all" style={{ background: mode === "chat" ? "var(--accent)" : "transparent", color: mode === "chat" ? "#fff" : "var(--muted)" }}>Chat</button>
          <button onClick={() => setMode("pa")} className="px-3 py-1.5 text-xs font-medium transition-all" style={{ background: mode === "pa" ? "var(--accent)" : "transparent", color: mode === "pa" ? "#fff" : "var(--muted)" }}>PA</button>
        </div>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="px-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none cursor-pointer" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
          {MODELS.map((m) => (<option key={m.id} value={m.id}>{m.name} — {m.desc}</option>))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--muted)" }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          {editingProject ? (
            <input autoFocus value={projectName} onChange={(e) => setProjectName(e.target.value)} onBlur={() => setEditingProject(false)} onKeyDown={(e) => e.key === "Enter" && setEditingProject(false)} className="px-2 py-1 rounded border text-xs focus:outline-none" style={{ background: "var(--background)", borderColor: "var(--accent)", color: "var(--foreground)", width: 140 }} />
          ) : (
            <button onClick={() => setEditingProject(true)} className="text-xs font-medium hover:opacity-80" style={{ color: "var(--foreground)" }}>{projectName}</button>
          )}
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {mode === "pa" && (
          <aside className="w-56 border-r overflow-y-auto p-3 flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>Skills</h3>
            {SKILLS.map((skill) => (
              <button key={skill.id} onClick={() => setSelectedSkill(selectedSkill === skill.id ? null : skill.id)} className="w-full text-left px-3 py-2.5 rounded-lg mb-1.5 transition-all" style={{ background: selectedSkill === skill.id ? "var(--accent-subtle)" : "transparent", borderLeft: selectedSkill === skill.id ? "2px solid var(--accent)" : "2px solid transparent" }}>
                <div className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{skill.name}</div>
                <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>{skill.description}</div>
              </button>
            ))}
          </aside>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4" style={{ background: "var(--accent)" }}>C</div>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{mode === "chat" ? "Start a conversation" : "Select a skill and describe your task"}</p>
                  <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>{mode === "chat" ? "Type a message below to chat with Claude." : "Pick a skill from the sidebar, then tell me what to do."}</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed" style={{ background: msg.role === "user" ? "var(--accent)" : "var(--surface)", color: msg.role === "user" ? "#fff" : "var(--foreground)", borderBottomRightRadius: msg.role === "user" ? 4 : undefined, borderBottomLeftRadius: msg.role === "assistant" ? 4 : undefined }}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 text-sm flex gap-1" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
            {mode === "pa" && selectedSkill && (
              <div className="text-xs mb-2 px-3 py-1.5 rounded-lg inline-block" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                Skill: {SKILLS.find((s) => s.id === selectedSkill)?.name}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} rows={1} placeholder={mode === "chat" ? "Type a message..." : "Describe what you need done..."} className="flex-1 rounded-xl border px-4 py-2.5 text-sm resize-none focus:outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)", maxHeight: 120 }} />
              <button onClick={handleSend} disabled={loading || !input.trim()} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-40" style={{ background: "var(--accent)" }}>Send</button>
            </div>
          </div>
        </div>
        <aside className="w-72 border-l overflow-y-auto p-3 flex-shrink-0 hidden lg:block" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>Results</h3>
          {results.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs" style={{ color: "var(--muted)" }}>No results yet.</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Outputs from tasks will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.id} className="rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{r.status === "running" && "⏳"}{r.status === "done" && "✅"}{r.status === "error" && "❌"}</span>
                    <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{r.label}</span>
                  </div>
                  {r.detail && <p className="text-xs mt-1 ml-6" style={{ color: "var(--muted)" }}>{r.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
