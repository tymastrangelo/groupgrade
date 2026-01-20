import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import DashboardLayout from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const overrideRole = as;

  const session = await getServerSession(authOptions);

  console.log('[Dashboard] Session:', session ? 'exists' : 'missing');

  if (!session?.user?.email) {
    console.log('[Dashboard] Redirecting to signin - no valid session');
    redirect('/auth/signin');
  }

  // Developer override for testing: /dashboard?as=teacher or ?as=student
  if (overrideRole === 'teacher' || overrideRole === 'student') {
    return <DashboardLayout initialRole={overrideRole} />;
  }

  // Check if user has completed the survey
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', session.user.email)
    .maybeSingle();

  const normalizedRole = user?.role === 'professor' ? 'teacher' : user?.role;

  // Role-based routing
  if (!user || !normalizedRole) {
    redirect('/role');
  }

  if (normalizedRole === 'teacher') {
    redirect('/teacher');
  }

  if (normalizedRole === 'student') {
    // Enforce survey completion before allowing student home
    const { data: survey } = await supabase
      .from('student_strengths')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!survey) {
      redirect('/survey');
    }

    redirect('/student');
  }

  // Fallback
  return <DashboardLayout />;
}
