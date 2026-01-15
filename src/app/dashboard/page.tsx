import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
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

  return <DashboardLayout />;
}
