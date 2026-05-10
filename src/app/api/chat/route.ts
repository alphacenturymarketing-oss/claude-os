import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SKILL_PROMPTS: Record<string, string> = {
  "post-all-portals": "You are an expert real estate assistant specializing in Malaysian property portals. Help the user post property listings across iProperty, EdgeProp, and Propmall. Ask for all property details needed: address, price, bedrooms, bathrooms, sqft, furnishing, description, and photos.",
  "whatsapp-bot": "You are a WhatsApp automation expert. Help set up, configure, or troubleshoot a WhatsApp auto-reply bot. Guide the user through setup steps, message templates, and response logic.",
  "listing-presentation": "You are a real estate marketing expert. Help create polished, professional listing presentations. Ask for property details, agent info, and target audience to generate compelling content.",
  "lead-followup": "You are a real estate sales expert. Help create multi-touch follow-up sequences including emails, call scripts, and text messages for buyer and seller leads. Ask about the lead's context and preferences.",
  "real-estate-marketing": "You are a luxury real estate marketing specialist. Help create stunning marketing materials including one-pagers, social media posts, and ad copy. Ask for property details and target audience.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, personality, mode, skill, user_id } = body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured." }, { status: 500 });
    }

    // Build system prompt
    let systemPrompt = personality || "You are a helpful AI assistant.";

    // Inject skill instructions in PA mode
    if (mode === "pa" && skill && SKILL_PROMPTS[skill]) {
      systemPrompt += "\n\n--- SKILL INSTRUCTIONS ---\n" + SKILL_PROMPTS[skill];
    }

    // Inject user memories if available
    if (user_id) {
      try {
        const { data } = await supabase
          .from("memories")
          .select("key, value")
          .eq("user_id", user_id);
        if (data && data.length > 0) {
          const memoryStr = data.map((m) => `- ${m.key}: ${m.value}`).join("\n");
          systemPrompt += "\n\n--- USER MEMORY (things you remember about this user) ---\n" + memoryStr;
          systemPrompt += "\n\nUse these memories to personalize your responses. If the user tells you to remember something, respond confirming you'll remember it.";
        }
      } catch {}
    }

    const apiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData?.error?.message || "API error: " + response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "No response received.";

    // Auto-detect "remember" commands and save to memory
    if (user_id) {
      const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
      if (lastUserMsg.includes("remember") || lastUserMsg.includes("my name is") || lastUserMsg.includes("i am ") || lastUserMsg.includes("i'm ")) {
        try {
          // Extract a memory key from the message
          const memKey = lastUserMsg.slice(0, 50).replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, "_");
          await supabase.from("memories").upsert({
            user_id,
            key: memKey,
            value: messages[messages.length - 1].content,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,key" });
        } catch {}
      }
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
