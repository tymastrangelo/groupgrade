import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getCurrentUser(sessionEmail: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', sessionEmail)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!user) throw new Error('User not found');
  return { ...user, normalizedRole: user.role === 'professor' ? 'teacher' : user.role };
}

async function getClassByCode(rawCode: string, userId?: string) {
  const code = rawCode.trim().toUpperCase();
  const nowIso = new Date().toISOString();

  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .select('id, name, code, join_code_expires_at, professor_id, created_at')
    .eq('code', code)
    .maybeSingle();

  if (clsError) throw new Error(clsError.message);
  if (!cls) return { status: 404, error: 'Invalid code' } as const;
  if (cls.join_code_expires_at && cls.join_code_expires_at < nowIso) {
    return { status: 400, error: 'Code expired' } as const;
  }

  const { data: professor } = await supabase
    .from('users')
    .select('name')
    .eq('id', cls.professor_id)
    .maybeSingle();

  const { count: memberCount } = await supabase
    .from('class_members')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', cls.id);

  let alreadyMember = false;
  if (userId) {
    const { data: membership } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', cls.id)
      .eq('user_id', userId)
      .maybeSingle();
    alreadyMember = !!membership;
  }

  return {
    status: 200,
    class: {
      ...cls,
      professor_name: professor?.name ?? 'Professor',
      member_count: memberCount ?? 0,
      already_member: alreadyMember,
    },
  } as const;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(session.user.email);
    if (user.normalizedRole !== 'student') {
      return NextResponse.json({ error: 'Only students can preview codes' }, { status: 403 });
    }

    const code = req.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const result = await getClassByCode(code, user.id);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ class: result.class });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(session.user.email);
    if (user.normalizedRole !== 'student') {
      return NextResponse.json({ error: 'Only students can join via code' }, { status: 403 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const result = await getClassByCode(code, user.id);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (result.class.already_member) {
      return NextResponse.json({ error: 'You are already in this class' }, { status: 400 });
    }

    const { error: upsertError } = await supabase
      .from('class_members')
      .upsert({ class_id: result.class.id, user_id: user.id, role: 'student' });

    if (upsertError) throw new Error(upsertError.message);

    return NextResponse.json({ class: result.class });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
