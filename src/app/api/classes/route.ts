import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(session.user.email);
    if (user.normalizedRole === 'teacher') {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, join_code_expires_at, created_at')
        .eq('professor_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return NextResponse.json({ classes: data || [] });
    }

    if (user.normalizedRole === 'student') {
      const { data, error } = await supabase
        .from('class_members')
        .select('classes(id, name, code, join_code_expires_at, created_at)')
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
      const classes = (data || []).map((d: any) => d.classes).filter(Boolean);
      return NextResponse.json({ classes });
    }

    return NextResponse.json({ error: 'Role required' }, { status: 403 });
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
    if (user.normalizedRole !== 'teacher') {
      return NextResponse.json({ error: 'Only professors can create classes' }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name,
        code,
        join_code_expires_at: expires,
        professor_id: user.id,
      })
      .select('id, name, code, join_code_expires_at, created_at')
      .single();

    if (error) throw new Error(error.message);

    // ensure membership for professor
    await supabase
      .from('class_members')
      .upsert({ class_id: data.id, user_id: user.id, role: 'professor' });

    return NextResponse.json({ class: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
