import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userErr) throw new Error(userErr.message);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: tasks, error: taskErr } = await supabaseAdmin
      .from('project_tasks')
      .select(`
        id,
        title,
        status,
        project_id,
        due_date,
        projects:project_id(id, name, class_id, due_date, classes:class_id(name)),
        assignees:project_task_assignees!left(task_id, user:users!inner(id, name, email, avatar_url))
      `)
      .order('due_date', { ascending: true, nullsFirst: true });

    if (taskErr) throw new Error(taskErr.message);

    const shaped = (tasks || [])
      // Filter to tasks assigned to viewer
      .filter((t: any) => (t.assignees || []).some((a: any) => a.user?.id === user.id))
      .map((t: any) => {
        const firstAssignee = (t.assignees || []).map((a: any) => a.user).filter(Boolean)[0] || null;
        return {
          id: t.id,
          title: t.title,
          status: t.status || 'todo',
          projectId: t.project_id,
          projectName: t.projects?.name ?? 'Project',
          className: t.projects?.classes?.name ?? null,
          dueDate: t.due_date || t.projects?.due_date || null,
          assignee: firstAssignee,
        };
      });

    return NextResponse.json({ tasks: shaped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
