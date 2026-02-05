import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const meetingId = params.id;
    const body = await request.json();
    const { notes, attended } = body;

    // Get user id
    const { data: userData } = await supabase.from("users").select("id").eq("email", session.user.email).single();
    if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Upsert summary (one per user per meeting)
    const existing = await supabase
      .from("meeting_summaries")
      .select("id")
      .eq("meeting_id", meetingId)
      .eq("user_id", userData.id)
      .single();

    if (existing.data) {
      const { error } = await supabase
        .from("meeting_summaries")
        .update({ notes: notes || null, attended: attended === false ? false : true })
        .eq("id", existing.data.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase
        .from("meeting_summaries")
        .insert({ meeting_id: meetingId, user_id: userData.id, notes: notes || null, attended: attended === false ? false : true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If attended true, increment meetings_attended for the member row
    if (attended !== false) {
      // find meeting's group_id
      const { data: meeting } = await supabase.from("group_meetings").select("group_id").eq("id", meetingId).single();
      if (meeting && meeting.group_id) {
        await supabase
          .from("group_members")
          .update({ meetings_attended: (supabase.rpc ? null : undefined) })
          .eq("group_id", meeting.group_id)
          .eq("user_id", userData.id);
        // Note: cannot reliably increment without RPC; do a select+update instead
        const { data: gm } = await supabase.from("group_members").select("meetings_attended").eq("group_id", meeting.group_id).eq("user_id", userData.id).single();
        if (gm) {
          const newCount = (gm.meetings_attended || 0) + 1;
          await supabase.from("group_members").update({ meetings_attended: newCount }).eq("group_id", meeting.group_id).eq("user_id", userData.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in POST /api/meetings/[id]/summary:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
