export const dynamic = 'force-dynamic';
export const revalidate = 0;

import DashboardLayout from '@/components/DashboardLayout';

export default async function TeacherHome({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const overrideRole = as === 'student' ? 'student' : 'teacher';
  return <DashboardLayout initialRole={overrideRole} />;
}
