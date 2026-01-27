import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const projectId = searchParams.get("projectId");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 5;

    if (!groupId || !projectId) {
      return NextResponse.json(
        { error: "groupId and projectId are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("group_id", groupId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase error fetching activity logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user data for all activities
    const userIds = [...new Set((data || []).map((a: any) => a.user_id))].filter(Boolean);
    let usersMap: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .in("id", userIds);
      
      if (!usersError && users) {
        usersMap = users.reduce((acc: Record<string, any>, user: any) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }
    }

    // Transform data to include user info
    const transformedData = (data || []).map((activity: any) => {
      const user = usersMap[activity.user_id] || {};
      return {
        id: activity.id,
        actionType: activity.action_type,
        entityId: activity.entity_id,
        entityTitle: activity.entity_title,
        createdAt: activity.created_at,
        userId: activity.user_id,
        userName: user.name || 'Unknown',
        userEmail: user.email || '',
        userAvatar: user.avatar_url || null
      };
    });

    return NextResponse.json(transformedData);
  } catch (error: any) {
    console.error("Error in GET /api/activity:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, projectId, actionType, entityId, entityTitle } = body;

    if (!groupId || !projectId || !actionType) {
      return NextResponse.json(
        { error: "groupId, projectId, and actionType are required" },
        { status: 400 }
      );
    }

    // Get user ID from email
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        group_id: groupId,
        project_id: projectId,
        user_id: user.id,
        action_type: actionType,
        entity_id: entityId,
        entity_title: entityTitle
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating activity log:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, activity: data });
  } catch (error: any) {
    console.error("Error in POST /api/activity:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
