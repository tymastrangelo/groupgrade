import DashboardLayout from '@/components/DashboardLayout';
import { ComingSoon } from '@/components/ComingSoon';

export default function TeacherStudentsPage() {
  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Students">
      <div className="p-8">
        <ComingSoon title="Students" description="Roster management and insights are coming soon." />
      </div>
    </DashboardLayout>
  );
}
