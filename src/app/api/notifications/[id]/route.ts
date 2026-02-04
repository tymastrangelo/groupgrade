import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// PATCH - update a notification (accept/decline/read)
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

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action;
    const read = body.read;

    // Fetch the notification
    const { data: notification, error: notifErr } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .single();

    if (notifErr || !notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Handle different actions
    if (action === "accept" && notification.type === "deliverable_assignment") {
      // If this notification is a final-approval request, handle differently
      const isFinalApproval = notification.metadata?.final === true;
      const deliverableId = notification.deliverable_id;

      if (isFinalApproval) {
        // Mark this user's approval as accepted
        const { data: updatedNotif, error: updateNotifError } = await supabase
          .from("notifications")
          .update({ status: "accepted", read: true })
          .eq("id", notificationId)
          .select()
          .single();

        if (updateNotifError) {
          return NextResponse.json({ error: updateNotifError.message }, { status: 500 });
        }

        // Check if there are any remaining pending final-approval notifications for this deliverable
        if (deliverableId) {
          const { data: allNotifs } = await supabase
            .from('notifications')
            .select('*')
            .eq('deliverable_id', deliverableId)
            .eq('type', 'deliverable_assignment');

          const pendingFinals = (allNotifs || []).filter((n: any) => n.metadata?.final === true && n.status !== 'accepted');

          if (pendingFinals.length === 0) {
            // All approvals received: finalize the deliverable
            try {
              const { data: deliverable } = await supabase
                .from('deliverables')
                .select('group_id, project_id, title')
                .eq('id', deliverableId)
                .single();

              await supabase
                .from('deliverables')
                .update({ status: 'finalized' })
                .eq('id', deliverableId);

              if (deliverable) {
                await supabase.from('activity_logs').insert({
                  group_id: deliverable.group_id,
                  project_id: deliverable.project_id,
                  user_id: userData.id,
                  action_type: 'deliverable_submitted',
                  entity_id: deliverableId,
                  entity_title: deliverable.title
                });
              }
            } catch (finalErr) {
              console.error('Failed to finalize deliverable:', finalErr);
            }
          }
        }

        return NextResponse.json({ success: true, notification: updatedNotif, action: 'accepted' });
      }

      // Default behavior for assignment acceptance (non-final)
      if (!notification.deliverable_id) {
        return NextResponse.json({ error: "No deliverable associated" }, { status: 400 });
      }

      // Accept the deliverable assignment
      const deliverableIdNonFinal = notification.deliverable_id;

      // Update deliverable to assign to this user and change status from pending
      const { error: updateError } = await supabase
        .from("deliverables")
        .update({
          assigned_to: userData.id,
          status: "not-started" // Reset to not-started when accepted
        })
        .eq("id", deliverableIdNonFinal);

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
        .eq("id", deliverableIdNonFinal)
        .single();

      if (deliverable) {
        await supabase.from("activity_logs").insert({
          group_id: deliverable.group_id,
          project_id: deliverable.project_id,
          user_id: userData.id,
          action_type: "deliverable_reassigned",
          entity_id: deliverableIdNonFinal,
          entity_title: deliverable.title
        });
      }

      return NextResponse.json({ success: true, notification: updatedNotif, action: "accepted" });
    } else if (action === "decline" && notification.type === "deliverable_assignment") {
      // Handle decline for final approval separately
      const isFinalApproval = notification.metadata?.final === true;
      const deliverableId = notification.deliverable_id;

      if (isFinalApproval) {
        const { data: updatedNotif, error: updateNotifError } = await supabase
          .from('notifications')
          .update({ status: 'declined', read: true })
          .eq('id', notificationId)
          .select()
          .single();

        if (updateNotifError) {
          return NextResponse.json({ error: updateNotifError.message }, { status: 500 });
        }

        // Notify the uploader that a team member declined the final submission
        if (deliverableId) {
          await supabase.from('notifications').insert({
            to_user_id: notification.from_user_id,
            from_user_id: userData.id,
            type: 'assignment_declined',
            title: 'Final deliverable approval declined',
            message: `${session.user.name || 'A team member'} declined approval for "${notification.deliverable?.title || 'the final deliverable'}"`,
            deliverable_id: deliverableId,
            read: false,
            status: 'info'
          });
        }

        return NextResponse.json({ success: true, notification: updatedNotif, action: 'declined' });
      }

      // Non-final decline (original behavior)
      const originalAssignee = notification.metadata?.original_assignee_id;

      if (notification.deliverable_id) {
        // Revert to original assignee or set to the person who tried to reassign
        const { error: updateError } = await supabase
          .from("deliverables")
          .update({
            assigned_to: originalAssignee || notification.from_user_id,
            status: notification.metadata?.original_status || "not-started"
          })
          .eq("id", notification.deliverable_id);

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
        deliverable_id: notification.deliverable_id,
        read: false,
        status: "info"
      });

      return NextResponse.json({ success: true, notification: updatedNotif, action: "declined" });

    } else if (read !== undefined) {
      const { data: updatedNotif, error: updateError } = await supabase
        .from("notifications")
        .update({ read: !!read })
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
