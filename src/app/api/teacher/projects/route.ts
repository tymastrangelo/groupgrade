import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get current user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .maybeSingle();
    
    if (userErr) throw new Error(userErr.message);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.role !== 'professor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all classes where user is professor
    const { data: classes, error: classErr } = await supabase
      .from('classes')
      .select('id')
      .eq('professor_id', user.id);
    
    if (classErr) throw new Error(classErr.message);
    const classIds = (classes || []).map((c) => c.id);

    if (classIds.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    // Get all projects from those classes
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        due_date,
        rubric,
        class_id,
        classes:class_id(name)
      `)
      .in('class_id', classIds)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (projErr) throw new Error(projErr.message);

    const formatted = (projects || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      due_date: p.due_date,
      rubric: p.rubric,
      class_id: p.class_id,
      class_name: p.classes?.name || 'Unknown Class',
    }));

    return NextResponse.json({ projects: formatted });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
