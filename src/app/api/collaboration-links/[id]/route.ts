import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const linkId = params.id;
    const body = await request.json();
    const { title, url, iconType } = body;

    // Get user ID from email
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch link to check creator
    const { data: link, error: fetchError } = await supabase
      .from("collaboration_links")
      .select("created_by")
      .eq("id", linkId)
      .single();

    if (fetchError || !link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Check if user is the creator
    if (link.created_by !== userData.id) {
      return NextResponse.json({ error: "Only the creator can edit this link" }, { status: 403 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;
    if (iconType !== undefined) updateData.icon_type = iconType;

    const { data, error } = await supabase
      .from("collaboration_links")
      .update(updateData)
      .eq("id", linkId)
      .select("*")
      .single();

    if (error) {
      console.error("Supabase error updating collaboration link:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      url: data.url,
      iconType: data.icon_type,
      createdBy: data.created_by,
      createdAt: data.created_at,
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/collaboration-links/[id]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

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
    const linkId = params.id;

    // Get user ID from email
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch link to check creator
    const { data: link, error: fetchError } = await supabase
      .from("collaboration_links")
      .select("created_by")
      .eq("id", linkId)
      .single();

    if (fetchError || !link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Check if user is the creator
    if (link.created_by !== userData.id) {
      return NextResponse.json({ error: "Only the creator can delete this link" }, { status: 403 });
    }

    const { error } = await supabase
      .from("collaboration_links")
      .delete()
      .eq("id", linkId);

    if (error) {
      console.error("Supabase error deleting collaboration link:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/collaboration-links/[id]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
