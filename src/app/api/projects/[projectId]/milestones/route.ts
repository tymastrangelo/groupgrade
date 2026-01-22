import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;

  try {
    const { data: milestones, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return NextResponse.json({ milestones: milestones || [] });
  } catch (error: any) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch milestones' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const body = await req.json();
  const { name, due_date, requirements, order_index } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    // Verify user is professor for this project
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, class_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', project.class_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'professor') {
      return NextResponse.json({ error: 'Only professors can create milestones' }, { status: 403 });
    }

    // Get the next order index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined) {
      const { data: existing } = await supabase
        .from('project_milestones')
        .select('order_index')
        .eq('project_id', projectId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      finalOrderIndex = existing ? existing.order_index + 1 : 0;
    }

    const { data: milestone, error } = await supabase
      .from('project_milestones')
      .insert({
        project_id: projectId,
        name: name.trim(),
        due_date: due_date || null,
        requirements: requirements?.trim() || null,
        order_index: finalOrderIndex,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ milestone });
  } catch (error: any) {
    console.error('Error creating milestone:', error);
    return NextResponse.json({ error: error.message || 'Failed to create milestone' }, { status: 500 });
  }
}
