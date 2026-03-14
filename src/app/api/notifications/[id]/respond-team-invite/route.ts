import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth-utils";

const supabase = supabaseAdmin;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: notificationId } = await params;
    const { action } = await request.json();

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser(session.user.email);

    // Get the notification
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .eq("to_user_id", currentUser.id)
      .single();

    if (notificationError || !notification) {
      console.error("Notification query error:", notificationError);
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Verify this is a teaching team invitation
    const metadata = notification.metadata as any;
    if (metadata?.invitationType !== "teaching_team") {
      return NextResponse.json(
        { error: "Not a teaching team invitation" },
        { status: 400 }
      );
    }

    const classId = metadata?.classId;
    const inviteRole = metadata?.role || "ta";
    // Map ta to professor for class_members table (only accepts 'professor' or 'student')
    const memberRole = inviteRole === "ta" ? "professor" : inviteRole;

    if (!classId) {
      return NextResponse.json(
        { error: "Invalid notification data" },
        { status: 400 }
      );
    }

    if (action === "accept") {
      // Add user to class_members with the specified role
      const { error: memberError } = await supabase
        .from("class_members")
        .insert({
          class_id: classId,
          user_id: currentUser.id,
          role: memberRole,
          staff_role: inviteRole, // Store original role (professor or ta) for display
        });

      if (memberError) {
        console.error("Error adding class member:", memberError);
        return NextResponse.json(
          { error: "Failed to join class" },
          { status: 500 }
        );
      }
    }

    // Mark notification as read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    return NextResponse.json({
      success: true,
      action,
      message: action === "accept" 
        ? "You have joined the teaching team" 
        : "Invitation declined",
    });
  } catch (error: any) {
    console.error("Error responding to team invitation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
