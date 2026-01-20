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

    const nowIso = new Date().toISOString();
    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('id, name, code, join_code_expires_at, professor_id')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle();

    if (clsError) throw new Error(clsError.message);
    if (!cls) return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
    if (cls.join_code_expires_at && cls.join_code_expires_at < nowIso) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    const { error: upsertError } = await supabase
      .from('class_members')
      .upsert({ class_id: cls.id, user_id: user.id, role: 'student' });

    if (upsertError) throw new Error(upsertError.message);

    return NextResponse.json({ class: cls });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
