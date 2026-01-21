import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';
import { getRandomAvatarUrl } from '@/lib/avatars';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isUuid(id: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5]{3}-[89abAB]{3}-[0-9a-fA-F]{12}$/.test(id);
}

function randomString(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function randomRating() {
  // 0-5 inclusive, bias slightly toward mid values
  const vals = [0, 1, 2, 3, 3, 4, 5];
  return vals[Math.floor(Math.random() * vals.length)];
}

async function ensureProfessor(userEmail: string, classId: string) {
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', userEmail)
    .maybeSingle();
  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error('User not found');

  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('professor_id')
    .eq('id', classId)
    .maybeSingle();
  if (clsErr) throw new Error(clsErr.message);
  if (!cls) throw new Error('Class not found');
  if (cls.professor_id !== user.id) throw new Error('Forbidden');
  return user.id;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: classId } = await params;
    if (!classId || !isUuid(classId)) {
      return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });
    }

    // Only professor of this class can add mock members
    await ensureProfessor(session.user.email, classId);

    // Generate unique mock user
    let insertedUserId: string | null = null;
    let attempts = 0;
    while (!insertedUserId && attempts < 5) {
      const email = `mock_${randomString(6)}@example.com`;
      const name = `Mock Student ${randomString(3)}`;
      const { data: user, error: insertErr } = await supabase
        .from('users')
        .insert({ email, name, role: 'student', avatar_url: getRandomAvatarUrl() })
        .select('id')
        .single();
      if (insertErr) {
        // if unique violation, try again
        attempts += 1;
        continue;
      }
      insertedUserId = user?.id ?? null;
    }

    if (!insertedUserId) {
      return NextResponse.json({ error: 'Could not create mock user' }, { status: 500 });
    }

    const { error: memberErr, data: member } = await supabase
      .from('class_members')
      .insert({ class_id: classId, user_id: insertedUserId, role: 'student' })
      .select('user_id')
      .single();
    if (memberErr) throw new Error(memberErr.message);

    // Seed strengths so grouping logic can use them
    const { error: strengthErr } = await supabase.from('student_strengths').insert({
      user_id: insertedUserId,
      research_rating: randomRating(),
      writing_rating: randomRating(),
      design_rating: randomRating(),
      technical_rating: randomRating(),
    });
    if (strengthErr) {
      console.warn('Could not seed strengths for mock user', strengthErr.message);
    }

    return NextResponse.json({ ok: true, user_id: member.user_id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
