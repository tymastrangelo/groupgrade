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
      return NextResponse.json({ error: "Only the meeting creator can delete this meeting" }, { status: 403 });
    }

    const { error } = await supabase
      .from("group_meetings")
      .delete()
      .eq("id", meetingId);

    if (error) {
      console.error("Supabase error deleting meeting:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/meetings/[id]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
