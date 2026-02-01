import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch notifications for this user
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select(`
        *,
        from_user:from_user_id(id, name, email, avatar_url),
        deliverable:deliverable_id(id, title, group_id, project_id)
      `)
      .eq("to_user_id", userData.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(notifications || []);
  } catch (error: any) {
    console.error("Error in GET /api/notifications:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { toUserId, type, title, message, deliverableId, metadata } = body;

    if (!toUserId || !type || !title) {
      return NextResponse.json(
        { error: "toUserId, type, and title are required" },
        { status: 400 }
      );
    }

    // Get sender user ID
    const { data: fromUser, error: fromUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (fromUserError || !fromUser) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        to_user_id: toUserId,
        from_user_id: fromUser.id,
        type,
        title,
        message,
        deliverable_id: deliverableId || null,
        metadata: metadata || null,
        read: false,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in POST /api/notifications:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
