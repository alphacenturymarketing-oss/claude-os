"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };
type ChatSession = { id: string; title: string; messages: Message[]; scope: string; updatedAt: number };
type Memory = { key: string; value: string };

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
  const [user, setUser] = useState<{ id?: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  // Current scope: "chat" or skill id
  const currentScope = mode === "pa" && selectedSkill ? selectedSkill : "chat";

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else {
        setUser({ id: data.user.id, email: data.user.email });
        setAuthLoading(false);
      }
    });
  }, [router]);

  // Load sessions for current scope
  const loadSessions = useCallback(() => {
    const saved = localStorage.getItem(`cos-sessions-${currentScope}`);
    if (saved) {
      try { setSessions(JSON.parse(saved)); } catch { setSessions([]); }
    } else { setSessions([]); }
  }, [currentScope]);

  useEffect(() => {
    loadSessions();
    setMessages([]);
    setActiveSessionId(null);
  }, [currentScope, loadSessions]);

  // Save sessions when they change
  useEffect(() => {
    localStorage.setItem(`cos-sessions-${currentScope}`, JSON.stringify(sessions));
  }, [sessions, currentScope]);

  // Load memories
  useEffect(() => {
    const saved = localStorage.getItem("cos-memories");
    if (saved) {
      try { setMemories(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cos-memories", JSON.stringify(memories));
  }, [memories]);

  // Auto-scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Close popups on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (showPersonality && !t.closest("[data-personality]")) setShowPersonality(false);
      if (showMemory && !t.closest("[data-memory]")) setShowMemory(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPersonality, showMemory]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  function genTitle(msg: string) { return msg.length > 40 ? msg.slice(0, 40) + "..." : msg; }

  function startNewChat() {
    setMessages([]);
    setActiveSessionId(null);
  }

  function saveSession(msgs: Message[]) {
    if (msgs.length === 0) return;
    const id = activeSessionId || crypto.randomUUID();
    const title = genTitle(msgs[0].content);
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const session: ChatSession = { id, title, messages: msgs, scope: currentScope, updatedAt: Date.now() };
      if (idx >= 0) { const u = [...prev]; u[idx] = session; return u; }
      return [session, ...prev];
    });
    if (!activeSessionId) setActiveSessionId(id);
  }

  function loadSession(s: ChatSession) {
    setMessages(s.messages);
    setActiveSessionId(s.id);
    setSidebarOpen(false);
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) { setMessages([]); setActiveSessionId(null); }
  }

  function handleSkillClick(skillId: string) {
    // Save current session before switching
    if (messages.length > 0) saveSession(messages);
    setSelectedSkill(skillId);
    // Messages/sessions will reload via the currentScope effect
  }

  function addMemory(key: string, value: string) {
    setMemories((prev) => {
      const idx = prev.findIndex((m) => m.key === key);
      if (idx >= 0) { const u = [...prev]; u[idx] = { key, value }; return u; }
      return [...prev, { key, value }];
    });
  }

  function removeMemory(key: string) {
    setMemories((prev) => prev.filter((m) => m.key !== key));
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Build memory string for system prompt
    const memoryStr = memories.length > 0
      ? "\n\n--- USER MEMORY ---\n" + memories.map((m) => `- ${m.key}: ${m.value}`).join("\n") + "\n\nUse these memories to personalize responses. If the user says 'remember [something]', confirm you'll remember it."
      : "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          model,
          personality: personality + memoryStr,
          mode,
          skill: selectedSkill,
          user_id: user?.id,
        }),
      });
      const data = await res.json();
      const reply: Message = {
        role: "assistant",
        content: data.error ? "Error: " + data.error : data.reply,
      };
      const finalMessages = [...newMessages, reply];
      setMessages(finalMessages);
      saveSession(finalMessages);

      // Auto-detect "remember" in user message
      const lower = text.toLowerCase();
      if (lower.startsWith("remember ") || lower.includes("remember that ") || lower.includes("my name is ") || lower.includes("i prefer ")) {
        const memKey = text.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, "").trim();
        addMemory(memKey, text);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const SpeechRecognition = SpeechRecognitionAPI as SpeechRecognitionConstructor | undefined;
    if (!SpeechRecognition) { alert("Voice input is not supported in this browser."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    let finalTranscript = input;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) { finalTranscript += (finalTranscript ? " " : "") + t; }
        else { interim += t; }
      }
      setInput(finalTranscript + (interim ? " " + interim : ""));
    };
    recognition.onerror = () => { setIsListening(false); };
    recognition.onend = () => { setIsListening(false); };
    recognition.start();
    setIsListening(true);
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

  const scopeLabel = currentScope === "chat" ? "Chat" : SKILLS.find((s) => s.id === currentScope)?.name || "Chat";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* ===== LEFT SIDEBAR ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-transform duration-200 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: 270, background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--accent)" }}>C</div>
            <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Claude OS</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded" style={{ color: "var(--muted)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* New Chat */}
        <div className="p-3">
          <button onClick={startNewChat} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border hover:border-[var(--accent)] transition-all" style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--background)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {/* Mode: Chat */}
          <button onClick={() => { if (messages.length > 0) saveSession(messages); setMode("chat"); setSelectedSkill(null); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all" style={{ background: currentScope === "chat" ? "var(--accent-subtle)" : "transparent" }}>
            <span className="text-sm">💭</span>
            <span className="text-xs font-medium" style={{ color: currentScope === "chat" ? "var(--accent)" : "var(--foreground)" }}>General Chat</span>
          </button>

          {/* Skills Section */}
          <div className="text-xs font-medium uppercase tracking-wider mt-4 mb-2 px-1" style={{ color: "var(--muted)" }}>Skills</div>
          {SKILLS.map((skill) => {
            const isActive = currentScope === skill.id;
            // Count sessions for this skill
            const count = (() => { try { const s = localStorage.getItem(`cos-sessions-${skill.id}`); return s ? JSON.parse(s).length : 0; } catch { return 0; } })();
            return (
              <button key={skill.id} onClick={() => { setMode("pa"); handleSkillClick(skill.id); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 transition-all hover:bg-white/5" style={{ background: isActive ? "var(--accent-subtle)" : "transparent" }}>
                <span className="text-sm">{skill.icon}</span>
                <span className="text-xs font-medium flex-1 text-left" style={{ color: isActive ? "var(--accent)" : "var(--foreground)" }}>{skill.name}</span>
                {count > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--border)", color: "var(--muted)" }}>{count}</span>}
              </button>
            );
          })}

          {/* Session History for current scope */}
          {sessions.length > 0 && (
            <>
              <div className="text-xs font-medium uppercase tracking-wider mt-5 mb-2 px-1" style={{ color: "var(--muted)" }}>
                {scopeLabel} History
              </div>
              {sessions.map((s) => (
                <div key={s.id} className="group flex items-center rounded-lg mb-0.5 cursor-pointer transition-all" style={{ background: activeSessionId === s.id ? "var(--accent-subtle)" : "transparent" }}>
                  <button onClick={() => loadSession(s)} className="flex-1 text-left px-3 py-1.5 text-xs truncate" style={{ color: activeSessionId === s.id ? "var(--accent)" : "var(--foreground)" }}>
                    {s.title}
                  </button>
                  <button onClick={() => deleteSession(s.id)} className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded hover:bg-red-500/20 transition-all" style={{ color: "var(--muted)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* User Footer */}
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <p className="text-xs truncate flex-1" style={{ color: "var(--foreground)" }}>{user?.email}</p>
            <button onClick={() => setShowMemory(!showMemory)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "var(--muted)" }} title="Memory" data-memory>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 16v-4M12 8h.01"/></svg>
            </button>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "var(--muted)" }} title="Logout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Memory Popup */}
      {showMemory && (
        <div className="fixed bottom-16 left-4 z-50 w-80 max-h-96 rounded-xl border shadow-2xl overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }} data-memory>
          <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Memory</h3>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{memories.length} items</span>
          </div>
          <div className="p-3 overflow-y-auto max-h-72">
            {memories.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--muted)" }}>No memories yet. Say &quot;remember [something]&quot; in chat to save.</p>
            ) : (
              memories.map((m) => (
                <div key={m.key} className="flex items-start gap-2 mb-2 p-2 rounded-lg" style={{ background: "var(--background)" }}>
                  <p className="text-xs flex-1" style={{ color: "var(--foreground)" }}>{m.value}</p>
                  <button onClick={() => removeMemory(m.key)} className="text-xs p-1 rounded hover:bg-red-500/20 flex-shrink-0" style={{ color: "var(--muted)" }}>×</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-2 px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-white/5" style={{ color: "var(--muted)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>

          {/* Chat / PA Mode Toggle */}
          <div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
            <button onClick={() => { if (messages.length > 0) saveSession(messages); setMode("chat"); setSelectedSkill(null); }} className="px-3 py-1.5 rounded-md text-xs font-medium transition-all" style={{ background: mode === "chat" ? "var(--accent)" : "transparent", color: mode === "chat" ? "#fff" : "var(--muted)" }}>
              Chat
            </button>
            <button onClick={() => { setMode("pa"); if (!selectedSkill) setSelectedSkill(SKILLS[0].id); }} className="px-3 py-1.5 rounded-md text-xs font-medium transition-all" style={{ background: mode === "pa" ? "var(--accent)" : "transparent", color: mode === "pa" ? "#fff" : "var(--muted)" }}>
              PA
            </button>
          </div>

          {/* Current scope indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
            {currentScope === "chat" ? "💭" : SKILLS.find((s) => s.id === currentScope)?.icon}
            <span>{scopeLabel}</span>
          </div>

          {/* Model */}
          <select value={model} onChange={(e) => setModel(e.target.value)} className="px-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none cursor-pointer" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
            {MODELS.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>

          {/* Personality */}
          <div className="relative" data-personality>
            <button onClick={() => setShowPersonality(!showPersonality)} className="p-2 rounded-lg border hover:border-[var(--accent)] transition-all" style={{ borderColor: showPersonality ? "var(--accent)" : "var(--border)", background: showPersonality ? "var(--accent-subtle)" : "transparent" }} title="Personality">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: showPersonality ? "var(--accent)" : "var(--muted)" }}><path d="M12 2a10 10 0 110 20 10 10 0 010-20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
            </button>
            {showPersonality && (
              <div className="absolute top-11 left-0 z-50 w-80 p-3 rounded-xl border shadow-2xl" style={{ background: "var(--surface)", borderColor: "var(--border)" }} data-personality>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>AI Personality</label>
                <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="e.g. You are a friendly Malaysian property agent..." />
              </div>
            )}
          </div>

          {/* Memory count badge */}
          {memories.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
              {memories.length} memories
            </div>
          )}
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-5" style={{ background: "var(--accent)", boxShadow: "0 0 40px var(--accent-glow)" }}>C</div>
                <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                  {currentScope === "chat" ? "How can I help you?" : `${scopeLabel}`}
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {currentScope === "chat"
                    ? "Start a conversation with Claude AI."
                    : SKILLS.find((s) => s.id === currentScope)?.description}
                </p>
                {currentScope === "chat" && (
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

        {/* Input */}
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end rounded-xl border p-1.5" style={{ background: "var(--surface)", borderColor: isListening ? "var(--accent)" : "var(--border)", boxShadow: isListening ? "0 0 0 2px var(--accent-glow)" : "none" }}>
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} rows={1} placeholder={isListening ? "Listening..." : currentScope === "chat" ? "Message Claude..." : `Message ${scopeLabel}...`} className="flex-1 bg-transparent px-3 py-2 text-sm resize-none focus:outline-none" style={{ color: "var(--foreground)", maxHeight: 150 }} />
              <button onClick={toggleVoice} className={`p-2.5 rounded-lg transition-all ${isListening ? "animate-pulse" : "hover:bg-white/5"}`} style={{ color: isListening ? "var(--accent)" : "var(--muted)" }} title={isListening ? "Stop listening" : "Voice input"}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
              </button>
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
  );
}
