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

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("collaboration_links")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching collaboration links:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch creator emails
    const creatorIds = [...new Set((data || []).map((link: any) => link.created_by).filter(Boolean))];
    let creatorsMap: Record<string, any> = {};
    if (creatorIds.length > 0) {
      const { data: creators, error: creatorsError } = await supabase
        .from("users")
        .select("id, email")
        .in("id", creatorIds);
      
      if (!creatorsError && creators) {
        creatorsMap = creators.reduce((acc: Record<string, any>, user: any) => {
          acc[user.id] = user.email;
          return acc;
        }, {});
      }
    }

    const transformed = (data || []).map((link: any) => ({
      id: link.id,
      title: link.title,
      url: link.url,
      iconType: link.icon_type,
      createdBy: link.created_by,
      creatorEmail: link.created_by ? creatorsMap[link.created_by] : null,
      createdAt: link.created_at,
    }));

    return NextResponse.json(transformed);
  } catch (error: any) {
    console.error("Error in GET /api/collaboration-links:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, title, url, iconType } = body;

    if (!groupId || !title || !url || !iconType) {
      return NextResponse.json(
        { error: "groupId, title, url, and iconType are required" },
        { status: 400 }
      );
    }

    // Get user ID from email
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    const insertData: any = {
      group_id: groupId,
      title,
      url,
      icon_type: iconType,
      created_by: userData?.id || null,
    };

    const { data, error } = await supabase
      .from("collaboration_links")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      console.error("Supabase error creating collaboration link:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity - need to get project_id from group
    try {
      const { data: groupData } = await supabase
        .from("groups")
        .select("project_id")
        .eq("id", groupId)
        .single();
      
      if (groupData && userData) {
        await supabase.from("activity_logs").insert({
          group_id: groupId,
          project_id: groupData.project_id,
          user_id: userData.id,
          action_type: "link_created",
          entity_id: data.id,
          entity_title: title
        });
      }
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      url: data.url,
      iconType: data.icon_type,
      createdBy: data.created_by,
      createdAt: data.created_at,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/collaboration-links:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
