import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isUuid(id: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5]{3}-[89abAB]{3}-[0-9a-fA-F]{12}$/.test(id);
}

async function getCurrentUser(sessionEmail: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', sessionEmail)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!user) throw new Error('User not found');
  return { ...user, normalizedRole: user.role === 'professor' ? 'teacher' : 'student' };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await getCurrentUser(session.user.email);
    const { id: classId } = await params;
    if (!classId || !isUuid(classId)) return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });

    const { data: membership } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle();
    const { data: cls } = await supabase
      .from('classes')
      .select('professor_id')
      .eq('id', classId)
      .maybeSingle();
    const isOwner = cls?.professor_id === user.id;
    if (!isOwner && !membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, rubric, due_date')
      .eq('class_id', classId)
      .order('due_date', { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ projects: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await getCurrentUser(session.user.email);
    const { id: classId } = await params;
    if (!classId || !isUuid(classId)) return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });

    const { name, due_date, assignment_mode, grouping_strategy, description, rubric_text, deliverables, expectations } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Only professor can create projects
    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('professor_id')
      .eq('id', classId)
      .maybeSingle();
    if (clsError) throw new Error(clsError.message);
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    if (cls.professor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rubricPayload: Record<string, any> = {
      assignment_mode: assignment_mode || 'teacher_assigns',
      grouping_strategy: grouping_strategy || 'manual',
    };

    if (rubric_text) rubricPayload.rubric_text = rubric_text;

    // Handle deliverables - convert array to newline-separated string for storage
    let deliverablesStr = null;
    if (Array.isArray(deliverables) && deliverables.length > 0) {
      deliverablesStr = deliverables.filter((d: any) => typeof d === 'string' && d.trim()).join('\n');
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        class_id: classId,
        name: name.trim(),
        due_date: due_date || null,
        description: description || null,
        expectations: expectations || null,
        deliverables: deliverablesStr,
        rubric: JSON.stringify(rubricPayload),
      })
      .select('id, name, rubric, due_date, description, expectations, deliverables')
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ project: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
