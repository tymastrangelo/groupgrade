'use client';

import DashboardLayout from '@/components/DashboardLayout';
import TeacherStudentsView from '@/components/TeacherStudentsView';

export default function TeacherStudentsPage() {
  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Students">
      <TeacherStudentsView />
    </DashboardLayout>
  );
}
