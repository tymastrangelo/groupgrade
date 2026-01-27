import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function PATCH(
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
    const body = await request.json();
    const { status, assignedTo, description, dueDate, submissionUrl, submissionNotes, submittedAt } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (assignedTo) updateData.assigned_to = assignedTo;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (submissionUrl !== undefined) updateData.submission_url = submissionUrl || null;
    if (submissionNotes !== undefined) updateData.submission_notes = submissionNotes || null;
    if (submittedAt !== undefined) updateData.submitted_at = submittedAt || null;

    const { data, error } = await supabase
      .from("deliverables")
      .update(updateData)
      .eq("id", deliverableId)
      .select("*")
      .single();

    if (error) {
      console.error("Supabase error updating deliverable:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Manually fetch user data if assigned
    let assignedUser = null;
    if (data.assigned_to) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .eq("id", data.assigned_to)
        .single();
      
      if (!userError && userData) {
        assignedUser = userData;
      }
    }

    // Transform to match frontend expectations
    const transformed = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      dueDate: data.due_date,
      assignedTo: assignedUser,
      groupId: data.group_id,
      projectId: data.project_id,
      createdAt: data.created_at,
      submissionUrl: data.submission_url,
      submissionNotes: data.submission_notes,
      submittedAt: data.submitted_at
    };

    // Log activity if status changed to submitted
    if (status === "submitted") {
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", session.user.email)
          .single();
        
        if (userData) {
          await supabase.from("activity_logs").insert({
            group_id: data.group_id,
            project_id: data.project_id,
            user_id: userData.id,
            action_type: "deliverable_submitted",
            entity_id: data.id,
            entity_title: data.title
          });
        }
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json(transformed);
  } catch (error: any) {
    console.error("Error in PATCH /api/deliverables/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const deliverableId = params.id;

    // Fetch deliverable details before deleting for activity log
    const { data: deliverable } = await supabase
      .from("deliverables")
      .select("title, group_id, project_id")
      .eq("id", deliverableId)
      .single();

    const { error } = await supabase
      .from("deliverables")
      .delete()
      .eq("id", deliverableId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    if (deliverable) {
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", session.user.email)
          .single();
        
        if (userData) {
          await supabase.from("activity_logs").insert({
            group_id: deliverable.group_id,
            project_id: deliverable.project_id,
            user_id: userData.id,
            action_type: "deliverable_deleted",
            entity_title: deliverable.title
          });
        }
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
