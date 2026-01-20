export const dynamic = 'force-dynamic';
export const revalidate = 0;

import DashboardLayout from '@/components/DashboardLayout';
import { TeacherContent } from '@/components/TeacherContent';

export default function TeacherClassesPage() {
  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Your Classes">
      <TeacherContent />
    </DashboardLayout>
  );
}
