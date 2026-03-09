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
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const deliverableId = params.id;

    // Get user ID
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get deliverable to verify ownership
    const { data: deliverable } = await supabase
      .from("deliverables")
      .select("assigned_to, group_id, project_id")
      .eq("id", deliverableId)
      .single();

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    if (deliverable.assigned_to !== userData.id) {
      return NextResponse.json({ error: "Not authorized to modify this deliverable" }, { status: 403 });
    }

    // Delete all files associated with this deliverable
    const { data: files } = await supabase
      .from("deliverable_files")
      .select("id")
      .eq("deliverable_id", deliverableId);

    if (files && files.length > 0) {
      await supabase
        .from("deliverable_files")
        .delete()
        .eq("deliverable_id", deliverableId);
    }

    // Reset deliverable to in-progress status and clear submission data
    const { error: updateError } = await supabase
      .from("deliverables")
      .update({
        status: "in-progress",
        submission_url: null,
        submission_notes: null,
        submitted_at: null,
      })
      .eq("id", deliverableId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity - get the deliverable title first
    const { data: deliverableData } = await supabase
      .from("deliverables")
      .select("title")
      .eq("id", deliverableId)
      .single();

    try {
      await supabase.from("activity_logs").insert({
        group_id: deliverable.group_id,
        project_id: deliverable.project_id,
        user_id: userData.id,
        action_type: "deliverable_updated",
        entity_id: deliverableId,
        entity_title: deliverableData?.title || "Deliverable",
      });
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing submission:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
