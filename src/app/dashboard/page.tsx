import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic'; // Ensure this page is never cached

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  // Redirect to signin if no session
  if (!session || !session.user) {
    redirect('/auth/signin');
  }

  return <DashboardLayout />;
}
