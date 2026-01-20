export const dynamic = 'force-dynamic';
export const revalidate = 0;

import DashboardLayout from '@/components/DashboardLayout';

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const overrideRole = as === 'teacher' ? 'teacher' : 'student';
  return <DashboardLayout initialRole={overrideRole} />;
}
