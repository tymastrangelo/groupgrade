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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId } = await params;
    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .maybeSingle();
    if (userErr) throw new Error(userErr.message);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select(
        `id, name, rubric, due_date, class_id, description, expectations, deliverables, rubric_file_url, created_at, updated_at,
         classes:class_id(id, name, professor_id),
         groups(id, name, group_members(user_id, users(name, email, avatar_url)))`
      )
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) throw new Error(projErr.message);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const classId = project.class_id;
    const professorId = (project as any).classes?.professor_id;

    const { data: membership } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (professorId !== user.id && !membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shapedGroups = (project.groups || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      members: (g.group_members || []).map((m: any) => ({
        id: m.user_id,
        name: m.users?.name || 'Student',
        email: m.users?.email || '',
        avatar_url: m.users?.avatar_url || null,
      })),
    }));

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        rubric: project.rubric,
        due_date: project.due_date,
        class_id: classId,
        class_name: project.classes?.name ?? 'Class',
        description: project.description,
        expectations: project.expectations,
        deliverables: project.deliverables,
        rubric_file_url: project.rubric_file_url,
        created_at: project.created_at,
        updated_at: project.updated_at,
        is_professor: professorId === user.id,
        groups: shapedGroups,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId } = await params;
    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .maybeSingle();
    if (userErr) throw new Error(userErr.message);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, class_id, classes:class_id(professor_id)')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) throw new Error(projErr.message);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const professorId = (project as any).classes?.professor_id;
    if (professorId !== user.id) {
      return NextResponse.json({ error: 'Only the professor can edit this project' }, { status: 403 });
    }

    // Parse FormData
    const formData = await req.formData();
    const updates: any = { updated_at: new Date().toISOString() };

    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;
    const expectations = formData.get('expectations') as string | null;
    const deliverables = formData.get('deliverables') as string | null;
    const due_date = formData.get('due_date') as string | null;
    const rubric_file = formData.get('rubric_file') as File | null;

    if (name !== null) updates.name = name;
    if (description !== null) updates.description = description;
    if (expectations !== null) updates.expectations = expectations;
    if (deliverables !== null) updates.deliverables = deliverables;
    if (due_date !== null) updates.due_date = due_date;
    
    // Upload new rubric file if provided
    if (rubric_file && rubric_file.size > 0) {
      const fileExt = rubric_file.name.split('.').pop();
      const fileName = `${project.class_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const fileBuffer = await rubric_file.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rubric')
        .upload(fileName, fileBuffer, {
          contentType: rubric_file.type,
          upsert: false,
        });
      
      if (uploadError) {
        console.error('[Projects API] File upload error:', uploadError);
        throw new Error('Failed to upload rubric file');
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('rubric')
        .getPublicUrl(fileName);
      
      updates.rubric_file_url = urlData.publicUrl;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select('id, name, description, expectations, deliverables, rubric, due_date, rubric_file_url, updated_at')
      .single();

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ project: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
