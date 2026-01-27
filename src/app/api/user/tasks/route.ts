import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch all personal tasks for logged-in user
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userErr) throw new Error(userErr.message);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: tasks, error: taskErr } = await supabaseAdmin
      .from('tasks')
      .select('id, title, status, due_date, project_id')
      .eq('assigned_to', user.id)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (taskErr) throw new Error(taskErr.message);

    // Fetch project names for tasks that have project_id
    const projectIds = (tasks || []).filter((t: any) => t.project_id).map((t: any) => t.project_id);
    let projectMap: Record<string, string> = {};
    
    if (projectIds.length > 0) {
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      
      if (projects) {
        projectMap = projects.reduce((acc: any, p: any) => {
          acc[p.id] = p.name;
          return acc;
        }, {});
      }
    }

    const shaped = (tasks || []).map((t: any) => {
      // Format due_date to full ISO string for consistent parsing
      let formattedDueDate = null;
      if (t.due_date) {
        const dateObj = new Date(t.due_date);
        formattedDueDate = dateObj.toISOString();
      }
      return {
        id: t.id,
        title: t.title,
        status: t.status || 'todo',
        dueDate: formattedDueDate,
        projectId: t.project_id,
        projectName: t.project_id ? projectMap[t.project_id] : null,
      };
    });

    return NextResponse.json({ tasks: shaped });
  } catch (e: any) {
    console.error('GET /api/user/tasks error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

// POST - Create a new personal task
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, dueDate, status, projectId } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userErr) throw new Error(userErr.message);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: newTask, error: insertErr } = await supabaseAdmin
      .from('tasks')
      .insert({
        title,
        assigned_to: user.id,
        status: status || 'todo',
        due_date: dueDate || null,
        project_id: projectId || null,
      })
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);

    // Fetch project name if applicable
    let projectName = null;
    if (newTask.project_id) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('name')
        .eq('id', newTask.project_id)
        .single();
      projectName = project?.name || null;
    }

    // Format due_date to ISO string for consistent parsing
    let formattedDueDate = null;
    if (newTask.due_date) {
      const dateObj = new Date(newTask.due_date);
      formattedDueDate = dateObj.toISOString();
    }

    return NextResponse.json({
      task: {
        id: newTask.id,
        title: newTask.title,
        status: newTask.status,
        dueDate: formattedDueDate,
        projectId: newTask.project_id,
        projectName,
      },
    });
  } catch (e: any) {
    console.error('POST /api/user/tasks error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
