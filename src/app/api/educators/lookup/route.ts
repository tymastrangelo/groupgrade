import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, role')
      .eq('email', email.toLowerCase().trim())
      .eq('role', 'professor')
      .maybeSingle();

    if (error) {
      console.error('[Educator Lookup] Supabase error:', error);
      return NextResponse.json({ 
        found: false, 
        message: `Database error: ${error.message}` 
      });
    }

    if (!user) {
      return NextResponse.json({ 
        found: false, 
        message: "No user found with this email" 
      });
    }

    // Return educator preview data
    return NextResponse.json({
      found: true,
      educator: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.avatar_url,
      },
    });
  } catch (error: any) {
    console.error("Error in educator lookup:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
