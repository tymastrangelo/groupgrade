'use client';

import DashboardLayout from '@/components/DashboardLayout';
import GroupAnalyticsView from '@/components/GroupAnalyticsView';

export default function TeacherAnalyticsPage() {
  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Group Analytics">
      <GroupAnalyticsView />
    </DashboardLayout>
  );
}
