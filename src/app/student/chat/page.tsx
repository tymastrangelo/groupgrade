import DashboardLayout from '@/components/DashboardLayout';
import { ComingSoon } from '@/components/ComingSoon';

export default function StudentChatPage() {
  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Team Chat">
      <div className="p-8">
        <ComingSoon title="Team Chat" description="Collaborate with teammates here soon." />
      </div>
    </DashboardLayout>
  );
}
