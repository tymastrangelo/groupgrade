import DashboardLayout from '@/components/DashboardLayout';
import { ComingSoon } from '@/components/ComingSoon';

export default function TeacherAnalyticsPage() {
  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Analytics">
      <div className="p-8">
        <ComingSoon title="Analytics" description="Dashboards and reports will land here soon." />
      </div>
    </DashboardLayout>
  );
}
