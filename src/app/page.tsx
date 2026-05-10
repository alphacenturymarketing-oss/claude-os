"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };
type ChatSession = { id: string; title: string; messages: Message[]; createdAt: number };

const SKILLS = [
  { id: "post-all-portals", name: "Post to All Portals", icon: "🏠", description: "Post listing on iProperty, EdgeProp & Propmall" },
  { id: "whatsapp-bot", name: "WhatsApp Auto-Reply", icon: "💬", description: "Set up a WhatsApp auto-reply bot" },
  { id: "listing-presentation", name: "Listing Presentation", icon: "📊", description: "Create a polished listing presentation" },
  { id: "lead-followup", name: "Lead Follow-Up", icon: "📧", description: "Generate lead follow-up sequences" },
  { id: "real-estate-marketing", name: "Marketing Materials", icon: "✨", description: "Create property marketing materials" },
];

const MODELS = [
  { id: "claude-haiku-4-5-20251001", name: "Fast" },
  { id: "claude-sonnet-4-6", name: "Balanced" },
  { id: "claude-opus-4-6", name: "Power" },
];

export default function Home() {
  const [mode, setMode] = useState<"chat" | "pa">("chat");
  const [model, setModel] = useState(MODELS[1].id);
  const [personality, setPersonality] = useState("You are a helpful, professional AI assistant.");
  const [showPersonality, setShowPersonality] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else { setUser({ email: data.user.email }); setAuthLoading(false); }
    });
  }, [router]);

  // Auto-scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Close personality popup
  useEffect(() => {
    function h(e: MouseEvent) { if (showPersonality && !(e.target as HTMLElement).closest("[data-personality]")) setShowPersonality(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPersonality]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  // Load chat sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("claude-os-sessions");
    if (saved) {
      try { setChatSessions(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Save sessions
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem("claude-os-sessions", JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  function generateTitle(msg: string) {
    return msg.length > 40 ? msg.slice(0, 40) + "..." : msg;
  }

  function startNewChat() {
    setMessages([]);
    setActiveChatId(null);
    setSelectedSkill(null);
  }

  function saveCurrentChat(msgs: Message[]) {
    if (msgs.length === 0) return;
    const id = activeChatId || Date.now().toString();
    const title = generateTitle(msgs[0].content);
    setChatSessions((prev) => {
      const existing = prev.findIndex((s) => s.id === id);
      const session: ChatSession = { id, title, messages: msgs, createdAt: existing >= 0 ? prev[existing].createdAt : Date.now() };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = session;
        return updated;
      }
      return [session, ...prev];
    });
    if (!activeChatId) setActiveChatId(id);
  }

  function loadChat(session: ChatSession) {
    setMessages(session.messages);
    setActiveChatId(session.id);
    setSidebarOpen(false);
  }

  function deleteChat(id: string) {
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeChatId === id) { setMessages([]); setActiveChatId(null); }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, model, personality, mode, skill: selectedSkill }),
      });
      const data = await res.json();
      const reply: Message = { role: "assistant", content: data.error ? "Error: " + data.error : data.reply };
      const finalMessages = [...newMessages, reply];
      setMessages(finalMessages);
      saveCurrentChat(finalMessages);
    } catch {
      const errMessages = [...newMessages, { role: "assistant" as const, content: "Connection error. Please try again." }];
      setMessages(errMessages);
    }
    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold animate-pulse" style={{ background: "var(--accent)" }}>C</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* Sidebar - Chat History */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-transform duration-200 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: 260, background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--accent)" }}>C</div>
            <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Claude OS</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded" style={{ color: "var(--muted)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button onClick={startNewChat} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--background)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New Chat
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="text-xs font-medium uppercase tracking-wider mb-2 px-1" style={{ color: "var(--muted)" }}>Recent</div>
          {chatSessions.length === 0 ? (
            <p className="text-xs px-1" style={{ color: "var(--muted)" }}>No conversations yet.</p>
          ) : (
            chatSessions.map((session) => (
              <div key={session.id} className="group flex items-center rounded-lg mb-0.5 cursor-pointer transition-all" style={{ background: activeChatId === session.id ? "var(--accent-subtle)" : "transparent" }}>
                <button onClick={() => loadChat(session)} className="flex-1 text-left px-3 py-2 text-xs truncate" style={{ color: activeChatId === session.id ? "var(--accent)" : "var(--foreground)" }}>
                  {session.title}
                </button>
                <button onClick={() => deleteChat(session.id)} className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded hover:bg-red-500/20 transition-all" style={{ color: "var(--muted)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* User Info */}
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: "var(--foreground)" }}>{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "var(--muted)" }} title="Logout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-2 px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-white/5" style={{ color: "var(--muted)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>

          {/* Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => setMode("chat")} className="px-3 py-1.5 text-xs font-medium" style={{ background: mode === "chat" ? "var(--accent)" : "transparent", color: mode === "chat" ? "#fff" : "var(--muted)" }}>Chat</button>
            <button onClick={() => setMode("pa")} className="px-3 py-1.5 text-xs font-medium" style={{ background: mode === "pa" ? "var(--accent)" : "transparent", color: mode === "pa" ? "#fff" : "var(--muted)" }}>PA</button>
          </div>

          {/* Model Selector */}
          <select value={model} onChange={(e) => setModel(e.target.value)} className="px-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none cursor-pointer" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
            {MODELS.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>

          {/* Personality */}
          <div className="relative" data-personality>
            <button onClick={() => setShowPersonality(!showPersonality)} className="p-2 rounded-lg border hover:border-[var(--accent)] transition-all" style={{ borderColor: showPersonality ? "var(--accent)" : "var(--border)", background: showPersonality ? "var(--accent-subtle)" : "transparent" }} title="AI Personality">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: showPersonality ? "var(--accent)" : "var(--muted)" }}><path d="M12 2a10 10 0 110 20 10 10 0 010-20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
            </button>
            {showPersonality && (
              <div className="absolute top-11 left-0 z-50 w-80 p-3 rounded-xl border shadow-2xl" style={{ background: "var(--surface)", borderColor: "var(--border)" }} data-personality>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>AI Personality</label>
                <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="e.g. You are a friendly Malaysian property agent..." />
                <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>This shapes how the AI talks.</p>
              </div>
            )}
          </div>

          {/* Skill indicator */}
          {mode === "pa" && selectedSkill && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              <span>{SKILLS.find((s) => s.id === selectedSkill)?.icon}</span>
              {SKILLS.find((s) => s.id === selectedSkill)?.name}
              <button onClick={() => setSelectedSkill(null)} className="ml-0.5 hover:opacity-70">×</button>
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Skills Panel (PA mode) */}
          {mode === "pa" && (
            <div className="w-56 border-r overflow-y-auto p-3 flex-shrink-0 hidden sm:block" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider px-1" style={{ color: "var(--muted)" }}>Skills</h3>
              {SKILLS.map((skill) => (
                <button key={skill.id} onClick={() => setSelectedSkill(selectedSkill === skill.id ? null : skill.id)} className="w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all hover:bg-white/5" style={{ background: selectedSkill === skill.id ? "var(--accent-subtle)" : "transparent", borderLeft: selectedSkill === skill.id ? "2px solid var(--accent)" : "2px solid transparent" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{skill.icon}</span>
                    <span className="text-xs font-medium" style={{ color: selectedSkill === skill.id ? "var(--accent)" : "var(--foreground)" }}>{skill.name}</span>
                  </div>
                  <div className="text-xs mt-0.5 ml-6 leading-relaxed" style={{ color: "var(--muted)" }}>{skill.description}</div>
                </button>
              ))}
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-5" style={{ background: "var(--accent)", boxShadow: "0 0 40px var(--accent-glow)" }}>C</div>
                    <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                      {mode === "chat" ? "How can I help you?" : "What task should I handle?"}
                    </h1>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                      {mode === "chat" ? "Start a conversation with Claude AI." : "Select a skill from the sidebar, then describe your task."}
                    </p>
                    {mode === "chat" && (
                      <div className="flex flex-wrap gap-2 justify-center mt-6">
                        {["Help me write a listing", "Draft a follow-up email", "Explain market trends"].map((q) => (
                          <button key={q} onClick={() => setInput(q)} className="px-3 py-2 rounded-lg border text-xs hover:border-[var(--accent)] transition-all" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface)" }}>{q}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold mr-2.5 mt-0.5 flex-shrink-0" style={{ background: "var(--accent)" }}>C</div>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"}`} style={{ background: msg.role === "user" ? "var(--accent)" : "var(--ai-bubble)", color: msg.role === "user" ? "#fff" : "var(--foreground)", border: msg.role === "assistant" ? "1px solid var(--border)" : "none" }}>
                        {msg.role === "assistant" ? (
                          <div className="markdown-body"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold mr-2.5 mt-0.5 flex-shrink-0" style={{ background: "var(--accent)" }}>C</div>
                      <div className="rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5" style={{ background: "var(--ai-bubble)", border: "1px solid var(--border)" }}>
                        <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--muted)" }} />
                        <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--muted)" }} />
                        <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--muted)" }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="max-w-3xl mx-auto">
                {mode === "pa" && selectedSkill && (
                  <div className="sm:hidden text-xs mb-2 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                    <span>{SKILLS.find((s) => s.id === selectedSkill)?.icon}</span>
                    {SKILLS.find((s) => s.id === selectedSkill)?.name}
                  </div>
                )}
                <div className="flex gap-2 items-end rounded-xl border p-1.5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} rows={1} placeholder={mode === "chat" ? "Message Claude..." : "Describe your task..."} className="flex-1 bg-transparent px-3 py-2 text-sm resize-none focus:outline-none" style={{ color: "var(--foreground)", maxHeight: 150 }} />
                  <button onClick={handleSend} disabled={loading || !input.trim()} className="p-2.5 rounded-lg text-white transition-all disabled:opacity-30" style={{ background: "var(--accent)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
                  </button>
                </div>
                <p className="text-center text-xs mt-2" style={{ color: "var(--muted)" }}>
                  Claude OS · {MODELS.find((m) => m.id === model)?.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
