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
    console.log('[Invite Staff] API called');
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classId } = await params;
    console.log('[Invite Staff] Class ID:', classId);
    
    const { educatorId, role } = await request.json();
    console.log('[Invite Staff] Educator ID:', educatorId, 'Role:', role);

    if (!educatorId || !role) {
      return NextResponse.json(
        { error: "Educator ID and role are required" },
        { status: 400 }
      );
    }

    if (!["professor", "ta"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'professor' or 'ta'" },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser(session.user.email);

    // Get current user's full details including name
    const { data: currentUserDetails } = await supabase
      .from("users")
      .select("name")
      .eq("id", currentUser.id)
      .single();

    // Verify the class exists and current user has permission
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, name, professor_id")
      .eq("id", classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if current user is the professor or already a staff member
    const { data: membership } = await supabase
      .from("class_members")
      .select("role")
      .eq("class_id", classId)
      .eq("user_id", currentUser.id)
      .single();

    const isProfessor = classData.professor_id === currentUser.id;
    const isStaff = membership?.role === "professor" || membership?.role === "ta";

    if (!isProfessor && !isStaff) {
      return NextResponse.json(
        { error: "You don't have permission to invite staff to this class" },
        { status: 403 }
      );
    }

    // Check if educator is already a member
    const { data: existingMember } = await supabase
      .from("class_members")
      .select("id, role")
      .eq("class_id", classId)
      .eq("user_id", educatorId)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "This educator is already a member of this class" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", educatorId)
      .eq("type", "teaching_team_invitation")
      .eq("read", false)
      .contains("metadata", { classId })
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: "There is already a pending invitation for this educator" },
        { status: 400 }
      );
    }

    // Get educator details
    const { data: educator } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", educatorId)
      .single();

    if (!educator) {
      return NextResponse.json({ error: "Educator not found" }, { status: 404 });
    }

    console.log('[Invite Staff] Creating notification for educator:', educatorId, educator.email);

    // Create notification for the invited educator
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        to_user_id: educatorId,
        from_user_id: currentUser.id,
        type: "info",
        title: "Teaching Team Invitation",
        message: `${currentUserDetails?.name || 'A professor'} has invited you to join the class: ${classData.name}`,
        read: false,
        status: "pending",
        metadata: {
          classId: classId,
          className: classData.name,
          inviterId: currentUser.id,
          inviterName: currentUserDetails?.name || 'Unknown',
          role: role,
          invitationType: "teaching_team",
        },
      })
      .select()
      .single();

    console.log('[Invite Staff] Notification creation result:', { notification, error: notificationError });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      return NextResponse.json(
        { error: "Failed to send invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${educator.name}`,
      notification,
    });
  } catch (error: any) {
    console.error("[Invite Staff] Error inviting staff:", error);
    console.error("[Invite Staff] Error stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
