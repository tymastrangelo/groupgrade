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

    if (!groupId && !projectId) {
      return NextResponse.json(
        { error: "groupId or projectId is required" },
        { status: 400 }
      );
    }

    let query = supabase.from("deliverables").select("*");

    if (groupId) {
      query = query.eq("group_id", groupId);
    }
    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Supabase error fetching deliverables:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Manually fetch user data for assigned_to
    const userIds = (data || []).map((d: any) => d.assigned_to).filter(Boolean);
    const uniqueUserIds = [...new Set(userIds)];
    
    let usersMap: Record<string, any> = {};
    if (uniqueUserIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .in("id", uniqueUserIds);
      
      if (!usersError && users) {
        usersMap = users.reduce((acc: Record<string, any>, user: any) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }
    }

    // Transform data to match frontend expectations
    const transformedData = (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      status: d.status,
      dueDate: d.due_date,
      assignedTo: d.assigned_to && usersMap[d.assigned_to] ? {
        id: usersMap[d.assigned_to].id,
        name: usersMap[d.assigned_to].name,
        email: usersMap[d.assigned_to].email,
        avatar_url: usersMap[d.assigned_to].avatar_url
      } : null,
      groupId: d.group_id,
      projectId: d.project_id,
      createdAt: d.created_at,
      submittedAt: d.submitted_at,
      submissionUrl: d.submission_url,
      submissionNotes: d.submission_notes
    }));

    return NextResponse.json(transformedData);
  } catch (error: any) {
    console.error("Error in GET /api/deliverables:", error);
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
    const { groupId, projectId, title, description, dueDate, status } = body;

    if (!groupId || !projectId || !title) {
      return NextResponse.json(
        { error: "groupId, projectId, and title are required" },
        { status: 400 }
      );
    }

    // Get user ID from email
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("deliverables")
      .insert({
        group_id: groupId,
        project_id: projectId,
        title,
        description,
        due_date: dueDate || null,
        status: status || "not-started",
        created_by: userData.id,
        assigned_to: userData.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("activity_logs").insert({
        group_id: groupId,
        project_id: projectId,
        user_id: userData.id,
        action_type: "deliverable_created",
        entity_id: data.id,
        entity_title: title
      });
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
