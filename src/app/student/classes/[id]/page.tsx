export const dynamic = 'force-dynamic';
export const revalidate = 0;

import DashboardLayout from '@/components/DashboardLayout';
import { StudentClassDetail } from '@/components/StudentClassDetail';

export default async function StudentClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Class">
      <StudentClassDetail classId={id} />
    </DashboardLayout>
  );
}
