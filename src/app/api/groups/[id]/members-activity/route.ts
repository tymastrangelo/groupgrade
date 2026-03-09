import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const groupId = params.id;

    // Fetch group members with their last_active timestamps
    const { data: groupMembers, error } = await supabase
      .from("group_members")
      .select("user_id, users(id, email, last_active)")
      .eq("group_id", groupId);

    if (error) {
      console.error("Error fetching member activity:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to a simple map of user_id -> last_active
    const memberActivity = (groupMembers || []).map((gm: any) => ({
      id: gm.users?.id,
      email: gm.users?.email,
      last_active: gm.users?.last_active,
    }));

    return NextResponse.json({ members: memberActivity });
  } catch (error: any) {
    console.error("Error in GET /api/groups/[id]/members-activity:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
