export const dynamic = 'force-dynamic';
export const revalidate = 0;

import DashboardLayout from '@/components/DashboardLayout';
import { TeacherClassDetail } from '@/components/TeacherClassDetail';

export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Class">
      <TeacherClassDetail classId={id} />
    </DashboardLayout>
  );
}
