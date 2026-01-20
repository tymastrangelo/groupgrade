import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type NormalizedRole = 'teacher' | 'student';

type MemberRow = {
  role: string;
  created_at: string | null;
  users: {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
  } | null;
};

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
  const normalizedRole: NormalizedRole = user.role === 'professor' ? 'teacher' : 'student';
  return { ...user, normalizedRole };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(session.user.email);
    const { id: classId } = await params;

    if (!classId || !isUuid(classId)) {
      return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });
    }

    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('id, name, code, join_code_expires_at, created_at, professor_id')
      .eq('id', classId)
      .maybeSingle();

    if (clsError) throw new Error(clsError.message);
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const { data: membership } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle();

    const isOwner = cls.professor_id === user.id;
    if (!isOwner && !membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: memberRows, error: membersError } = await supabase
      .from('class_members')
      .select('role, created_at, users(id, name, email, role, avatar_url)')
      .eq('class_id', classId)
      .order('created_at', { ascending: true });

    if (membersError) throw new Error(membersError.message);

    const members = ((memberRows as any) || []).map((m: any) => ({
      id: m.users?.id ?? 'unknown',
      name: m.users?.name ?? 'Member',
      email: m.users?.email ?? '',
      userRole: m.users?.role ?? null,
      classRole: m.role,
      avatar_url: (m as any)?.users?.avatar_url ?? null,
      joined_at: m.created_at,
    }));

    // Projects (best effort)
    let projects: any[] = [];
    try {
      const { data: projectRows, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, rubric, due_date')
        .eq('class_id', classId)
        .order('due_date', { ascending: true });

      if (!projectsError && projectRows) {
        const projectIds = projectRows.map((p: any) => p.id);
        const groupsByProject: Record<string, any[]> = {};
        if (projectIds.length) {
          const { data: groupRows, error: groupErr } = await supabase
            .from('groups')
            .select('id, name, project_id, group_members(user_id, users(name, email, avatar_url))')
            .in('project_id', projectIds);
          if (!groupErr && groupRows) {
            groupRows.forEach((g: any) => {
              const members = (g.group_members || []).map((m: any) => ({
                id: m.user_id,
                name: m.users?.name || 'Student',
                email: m.users?.email || '',
                avatar_url: m.users?.avatar_url || null,
              }));
              if (!groupsByProject[g.project_id]) groupsByProject[g.project_id] = [];
              groupsByProject[g.project_id].push({ id: g.id, name: g.name, members });
            });
          }
        }

        projects = projectRows.map((p: any) => ({
          id: p.id,
          name: p.name,
          due_date: p.due_date,
          rubric: p.rubric,
          groups: groupsByProject[p.id] || [],
        }));
      }
    } catch (projErr) {
      console.warn('Projects fetch skipped:', projErr);
    }

    // Optional notes (if table exists)
    let notes: any[] = [];
    try {
      const { data: noteRows, error: notesError } = await supabase
        .from('class_notes')
        .select('id, content, created_at, author_id, users:author_id(name)')
        .eq('class_id', classId)
        .order('created_at', { ascending: true });
      if (!notesError && noteRows) {
        notes = noteRows.map((n: any) => ({
          id: n.id,
          content: n.content,
          created_at: n.created_at,
          author_name: n.users?.name ?? 'Professor',
        }));
      }
    } catch (noteErr) {
      // If notes table missing, fall back silently
      console.warn('Notes fetch skipped:', noteErr);
    }

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        code: cls.code,
        join_code_expires_at: cls.join_code_expires_at,
        created_at: cls.created_at,
      },
      members,
      notes,
      projects,
      viewer_id: user.id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(session.user.email);
    const { id: classId } = await params;
    if (!classId || !isUuid(classId)) {
      return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });
    }

    const { action } = await req.json();
    if (!action || action !== 'regenerate') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Verify ownership
    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('professor_id')
      .eq('id', classId)
      .maybeSingle();
    if (clsError) throw new Error(clsError.message);
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    if (cls.professor_id !== user.id) {
      return NextResponse.json({ error: 'Only the class professor can modify codes' }, { status: 403 });
    }

    // regenerate
    const code = generateCode();
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('classes')
      .update({ code, join_code_expires_at: expires })
      .eq('id', classId)
      .select('id, name, code, join_code_expires_at, created_at')
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ class: data, revoked: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(session.user.email);
    const { id: classId } = await params;
    if (!classId || !isUuid(classId)) {
      return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });
    }

    const { user_id } = await req.json();
    if (!user_id || !isUuid(user_id)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    // Ensure requester is the class owner
    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('id, professor_id')
      .eq('id', classId)
      .maybeSingle();
    if (clsError) throw new Error(clsError.message);
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    if (cls.professor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent removing the professor record
    if (user_id === cls.professor_id) {
      return NextResponse.json({ error: 'Cannot remove the professor from the class' }, { status: 400 });
    }

    const { error: delError } = await supabase
      .from('class_members')
      .delete()
      .eq('class_id', classId)
      .eq('user_id', user_id);

    if (delError) throw new Error(delError.message);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
