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
    const { assignedTo, createPendingAssignment } = body;

    if (!assignedTo) {
      return NextResponse.json(
        { error: "assignedTo is required" },
        { status: 400 }
      );
    }

    // Get current user
    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", session.user.email)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the current deliverable state
    const { data: currentDeliverable, error: currentDelError } = await supabase
      .from("deliverables")
      .select("*")
      .eq("id", deliverableId)
      .single();

    if (currentDelError || !currentDeliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    // Get target user info
    const { data: targetUser, error: targetUserError } = await supabase
      .from("users")
      .select("id, name, email, avatar_url")
      .eq("id", assignedTo)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // If createPendingAssignment is true, create a notification instead of direct assignment
    if (createPendingAssignment) {
      // Check if there's already a pending notification for this deliverable to this user
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("deliverable_id", deliverableId)
        .eq("to_user_id", assignedTo)
        .eq("type", "deliverable_assignment")
        .eq("status", "pending")
        .single();

      if (existingNotif) {
        return NextResponse.json(
          { error: "A pending assignment already exists for this user" },
          { status: 400 }
        );
      }

      // Create notification for the target user
      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .insert({
          to_user_id: assignedTo,
          from_user_id: currentUser.id,
          type: "deliverable_assignment",
          title: "New Deliverable Assignment",
          message: `${currentUser.name || "A team member"} wants to assign "${currentDeliverable.title}" to you`,
          deliverable_id: deliverableId,
          read: false,
          status: "pending",
          metadata: {
            original_assignee_id: currentDeliverable.assigned_to,
            original_status: currentDeliverable.status,
            deliverable_title: currentDeliverable.title
          }
        })
        .select()
        .single();

      if (notifError) {
        console.error("Error creating notification:", notifError);
        return NextResponse.json({ error: notifError.message }, { status: 500 });
      }

      // Update deliverable to pending status (keep current assignee for now)
      const { data, error } = await supabase
        .from("deliverables")
        .update({
          status: "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", deliverableId)
        .select("*")
        .single();

      if (error) {
        console.error("Supabase error updating deliverable:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Get current assignee info for response
      let assignedUser = null;
      if (data.assigned_to) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, name, email, avatar_url")
          .eq("id", data.assigned_to)
          .single();
        assignedUser = userData;
      }

      const transformed = {
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        dueDate: data.due_date,
        assignedTo: assignedUser,
        pendingAssignee: targetUser,
        groupId: data.group_id,
        projectId: data.project_id,
        createdAt: data.created_at
      };

      return NextResponse.json({
        ...transformed,
        pendingAssignment: true,
        notification
      });
    }

    // Direct assignment (no pending)
    const { data, error } = await supabase
      .from("deliverables")
      .update({ assigned_to: assignedTo })
      .eq("id", deliverableId)
      .select("*")
      .single();

    if (error) {
      console.error("Supabase error assigning deliverable:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to match frontend expectations
    const transformed = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      dueDate: data.due_date,
      assignedTo: targetUser,
      groupId: data.group_id,
      projectId: data.project_id,
      createdAt: data.created_at
    };

    // Log activity
    try {
      await supabase.from("activity_logs").insert({
        group_id: data.group_id,
        project_id: data.project_id,
        user_id: currentUser.id,
        action_type: "deliverable_reassigned",
        entity_id: data.id,
        entity_title: data.title
      });
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return NextResponse.json(transformed);
  } catch (error: any) {
    console.error("Error in PATCH /api/deliverables/[id]/assign:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
