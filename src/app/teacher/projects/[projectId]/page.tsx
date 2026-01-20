import TeacherProjectDetail from '@/components/TeacherProjectDetail';

export default async function TeacherProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <TeacherProjectDetail projectId={projectId} />;
}
