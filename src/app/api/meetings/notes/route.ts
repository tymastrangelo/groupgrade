import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    const { data: meetings, error: meetingsError } = await supabase
      .from("group_meetings")
      .select("id, date, time, length_minutes, status")
      .eq("group_id", groupId);

    if (meetingsError) {
      return NextResponse.json({ error: meetingsError.message }, { status: 500 });
    }

    const now = new Date();
    const pastMeetingIds = (meetings || [])
      .filter((m: any) => {
        if (m.status === "concluded") return true;
        const lengthMinutes = m.length_minutes || 60;
        const meetingDateTime = new Date(`${m.date}T${m.time}`);
        const meetingEnd = new Date(meetingDateTime.getTime() + lengthMinutes * 60000);
        return meetingEnd.getTime() < now.getTime();
      })
      .map((m: any) => m.id);

    if (pastMeetingIds.length === 0) {
      return NextResponse.json({ counts: {}, total: 0 });
    }

    const { data: summaries, error: summariesError } = await supabase
      .from("meeting_summaries")
      .select("user_id, meeting_id")
      .in("meeting_id", pastMeetingIds);

    if (summariesError) {
      return NextResponse.json({ error: summariesError.message }, { status: 500 });
    }

    const counts = (summaries || []).reduce((acc: Record<string, number>, s: any) => {
      if (!s.user_id) return acc;
      acc[s.user_id] = (acc[s.user_id] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ counts, total: pastMeetingIds.length });
  } catch (error: any) {
    console.error("Error in GET /api/meetings/notes:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
