import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// PATCH - Update notification (mark as read, accept/decline assignment)
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
    const notificationId = params.id;
    const body = await request.json();
    const { action, read } = body;

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the notification
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select("*, deliverable:deliverable_id(*)")
      .eq("id", notificationId)
      .eq("to_user_id", userData.id)
      .single();

    if (notifError || !notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Handle different actions
    if (action === "accept" && notification.type === "deliverable_assignment") {
      // Accept the deliverable assignment
      const deliverableId = notification.deliverable_id;

      if (!deliverableId) {
        return NextResponse.json({ error: "No deliverable associated" }, { status: 400 });
      }

      // Update deliverable to assign to this user and change status from pending
      const { error: updateError } = await supabase
        .from("deliverables")
        .update({
          assigned_to: userData.id,
          status: "not-started" // Reset to not-started when accepted
        })
        .eq("id", deliverableId);

      if (updateError) {
        console.error("Error updating deliverable:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Update notification status
      const { data: updatedNotif, error: updateNotifError } = await supabase
        .from("notifications")
        .update({ status: "accepted", read: true })
        .eq("id", notificationId)
        .select()
        .single();

      if (updateNotifError) {
        return NextResponse.json({ error: updateNotifError.message }, { status: 500 });
      }

      // Create activity log
      const { data: deliverable } = await supabase
        .from("deliverables")
        .select("group_id, project_id, title")
        .eq("id", deliverableId)
        .single();

      if (deliverable) {
        await supabase.from("activity_logs").insert({
          group_id: deliverable.group_id,
          project_id: deliverable.project_id,
          user_id: userData.id,
          action_type: "deliverable_reassigned",
          entity_id: deliverableId,
          entity_title: deliverable.title
        });
      }

      return NextResponse.json({ success: true, notification: updatedNotif, action: "accepted" });

    } else if (action === "decline" && notification.type === "deliverable_assignment") {
      // Decline the assignment - revert to original assignee if stored, or leave unassigned
      const deliverableId = notification.deliverable_id;
      const originalAssignee = notification.metadata?.original_assignee_id;

      if (deliverableId) {
        // Revert to original assignee or set to the person who tried to reassign
        const { error: updateError } = await supabase
          .from("deliverables")
          .update({
            assigned_to: originalAssignee || notification.from_user_id,
            status: notification.metadata?.original_status || "not-started"
          })
          .eq("id", deliverableId);

        if (updateError) {
          console.error("Error reverting deliverable:", updateError);
        }
      }

      // Update notification status
      const { data: updatedNotif, error: updateNotifError } = await supabase
        .from("notifications")
        .update({ status: "declined", read: true })
        .eq("id", notificationId)
        .select()
        .single();

      if (updateNotifError) {
        return NextResponse.json({ error: updateNotifError.message }, { status: 500 });
      }

      // Notify the sender that their assignment was declined
      await supabase.from("notifications").insert({
        to_user_id: notification.from_user_id,
        from_user_id: userData.id,
        type: "assignment_declined",
        title: "Assignment Declined",
        message: `${session.user.name || "A team member"} declined the assignment for "${notification.deliverable?.title || "a deliverable"}"`,
        deliverable_id: deliverableId,
        read: false,
        status: "info"
      });

      return NextResponse.json({ success: true, notification: updatedNotif, action: "declined" });

    } else if (read !== undefined) {
      // Just mark as read/unread
      const { data: updatedNotif, error: updateError } = await supabase
        .from("notifications")
        .update({ read })
        .eq("id", notificationId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json(updatedNotif);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Error in PATCH /api/notifications/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a notification
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
    const notificationId = params.id;

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("to_user_id", userData.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error in DELETE /api/notifications/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
