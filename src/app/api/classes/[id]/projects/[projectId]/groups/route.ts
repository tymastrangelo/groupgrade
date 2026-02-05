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

const GROUP_NAME_ADJECTIVES = [
  "Brisk",
  "Bright",
  "Clever",
  "Curious",
  "Daring",
  "Electric",
  "Epic",
  "Fearless",
  "Golden",
  "Happy",
  "Lively",
  "Mighty",
  "Nimble",
  "Quantum",
  "Rapid",
  "Stellar",
  "Sunny",
  "Swift",
  "Vivid",
  "Zen",
];

const GROUP_NAME_NOUNS = [
  "Comets",
  "Creators",
  "Dragons",
  "Explorers",
  "Falcons",
  "Foxes",
  "Inventors",
  "Knights",
  "Lions",
  "Pioneers",
  "Rangers",
  "Rockets",
  "Scholars",
  "Storm",
  "Trailblazers",
  "Voyagers",
  "Wolves",
  "Wizards",
  "Zephyrs",
];

function randomGroupName(existing: Set<string>) {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  let name = `${pick(GROUP_NAME_ADJECTIVES)} ${pick(GROUP_NAME_NOUNS)}`;
  let counter = 2;
  while (existing.has(name)) {
    name = `${name} ${counter}`;
    counter += 1;
  }
  existing.add(name);
  return name;
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

    // Get existing groups - we'll update memberships rather than delete groups to preserve deliverables
    const { data: existingGroups } = await supabase
      .from('groups')
      .select('id, name')
      .eq('project_id', projectId);
    const existingGroupsById = new Map((existingGroups || []).map(g => [g.id, g]));
    const existingNames = new Set((existingGroups || []).map(g => g.name));
    const existingIds = (existingGroups || []).map((g) => g.id);

    // Only clear memberships, not the groups themselves
    if (existingIds.length) {
      await supabase.from('group_members').delete().in('group_id', existingIds);
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

    let groupsToInsert: { id?: string; name: string; members: string[] }[] = [];

    if (mode === 'manual') {
      const validIds = new Set(students.map((s) => s.id));
      for (const [idx, g] of manualGroups.entries()) {
        if (!g) continue;
        const name = g.name || randomGroupName(existingNames);
        const filtered = Array.isArray(g.member_ids)
          ? g.member_ids.filter((id: string) => validIds.has(id))
          : [];
        const id = g.id && isUuid(g.id) ? g.id : undefined;
        groupsToInsert.push({ id, name, members: filtered });
      }
      if (groupsToInsert.length === 0) {
        return NextResponse.json({ error: 'No groups provided' }, { status: 400 });
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
      groupsToInsert = buckets.map((members) => ({ name: randomGroupName(existingNames), members }));
    }

    // Reuse existing groups or create new ones
    const groupIdByKey = new Map<string, string>();
    const groupNameByKey = new Map<string, string>();
    const usedGroupIds = new Set<string>();
    const newGroupsToCreate: { name: string; project_id: string }[] = [];

    const reserveUniqueName = (base: string) => {
      let name = base;
      let counter = 2;
      while (existingNames.has(name) || newGroupsToCreate.some((g) => g.name === name)) {
        name = `${base} (${counter})`;
        counter += 1;
      }
      existingNames.add(name);
      return name;
    };

    const groupsToRename: { id: string; name: string }[] = [];

    groupsToInsert.forEach((g, idx) => {
      const key = g.id || `new-${idx}`;
      if (g.id && existingGroupsById.has(g.id)) {
        groupIdByKey.set(key, g.id);
        usedGroupIds.add(g.id);
        groupNameByKey.set(key, g.name);
        const existing = existingGroupsById.get(g.id);
        if (existing && existing.name !== g.name) {
          groupsToRename.push({ id: g.id, name: g.name });
        }
        return;
      }

      const uniqueName = reserveUniqueName(g.name);
      newGroupsToCreate.push({ name: uniqueName, project_id: projectId });
      groupNameByKey.set(key, uniqueName);
    });

    // Create only the new groups that don't exist
    if (newGroupsToCreate.length > 0) {
      const { data: createdGroups, error: insertGroupsErr } = await supabase
        .from('groups')
        .insert(newGroupsToCreate)
        .select('id, name');
      if (insertGroupsErr) throw new Error(insertGroupsErr.message);
      (createdGroups || []).forEach((g) => {
        groupIdByKey.set(g.name, g.id);
        usedGroupIds.add(g.id);
      });
    }

    if (groupsToRename.length > 0) {
      await Promise.all(
        groupsToRename.map((g) =>
          supabase.from('groups').update({ name: g.name }).eq('id', g.id)
        )
      );
    }

    const memberPayload: { group_id: string; user_id: string }[] = [];
    groupsToInsert.forEach((g, idx) => {
      const key = g.id || `new-${idx}`;
      const resolvedName = groupNameByKey.get(key) || g.name;
      const gid = groupIdByKey.get(g.id || resolvedName);
      if (!gid) return;
      g.members.forEach((mid) => memberPayload.push({ group_id: gid, user_id: mid }));
    });

    if (memberPayload.length) {
      const { error: insertMembersErr } = await supabase.from('group_members').insert(memberPayload);
      if (insertMembersErr) throw new Error(insertMembersErr.message);
    }

    // Clean up unused groups that have no deliverables, meetings, or other data
    const unusedGroupIds = existingIds.filter(id => !usedGroupIds.has(id));
    if (unusedGroupIds.length > 0) {
      // Check if any of these groups have deliverables, meetings, or collaboration links
      const [deliverables, meetings, links] = await Promise.all([
        supabase.from('deliverables').select('group_id').in('group_id', unusedGroupIds),
        supabase.from('group_meetings').select('group_id').in('group_id', unusedGroupIds),
        supabase.from('collaboration_links').select('group_id').in('group_id', unusedGroupIds),
      ]);

      const groupsWithData = new Set([
        ...(deliverables.data || []).map(d => d.group_id),
        ...(meetings.data || []).map(m => m.group_id),
        ...(links.data || []).map(l => l.group_id),
      ]);

      // Only delete groups that have no associated data
      const safeToDelete = unusedGroupIds.filter(id => !groupsWithData.has(id));
      if (safeToDelete.length > 0) {
        await supabase.from('groups').delete().in('id', safeToDelete);
      }
    }

    // Fetch groups with members to return
    const { data: finalGroups, error: finalErr } = await supabase
      .from('groups')
      .select('id, name, group_members(user_id, users(name, email, avatar_url, last_active))')
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
        last_active: m.users?.last_active || null,
      })),
    }));

    return NextResponse.json({ groups: shaped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

// PATCH - Update group membership without destroying groups (preserves deliverables, meetings, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; projectId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, groupId, userId, targetGroupId } = body || {};
    const { id: classId, projectId } = await params;

    if (!classId || !projectId || !isUuid(classId) || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
    }

    // Auth check
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

    // Verify project belongs to class
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, class_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) throw new Error(projErr.message);
    if (!project || project.class_id !== classId) {
      return NextResponse.json({ error: 'Project not found for class' }, { status: 404 });
    }

    if (action === 'add_member') {
      // Add a user to a group
      if (!groupId || !userId || !isUuid(groupId) || !isUuid(userId)) {
        return NextResponse.json({ error: 'groupId and userId required' }, { status: 400 });
      }

      // Verify group belongs to project
      const { data: group } = await supabase
        .from('groups')
        .select('id')
        .eq('id', groupId)
        .eq('project_id', projectId)
        .maybeSingle();
      if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

      // Remove from any existing group in this project first
      const { data: existingGroups } = await supabase
        .from('groups')
        .select('id')
        .eq('project_id', projectId);
      const groupIds = (existingGroups || []).map(g => g.id);
      if (groupIds.length > 0) {
        await supabase
          .from('group_members')
          .delete()
          .eq('user_id', userId)
          .in('group_id', groupIds);
      }

      // Add to target group
      const { error: insertErr } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: userId });
      if (insertErr) throw new Error(insertErr.message);

    } else if (action === 'remove_member') {
      // Remove a user from a group
      if (!groupId || !userId || !isUuid(groupId) || !isUuid(userId)) {
        return NextResponse.json({ error: 'groupId and userId required' }, { status: 400 });
      }

      const { error: deleteErr } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (deleteErr) throw new Error(deleteErr.message);

      // Unassign any deliverables assigned to this user in this group
      await supabase
        .from('deliverables')
        .update({ assigned_to: null })
        .eq('group_id', groupId)
        .eq('assigned_to', userId);

    } else if (action === 'move_member') {
      // Move a user from one group to another
      if (!groupId || !targetGroupId || !userId || !isUuid(groupId) || !isUuid(targetGroupId) || !isUuid(userId)) {
        return NextResponse.json({ error: 'groupId, targetGroupId, and userId required' }, { status: 400 });
      }

      // Verify both groups belong to project
      const { data: sourceGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('id', groupId)
        .eq('project_id', projectId)
        .maybeSingle();
      const { data: targetGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('id', targetGroupId)
        .eq('project_id', projectId)
        .maybeSingle();
      if (!sourceGroup || !targetGroup) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      // Remove from source group
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      // Unassign deliverables from old group
      await supabase
        .from('deliverables')
        .update({ assigned_to: null })
        .eq('group_id', groupId)
        .eq('assigned_to', userId);

      // Add to target group
      const { error: insertErr } = await supabase
        .from('group_members')
        .insert({ group_id: targetGroupId, user_id: userId });
      if (insertErr) throw new Error(insertErr.message);

    } else {
      return NextResponse.json({ error: 'Invalid action. Use add_member, remove_member, or move_member' }, { status: 400 });
    }

    // Return updated groups
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
