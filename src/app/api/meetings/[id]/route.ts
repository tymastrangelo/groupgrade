import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const meetingId = params.id;

    // Get user ID from email
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch meeting to check creator
    const { data: meeting, error: fetchError } = await supabase
      .from("group_meetings")
      .select("created_by")
      .eq("id", meetingId)
      .single();

    if (fetchError || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check if user is the creator
    if (meeting.created_by !== userData.id) {
      return NextResponse.json({ error: "Only the meeting creator can cancel this meeting" }, { status: 403 });
    }

    // Mark meeting as cancelled instead of deleting
    const { error: updateError } = await supabase
      .from("group_meetings")
      .update({ status: "cancelled" })
      .eq("id", meetingId);

    if (updateError) {
      console.error("Supabase error cancelling meeting:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/meetings/[id]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const meetingId = params.id;

    const { data: meeting, error } = await supabase
      .from("group_meetings")
      .select("*, groups(project_id)")
      .eq("id", meetingId)
      .single();

    if (error || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Fetch summaries
    const { data: summaries } = await supabase
      .from("meeting_summaries")
      .select("id, user_id, notes, attended, created_at, users(name, avatar_url, email)")
      .eq("meeting_id", meetingId);

    const meetingWithProject = meeting
      ? { ...meeting, project_id: meeting.groups?.project_id || null }
      : meeting;

    return NextResponse.json({ meeting: meetingWithProject, summaries: summaries || [] });
  } catch (err: any) {
    console.error("Error in GET /api/meetings/[id]:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const meetingId = params.id;
    const body = await request.json();
    const { meetingUrl, location, title, date, time, lengthMinutes } = body;

    // Get user id
    const { data: userData } = await supabase.from("users").select("id").eq("email", session.user.email).single();
    if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data: meeting } = await supabase.from("group_meetings").select("*").eq("id", meetingId).single();
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    // Only creator can edit and only if meeting hasn't occurred yet
    if (meeting.created_by !== userData.id) return NextResponse.json({ error: "Only the creator can edit this meeting" }, { status: 403 });

    const meetingStart = new Date(`${meeting.date}T${meeting.time}`);
    const length = meeting.length_minutes || 60;
    const meetingEnd = new Date(meetingStart.getTime() + length * 60000);
    const now = new Date();
    if (meetingEnd.getTime() <= now.getTime()) {
      return NextResponse.json({ error: "Cannot edit a meeting that has already occurred" }, { status: 400 });
    }

    const update: any = {};
    if (meetingUrl !== undefined && meeting.type === "virtual") update.meeting_url = meetingUrl;
    if (location !== undefined && meeting.type === "in-person") update.location = location;
    if (title !== undefined) update.title = title;
    if (date !== undefined) update.date = date;
    if (time !== undefined) update.time = time;
    if (lengthMinutes !== undefined) update.length_minutes = lengthMinutes;

    const { error } = await supabase.from("group_meetings").update(update).eq("id", meetingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in PATCH /api/meetings/[id]:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
