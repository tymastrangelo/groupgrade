import DashboardLayout from '@/components/DashboardLayout';
import { ComingSoon } from '@/components/ComingSoon';

export default function StudentCalendarPage() {
  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Calendar">
      <div className="p-8">
        <ComingSoon title="Calendar" description="Assignments and events will show up here soon." />
      </div>
    </DashboardLayout>
  );
}
