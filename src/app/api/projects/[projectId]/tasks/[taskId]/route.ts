import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function isUuid(id: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);
}

const VALID_STATUSES = new Set(['todo', 'in_progress', 'submitted', 'done']);

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { projectId, taskId } = await params;

  if (!projectId || !isUuid(projectId) || !taskId || !isUuid(taskId)) {
    return NextResponse.json({ error: 'Invalid project or task id' }, { status: 400 });
  }

  const viewer = await getViewer(session?.user?.email || undefined);
  if ('error' in viewer) return NextResponse.json({ error: viewer.error }, { status: viewer.status });

  const access = await ensureProjectAccess(projectId, viewer.user.id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const status = body?.status;

  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    const { error: updateErr } = await supabaseAdmin
      .from('project_tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('project_id', projectId);

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { projectId, taskId } = await params;

  if (!projectId || !isUuid(projectId) || !taskId || !isUuid(taskId)) {
    return NextResponse.json({ error: 'Invalid project or task id' }, { status: 400 });
  }

  const viewer = await getViewer(session?.user?.email || undefined);
  if ('error' in viewer) return NextResponse.json({ error: viewer.error }, { status: viewer.status });

  const access = await ensureProjectAccess(projectId, viewer.user.id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    // Delete assignees first (foreign key constraint)
    await supabaseAdmin
      .from('project_task_assignees')
      .delete()
      .eq('task_id', taskId);

    // Then delete the task
    const { error: deleteErr } = await supabaseAdmin
      .from('project_tasks')
      .delete()
      .eq('id', taskId)
      .eq('project_id', projectId);

    if (deleteErr) throw new Error(deleteErr.message);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
