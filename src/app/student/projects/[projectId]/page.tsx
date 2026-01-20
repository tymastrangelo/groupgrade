import StudentProjectDetail from '@/components/StudentProjectDetail';

export default async function StudentProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <StudentProjectDetail projectId={projectId} />;
}
