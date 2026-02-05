export const dynamic = 'force-dynamic';
export const revalidate = 0;

import DashboardLayout from '@/components/DashboardLayout';
import { TeacherClassDetail } from '@/components/TeacherClassDetail';

export default async function TeacherClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = (await searchParams) || {};
  const embed = sp.embed === "groups";

  if (embed) {
    return <TeacherClassDetail classId={id} embeddedGroups={true} />;
  }

  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Class">
      <TeacherClassDetail classId={id} />
    </DashboardLayout>
  );
}
