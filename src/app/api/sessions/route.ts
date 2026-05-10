import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/sessions?user_id=xxx&scope=chat|skill_id
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  const scope = req.nextUrl.searchParams.get("scope") || "chat";
  if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("scope", scope)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data || [] });
}

// POST /api/sessions { user_id, scope, session_id?, title, messages }
export async function POST(req: NextRequest) {
  const { user_id, scope, session_id, title, messages } = await req.json();
  if (!user_id || !scope) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const id = session_id || crypto.randomUUID();
  const { data, error } = await supabase
    .from("chat_sessions")
    .upsert({
      id,
      user_id,
      scope,
      title: title || "New conversation",
      messages: JSON.stringify(messages || []),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data?.[0] });
}

// DELETE /api/sessions { session_id }
export async function DELETE(req: NextRequest) {
  const { session_id } = await req.json();
  if (!session_id) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", session_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
