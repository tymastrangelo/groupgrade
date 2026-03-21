import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await req.json();
    if (!['teacher', 'student'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const dbRole = role === 'teacher' ? 'professor' : role;

    // Require allowlist for professors
    // COMMENTED OUT FOR TESTING - RE-ENABLE IN PRODUCTION
    // if (dbRole === 'professor') {
    //   const { data: approved, error: approvedError } = await supabase
    //     .from('approved_professors')
    //     .select('email')
    //     .eq('email', session.user.email)
    //     .maybeSingle();

    //   if (approvedError) {
    //     return NextResponse.json({ error: approvedError.message }, { status: 500 });
    //   }

    //   if (!approved) {
    //     return NextResponse.json({ error: 'Professor email not approved yet. Please contact admin.' }, { status: 403 });
    //   }
    // }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // If user record is missing, create it on the fly
    let userId = user?.id;
    if (!userId) {
      const { data: inserted, error: insertError } = await supabase
        .from('users')
        .insert({
          email: session.user.email,
          name: session.user.name || session.user.email,
          role: dbRole,
        })
        .select('id')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      userId = inserted.id;
    } else {
      // Before changing role, remove user from all classes and groups to prevent abuse
      // (e.g., student switching to teacher to access student groups)
      
      // Remove from all group memberships
      await supabase
        .from('group_members')
        .delete()
        .eq('user_id', userId);
      
      // Remove from all class enrollments (students)
      await supabase
        .from('class_students')
        .delete()
        .eq('student_id', userId);
      
      // Remove from all class ownerships (teachers)
      // Note: This will cascade delete projects, groups, etc. via foreign key constraints
      await supabase
        .from('classes')
        .delete()
        .eq('teacher_id', userId);
      
      // Update the user's role
      const { error } = await supabase
        .from('users')
        .update({ role: dbRole })
        .eq('id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, role: dbRole, userId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}