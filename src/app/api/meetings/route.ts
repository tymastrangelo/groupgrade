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
      .from("group_meetings")
      .select("*")
      .eq("group_id", groupId)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.error("Supabase error fetching meetings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();

    // Filter and transform - only return upcoming meetings
    const transformed = (data || [])
      .map((m: any) => {
        const meetingDateTime = new Date(`${m.date}T${m.time}`);
        const isUpcoming = meetingDateTime.getTime() >= now.getTime();
        return {
          id: m.id,
          title: m.title,
          date: m.date,
          time: m.time,
          type: m.type as "virtual" | "in-person",
          location: m.type === "in-person" ? m.location : m.meeting_url,
          isUpcoming,
          createdBy: m.created_by,
        };
      })
      .filter((m: any) => m.isUpcoming);

    // Fetch creator emails for meetings
    const creatorIds = [...new Set(transformed.map((m: any) => m.createdBy).filter(Boolean))];
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

    // Add creator email to each meeting
    const finalData = transformed.map((m: any) => ({
      ...m,
      creatorEmail: m.createdBy ? creatorsMap[m.createdBy] : null,
    }));

    return NextResponse.json(finalData);
  } catch (error: any) {
    console.error("Error in GET /api/meetings:", error);
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
    const { groupId, title, date, time, type, link, location } = body;

    if (!groupId || !title || !date || !time || !type) {
      return NextResponse.json(
        { error: "groupId, title, date, time, and type are required" },
        { status: 400 }
      );
    }

    if (type !== "virtual" && type !== "in-person") {
      return NextResponse.json({ error: "Invalid meeting type" }, { status: 400 });
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
      date,
      time,
      type,
      location: type === "in-person" ? location || null : null,
      meeting_url: type === "virtual" ? link || null : null,
      created_by: userData?.id || null,
    };

    const { data, error } = await supabase
      .from("group_meetings")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      console.error("Supabase error creating meeting:", error);
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
          action_type: "meeting_created",
          entity_id: data.id,
          entity_title: title
        });
      }
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/meetings:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
