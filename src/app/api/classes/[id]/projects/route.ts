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

async function getCurrentUser(sessionEmail: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', sessionEmail)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!user) throw new Error('User not found');
  return { ...user, normalizedRole: user.role === 'professor' ? 'teacher' : 'student' };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await getCurrentUser(session.user.email);
    const { id: classId } = await params;
    if (!classId || !isUuid(classId)) return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });

    const { data: membership } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle();
    const { data: cls } = await supabase
      .from('classes')
      .select('professor_id')
      .eq('id', classId)
      .maybeSingle();
    const isOwner = cls?.professor_id === user.id;
    if (!isOwner && !membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, rubric, due_date, rubric_file_url')
      .eq('class_id', classId)
      .order('due_date', { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ projects: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await getCurrentUser(session.user.email);
    const { id: classId } = await params;
    if (!classId || !isUuid(classId)) return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });

    // Parse FormData
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const due_date = formData.get('due_date') as string | null;
    const assignment_mode = formData.get('assignment_mode') as string;
    const grouping_strategy = formData.get('grouping_strategy') as string;
    const description = formData.get('description') as string | null;
    const rubric_text = formData.get('rubric_text') as string | null;
    const expectations = formData.get('expectations') as string | null;
    const deliverablesJson = formData.get('deliverables') as string | null;
    const rubric_file = formData.get('rubric_file') as File | null;
    
    const deliverables = deliverablesJson ? JSON.parse(deliverablesJson) : [];
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Only professor can create projects
    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('professor_id')
      .eq('id', classId)
      .maybeSingle();
    if (clsError) throw new Error(clsError.message);
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    if (cls.professor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rubricPayload: Record<string, any> = {
      assignment_mode: assignment_mode || 'teacher_assigns',
      grouping_strategy: grouping_strategy || 'manual',
    };

    if (rubric_text) rubricPayload.rubric_text = rubric_text;

    // Handle deliverables - convert array to newline-separated string for storage
    let deliverablesStr = null;
    if (Array.isArray(deliverables) && deliverables.length > 0) {
      deliverablesStr = deliverables.filter((d: any) => typeof d === 'string' && d.trim()).join('\n');
    }

    console.log('[Projects API] Inserting due_date:', due_date);
    
    // Upload rubric file to Supabase Storage if provided
    let rubricFileUrl = null;
    if (rubric_file && rubric_file.size > 0) {
      const fileExt = rubric_file.name.split('.').pop();
      const fileName = `${classId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
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
      
      rubricFileUrl = urlData.publicUrl;
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        class_id: classId,
        name: name.trim(),
        due_date: due_date || null,
        description: description || null,
        expectations: expectations || null,
        deliverables: deliverablesStr,
        rubric: JSON.stringify(rubricPayload),
        rubric_file_url: rubricFileUrl,
      })
      .select('id, name, rubric, due_date, description, expectations, deliverables, rubric_file_url')
      .single();
    
    console.log('[Projects API] Supabase returned due_date:', data?.due_date);
    console.log('[Projects API] Full data:', data);
    
    if (error) throw new Error(error.message);

    return NextResponse.json({ project: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
