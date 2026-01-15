import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import DashboardLayout from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  console.log('[Dashboard] Session:', session ? 'exists' : 'missing');

  if (!session?.user?.email) {
    console.log('[Dashboard] Redirecting to signin - no valid session');
    redirect('/auth/signin');
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
    .single();

  if (user && user.role === 'student') {
    const { data: survey } = await supabase
      .from('student_strengths')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // If student hasn't completed survey, redirect to survey
    if (!survey) {
      redirect('/survey');
    }
  }

  return <DashboardLayout />;
}
