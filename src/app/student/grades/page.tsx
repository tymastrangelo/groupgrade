import DashboardLayout from '@/components/DashboardLayout';
import { ComingSoon } from '@/components/ComingSoon';

export default function StudentGradesPage() {
  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Grades">
      <div className="p-8">
        <ComingSoon title="Grades" description="Grading details and feedback will appear here soon." />
      </div>
    </DashboardLayout>
  );
}
