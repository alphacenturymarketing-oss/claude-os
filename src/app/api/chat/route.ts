import { NextRequest, NextResponse } from "next/server";

const SKILL_PROMPTS: Record<string, string> = {
  "post-all-portals": "You are an expert real estate assistant. Help the user post property listings across all Malaysian portals (iProperty, EdgeProp, Propmall). Ask for property details needed.",
  "whatsapp-bot": "You are a WhatsApp automation expert. Help set up or configure a WhatsApp auto-reply bot.",
  "listing-presentation": "You are a real estate marketing expert. Help create a polished listing presentation.",
  "lead-followup": "You are a real estate sales expert. Help create follow-up email sequences for leads.",
  "real-estate-marketing": "You are a luxury real estate marketing specialist. Help create stunning marketing materials.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, personality, mode, skill } = body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured. Add ANTHROPIC_API_KEY to your .env.local file." }, { status: 500 });
    }
    let systemPrompt = personality || "You are a helpful AI assistant.";
    if (mode === "pa" && skill && SKILL_PROMPTS[skill]) {
      systemPrompt += "\n\n--- SKILL INSTRUCTIONS ---\n" + SKILL_PROMPTS[skill];
    }
    const apiMessages = messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: model || "claude-sonnet-4-6", max_tokens: 4096, system: systemPrompt, messages: apiMessages }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData?.error?.message || "API error: " + response.status }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json({ reply: data.content?.[0]?.text || "No response received." });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
