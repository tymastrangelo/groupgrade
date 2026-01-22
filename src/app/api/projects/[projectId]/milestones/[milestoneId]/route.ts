import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, milestoneId } = await context.params;
  const body = await req.json();
  const { name, due_date, requirements, order_index } = body;

  try {
    // Verify user is professor
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
      .select('class_id')
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
      return NextResponse.json({ error: 'Only professors can edit milestones' }, { status: 403 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (due_date !== undefined) updates.due_date = due_date;
    if (requirements !== undefined) updates.requirements = requirements?.trim() || null;
    if (order_index !== undefined) updates.order_index = order_index;

    const { data: milestone, error } = await supabase
      .from('project_milestones')
      .update(updates)
      .eq('id', milestoneId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ milestone });
  } catch (error: any) {
    console.error('Error updating milestone:', error);
    return NextResponse.json({ error: error.message || 'Failed to update milestone' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, milestoneId } = await context.params;

  try {
    // Verify user is professor
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
      .select('class_id')
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
      return NextResponse.json({ error: 'Only professors can delete milestones' }, { status: 403 });
    }

    const { error } = await supabase
      .from('project_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('project_id', projectId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete milestone' }, { status: 500 });
  }
}
