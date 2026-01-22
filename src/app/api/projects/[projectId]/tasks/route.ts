import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function isUuid(id: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);
}

const VALID_STATUSES = new Set(['todo', 'in_progress', 'submitted', 'done']);

type AssigneeRow = { task_id: string; user: { id: string; name: string; email: string; avatar_url: string | null }[] };
type TaskRow = {
  id: string;
  title: string;
  status: string;
  project_id: string;
  due_date: string | null;
  projects: { id: string; name: string; due_date: string | null }[];
  assignees: AssigneeRow[];
};

async function getViewer(sessionEmail?: string) {
  if (!sessionEmail) return { error: 'Unauthorized', status: 401 } as const;
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', sessionEmail)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 } as const;
  if (!user) return { error: 'User not found', status: 404 } as const;
  return { user } as const;
}

async function ensureProjectAccess(projectId: string, userId: string) {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id, class_id, classes:class_id(professor_id)')
    .eq('id', projectId)
    .maybeSingle();

  if (error) return { error: error.message, status: 500 } as const;
  if (!project) return { error: 'Project not found', status: 404 } as const;

  const professorId = (project as any).classes?.professor_id;
  if (professorId === userId) return { ok: true } as const;

  const { data: membership } = await supabaseAdmin
    .from('class_members')
    .select('id')
    .eq('class_id', project.class_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) return { error: 'Forbidden', status: 403 } as const;
  return { ok: true } as const;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession(authOptions);
  const { projectId } = await params;

  if (!projectId || !isUuid(projectId)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  const viewer = await getViewer(session?.user?.email || undefined);
  if ('error' in viewer) return NextResponse.json({ error: viewer.error }, { status: viewer.status });

  const access = await ensureProjectAccess(projectId, viewer.user.id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { data: tasks, error: taskErr } = await supabaseAdmin
      .from('project_tasks')
      .select(`
        id,
        title,
        status,
        project_id,
        due_date,
        projects:project_id(id, name, due_date),
        assignees:project_task_assignees!left(task_id, user:users!inner(id, name, email, avatar_url))
      `)
      .eq('project_id', projectId)
      .order('due_date', { ascending: true, nullsFirst: true });

    if (taskErr) throw new Error(taskErr.message);

    const shaped = (tasks as TaskRow[] || []).map((t) => {
      const firstAssignee = t.assignees?.[0]?.user?.[0] || null;
      return {
        id: t.id,
        title: t.title,
        status: t.status || 'todo',
        projectId: t.project_id,
        projectName: t.projects?.[0]?.name ?? 'Project',
        dueDate: t.due_date || t.projects?.[0]?.due_date || null,
        assignee: firstAssignee,
      };
    });

    return NextResponse.json({ tasks: shaped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession(authOptions);
  const { projectId } = await params;

  if (!projectId || !isUuid(projectId)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  const viewer = await getViewer(session?.user?.email || undefined);
  if ('error' in viewer) return NextResponse.json({ error: viewer.error }, { status: viewer.status });

  const access = await ensureProjectAccess(projectId, viewer.user.id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const title = (body?.title || '').trim();
  const description = body?.description ? (body.description as string).trim() : null;
  const assigneeId = body?.assigneeId || viewer.user.id;
  const status = body?.status && VALID_STATUSES.has(body.status) ? body.status : 'todo';
  const priority = body?.priority && ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium';
  const due_date = body?.due_date || null;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  try {
    const { data: insertedTask, error: insertTaskErr } = await supabaseAdmin
      .from('project_tasks')
      .insert({
        project_id: projectId,
        title,
        description,
        status,
        priority,
        due_date,
        created_by: viewer.user.id,
      })
      .select('id')
      .single();

    if (insertTaskErr) throw new Error(insertTaskErr.message);

    if (assigneeId) {
      await supabaseAdmin
        .from('project_task_assignees')
        .insert({ task_id: insertedTask.id, user_id: assigneeId })
        .throwOnError();
    }

    // Re-fetch the created task with joins
    const { data: inserted, error: fetchErr } = await supabaseAdmin
      .from('project_tasks')
      .select(`
        id,
        title,
        status,
        project_id,
        due_date,
        projects:project_id(id, name, due_date),
        assignees:project_task_assignees!left(task_id, user:users!inner(id, name, email, avatar_url))
      `)
      .eq('id', insertedTask.id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);

    const insertedRow = inserted as TaskRow | null;
    const firstAssignee = insertedRow?.assignees?.[0]?.user?.[0] || null;
    const shaped = insertedRow
      ? {
          id: insertedRow.id,
          title: insertedRow.title,
          status: insertedRow.status || 'todo',
          projectId: insertedRow.project_id,
          projectName: insertedRow.projects?.[0]?.name ?? 'Project',
          dueDate: insertedRow.due_date || insertedRow.projects?.[0]?.due_date || null,
          assignee: firstAssignee,
        }
      : null;

    return NextResponse.json({ task: shaped }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
