import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;

    // Get current user
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all groups the user is a member of
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    const groupIds = (memberships || []).map((m) => m.group_id);

    if (groupIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch activity logs for all user's groups, excluding current user's own activity
    const { data: activities, error: activityError } = await supabaseAdmin
      .from("activity_logs")
      .select("*")
      .in("group_id", groupIds)
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (activityError) {
      return NextResponse.json({ error: activityError.message }, { status: 500 });
    }

    // Get unique user IDs to fetch their info
    const userIds = [...new Set((activities || []).map((a: any) => a.user_id))].filter(Boolean);
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, name, email, avatar_url")
        .in("id", userIds);

      if (users) {
        usersMap = users.reduce((acc: Record<string, any>, u: any) => {
          acc[u.id] = u;
          return acc;
        }, {});
      }
    }

    // Get group/project info for context
    const { data: groups } = await supabaseAdmin
      .from("groups")
      .select("id, name, project_id, projects(name)")
      .in("id", groupIds);

    const groupsMap = (groups || []).reduce((acc: Record<string, any>, g: any) => {
      acc[g.id] = g;
      return acc;
    }, {});

    // Transform data
    const transformedData = (activities || []).map((activity: any) => {
      const activityUser = usersMap[activity.user_id] || {};
      const group = groupsMap[activity.group_id] || {};
      return {
        id: activity.id,
        actionType: activity.action_type,
        entityId: activity.entity_id,
        entityTitle: activity.entity_title,
        createdAt: activity.created_at,
        groupName: group.name || "Unknown Group",
        projectName: group.projects?.name || "Unknown Project",
        user: {
          id: activity.user_id,
          name: activityUser.name || "Unknown",
          email: activityUser.email || "",
          avatar_url: activityUser.avatar_url || null,
        },
      };
    });

    return NextResponse.json(transformedData);
  } catch (error: any) {
    console.error("Error in GET /api/user/activity:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
