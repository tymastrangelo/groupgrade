import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// PATCH - Update a personal task
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const taskId = params.id;
    const body = await req.json();
    const { title, status, dueDate } = body;

    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userErr) throw new Error(userErr.message);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify task ownership
    const { data: existingTask, error: checkErr } = await supabaseAdmin
      .from('tasks')
      .select('id, assigned_to')
      .eq('id', taskId)
      .single();

    if (checkErr) throw new Error(checkErr.message);
    if (!existingTask || existingTask.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
    if (dueDate !== undefined) updates.due_date = dueDate;

    const { data: updatedTask, error: updateErr } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // Fetch project name if applicable
    let projectName = null;
    if (updatedTask.project_id) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('name')
        .eq('id', updatedTask.project_id)
        .single();
      projectName = project?.name || null;
    }

    // Format due_date to ISO string for consistent parsing
    let formattedDueDate = null;
    if (updatedTask.due_date) {
      const dateObj = new Date(updatedTask.due_date);
      formattedDueDate = dateObj.toISOString();
    }

    return NextResponse.json({
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        status: updatedTask.status,
        dueDate: formattedDueDate,
        projectId: updatedTask.project_id,
        projectName,
      },
    });
  } catch (e: any) {
    console.error('PATCH /api/user/tasks/[id] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

// DELETE - Remove a personal task
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const taskId = params.id;

    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userErr) throw new Error(userErr.message);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify task ownership before deleting
    const { data: existingTask, error: checkErr } = await supabaseAdmin
      .from('tasks')
      .select('id, assigned_to')
      .eq('id', taskId)
      .single();

    if (checkErr) throw new Error(checkErr.message);
    if (!existingTask || existingTask.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteErr) throw new Error(deleteErr.message);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /api/user/tasks/[id] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
