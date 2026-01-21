import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isUuid(id: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5]{3}-[89abAB]{3}-[0-9a-fA-F]{12}$/.test(id);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; projectId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: classId, projectId } = await params;
    if (!classId || !projectId || !isUuid(classId) || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .maybeSingle();
    if (userErr) throw new Error(userErr.message);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: cls, error: clsErr } = await supabase
      .from('classes')
      .select('professor_id')
      .eq('id', classId)
      .maybeSingle();
    if (clsErr) throw new Error(clsErr.message);
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    if (cls.professor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, class_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) throw new Error(projErr.message);
    if (!project || project.class_id !== classId) {
      return NextResponse.json({ error: 'Project not found for class' }, { status: 404 });
    }

    const { data: groupRows, error: groupsErr } = await supabase
      .from('groups')
      .select('id')
      .eq('project_id', projectId);
    if (groupsErr) throw new Error(groupsErr.message);

    const groupIds = (groupRows || []).map((g) => g.id);
    if (groupIds.length) {
      const { error: gmErr } = await supabase.from('group_members').delete().in('group_id', groupIds);
      if (gmErr) throw new Error(gmErr.message);
      const { error: delGroupsErr } = await supabase.from('groups').delete().in('id', groupIds);
      if (delGroupsErr) throw new Error(delGroupsErr.message);
    }

    const { error: deleteErr } = await supabase.from('projects').delete().eq('id', projectId);
    if (deleteErr) throw new Error(deleteErr.message);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
