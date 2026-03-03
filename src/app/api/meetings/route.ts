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
    const { data: groupInfo } = await supabase
      .from("groups")
      .select("project_id")
      .eq("id", groupId)
      .single();

    // Update meetings that have ended to 'concluded' and notify members
    for (const m of data || []) {
      try {
        const lengthMinutes = m.length_minutes || 60;
        const meetingDateTime = new Date(`${m.date}T${m.time}`);
        const meetingEnd = new Date(meetingDateTime.getTime() + lengthMinutes * 60000);
        if (meetingEnd.getTime() < now.getTime() && m.status !== "concluded" && m.status !== "cancelled") {
          // mark concluded
          await supabase.from("group_meetings").update({ status: "concluded" }).eq("id", m.id);

          // Log activity for meeting conclusion
          if (m.created_by && groupInfo?.project_id) {
            try {
              await supabase.from("activity_logs").insert({
                group_id: groupId,
                project_id: groupInfo.project_id,
                user_id: m.created_by,
                action_type: "meeting_concluded",
                entity_id: m.id,
                entity_title: m.title
              });
            } catch (logError) {
              console.error("Failed to log meeting conclusion:", logError);
            }
          }

          // fetch group members
          const { data: members } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);
          if (members && members.length > 0) {
            const notifications = members.map((mem: any) => ({
              to_user_id: mem.user_id,
              from_user_id: m.created_by || null,
              type: "info",
              title: `Meeting concluded: ${m.title}`,
              message: "Please add a short summary of what happened in this meeting.",
              deliverable_id: null,
              metadata: { meetingId: m.id, projectId: groupInfo?.project_id || null },
              read: false,
            }));
            await supabase.from("notifications").insert(notifications);
          }
        }
      } catch (err) {
        console.error("Error concluding meeting:", err);
      }
    }

    // Transform and return upcoming meetings by default
    const transformed = (data || [])
      .map((m: any) => {
        const meetingDateTime = new Date(`${m.date}T${m.time}`);
        const lengthMinutes = m.length_minutes || 60;
        const meetingEnd = new Date(meetingDateTime.getTime() + lengthMinutes * 60000);
        const status = m.status || "scheduled";
        const isUpcoming = meetingEnd.getTime() >= now.getTime() && status === "scheduled";
        return {
          id: m.id,
          title: m.title,
          date: m.date,
          time: m.time,
          type: m.type as "virtual" | "in-person",
          location: m.type === "in-person" ? m.location : m.meeting_url,
          isUpcoming,
          createdBy: m.created_by,
          lengthMinutes,
          status,
        };
      })
      .filter((m: any) => m.status !== "cancelled");

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
    const { groupId, title, date, time, type, link, location, lengthMinutes } = body;

    if (!groupId || !title || !date || !time || !type) {
      return NextResponse.json(
        { error: "groupId, title, date, time, and type are required" },
        { status: 400 }
      );
    }

    if (type !== "virtual" && type !== "in-person") {
      return NextResponse.json({ error: "Invalid meeting type" }, { status: 400 });
    }

    // Rate limiting: Check existing meeting count for this group
    const { data: existingMeetings, error: countError } = await supabase
      .from("group_meetings")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (countError) {
      console.error("Error checking meeting count:", countError);
    } else {
      const count = (existingMeetings as any)?.length || 0;
      if (count >= 50) {
        return NextResponse.json(
          { error: "Maximum limit of 50 meetings per group has been reached" },
          { status: 429 }
        );
      }
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
      length_minutes: lengthMinutes || 60,
      status: "scheduled",
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
