import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isUuid(id: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);
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

    // Membership check
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
      .from('class_notes')
      .select('id, content, created_at, author_id, users:author_id(name)')
      .eq('class_id', classId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);

    const notes = (data || []).map((n: any) => ({
      id: n.id,
      content: n.content,
      created_at: n.created_at,
      author_name: n.users?.name ?? 'Professor',
    }));

    return NextResponse.json({ notes });
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

    // Only professor/owner can post notes
    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('professor_id')
      .eq('id', classId)
      .maybeSingle();
    if (clsError) throw new Error(clsError.message);
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    if (cls.professor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { content } = await req.json();
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('class_notes')
      .insert({ class_id: classId, author_id: user.id, content: content.trim() })
      .select('id, content, created_at, author_id')
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ note: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
