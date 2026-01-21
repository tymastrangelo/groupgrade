import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isUuid(id: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);
}

function groupName(idx: number) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (idx < letters.length) return `Group ${letters[idx]}`;
  return `Group ${idx + 1}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; projectId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mode, groups: manualGroups = [], group_size: groupSizeRaw } = body || {};
    const { id: classId, projectId } = await params;
    if (!classId || !projectId || !isUuid(classId) || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
    }
    if (mode !== 'auto' && mode !== 'manual') {
      return NextResponse.json({ error: 'Mode must be auto or manual' }, { status: 400 });
    }

    // Auth and ownership
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
    if (cls.professor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, class_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) throw new Error(projErr.message);
    if (!project || project.class_id !== classId) return NextResponse.json({ error: 'Project not found for class' }, { status: 404 });

    // existing groups cleanup
    const { data: existingGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('project_id', projectId);
    const existingIds = (existingGroups || []).map((g) => g.id);
    if (existingIds.length) {
      await supabase.from('group_members').delete().in('group_id', existingIds);
      await supabase.from('groups').delete().in('id', existingIds);
    }

    // fetch class students list
    const { data: studentRows, error: stuErr } = await supabase
      .from('class_members')
      .select('user_id, role, users(name, email)')
      .eq('class_id', classId)
      .eq('role', 'student');
    if (stuErr) throw new Error(stuErr.message);

    const studentIds = (studentRows || []).map((row: any) => row.user_id);
    const strengthById: Record<string, { research: number; writing: number; design: number; technical: number }> = {};
    if (studentIds.length) {
      const { data: strengthRows, error: strErr } = await supabase
        .from('student_strengths')
        .select('user_id, research_rating, writing_rating, design_rating, technical_rating')
        .in('user_id', studentIds);
      if (strErr) {
        console.warn('Strength fetch skipped', strErr.message);
      } else {
        (strengthRows || []).forEach((s: any) => {
          strengthById[s.user_id] = {
            research: s.research_rating ?? 0,
            writing: s.writing_rating ?? 0,
            design: s.design_rating ?? 0,
            technical: s.technical_rating ?? 0,
          };
        });
      }
    }

    const students = (studentRows || []).map((row: any) => ({
      id: row.user_id,
      name: row.users?.name || 'Student',
      email: row.users?.email || '',
      strengths: strengthById[row.user_id] || { research: 0, writing: 0, design: 0, technical: 0 },
    }));

    if (students.length === 0) {
      return NextResponse.json({ error: 'No students to group' }, { status: 400 });
    }

    let groupsToInsert: { name: string; members: string[] }[] = [];

    if (mode === 'manual') {
      const validIds = new Set(students.map((s) => s.id));
      for (const g of manualGroups) {
        if (!g?.name || !Array.isArray(g.member_ids)) continue;
        const filtered = g.member_ids.filter((id: string) => validIds.has(id));
        if (filtered.length === 0) continue;
        groupsToInsert.push({ name: g.name, members: filtered });
      }
      if (groupsToInsert.length === 0) {
        return NextResponse.json({ error: 'No valid groups provided' }, { status: 400 });
      }
    } else {
      const size = Math.max(2, Math.min(6, Number(groupSizeRaw) || 3));
      const ranked = students
        .map((s) => ({
          ...s,
          score: s.strengths.research + s.strengths.writing + s.strengths.design + s.strengths.technical,
        }))
        .sort((a, b) => b.score - a.score);
      const groupCount = Math.max(1, Math.ceil(ranked.length / size));
      const buckets: string[] = Array.from({ length: groupCount }, () => []);
      ranked.forEach((s, idx) => {
        buckets[idx % groupCount].push(s.id);
      });
      groupsToInsert = buckets.map((members, idx) => ({ name: groupName(idx), members }));
    }

    const groupPayload = groupsToInsert.map((g) => ({ name: g.name, project_id: projectId }));
    const { data: createdGroups, error: insertGroupsErr } = await supabase
      .from('groups')
      .insert(groupPayload)
      .select('id, name')
      .order('name');
    if (insertGroupsErr) throw new Error(insertGroupsErr.message);

    const groupIdByName = new Map<string, string>();
    (createdGroups || []).forEach((g) => groupIdByName.set(g.name, g.id));

    const memberPayload: { group_id: string; user_id: string }[] = [];
    groupsToInsert.forEach((g) => {
      const gid = groupIdByName.get(g.name);
      if (!gid) return;
      g.members.forEach((mid) => memberPayload.push({ group_id: gid, user_id: mid }));
    });

    if (memberPayload.length) {
      const { error: insertMembersErr } = await supabase.from('group_members').insert(memberPayload);
      if (insertMembersErr) throw new Error(insertMembersErr.message);
    }

    // Fetch groups with members to return
    const { data: finalGroups, error: finalErr } = await supabase
      .from('groups')
      .select('id, name, group_members(user_id, users(name, email, avatar_url))')
      .eq('project_id', projectId)
      .order('name');
    if (finalErr) throw new Error(finalErr.message);

    const shaped = (finalGroups || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      members: (g.group_members || []).map((m: any) => ({
        id: m.user_id,
        name: m.users?.name || 'Student',
        email: m.users?.email || '',
        avatar_url: m.users?.avatar_url || null,
      })),
    }));

    return NextResponse.json({ groups: shaped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
