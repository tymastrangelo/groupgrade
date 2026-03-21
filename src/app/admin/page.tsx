import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/');
  }

  // Check if user is admin
  const { data: user } = await supabase
    .from('users')
    .select('id, role, email')
    .eq('email', session.user.email)
    .maybeSingle();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all classes with professor info
  const { data: classes } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      code,
      created_at,
      users:professor_id(name, email)
    `)
    .order('created_at', { ascending: false });

  // Fetch all projects
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      due_date,
      created_at,
      classes:class_id(name, code)
    `)
    .order('created_at', { ascending: false });

  // Fetch user stats
  const { count: studentCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  const { count: professorCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'professor');

  return (
    <DashboardLayout initialRole="admin" overrideHeaderLabel="Admin Dashboard">
      <div className="w-full bg-[#f6f6f8] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="text-red-100 text-sm">
                System-wide overview • {user.email}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">school</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#111318]">{classes?.length || 0}</p>
                    <p className="text-xs text-[#616f89]">Total Classes</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">assignment</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#111318]">{projects?.length || 0}</p>
                    <p className="text-xs text-[#616f89]">Total Projects</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">person</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#111318]">{studentCount || 0}</p>
                    <p className="text-xs text-[#616f89]">Students</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600">badge</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#111318]">{professorCount || 0}</p>
                    <p className="text-xs text-[#616f89]">Professors</p>
                  </div>
                </div>
              </div>
            </div>

            {/* All Classes */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm">
              <div className="px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">All Classes</h2>
              </div>
              <div className="p-6">
                {!classes || classes.length === 0 ? (
                  <p className="text-sm text-[#616f89]">No classes found.</p>
                ) : (
                  <div className="space-y-3">
                    {classes.map((cls: any) => (
                      <Link
                        key={cls.id}
                        href={`/teacher/classes/${cls.id}`}
                        className="block p-4 rounded-lg border border-[#e5e7eb] hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-[#111318]">{cls.name}</h3>
                            <p className="text-sm text-[#616f89] mt-1">
                              Code: {cls.code} • Professor: {cls.users?.name || 'Unknown'} ({cls.users?.email || 'N/A'})
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-[#616f89]">arrow_forward</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Projects */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm">
              <div className="px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">Recent Projects</h2>
              </div>
              <div className="p-6">
                {!projects || projects.length === 0 ? (
                  <p className="text-sm text-[#616f89]">No projects found.</p>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 10).map((proj: any) => (
                      <Link
                        key={proj.id}
                        href={`/teacher/projects/${proj.id}`}
                        className="block p-4 rounded-lg border border-[#e5e7eb] hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-[#111318]">{proj.name}</h3>
                            <p className="text-sm text-[#616f89] mt-1">
                              Class: {proj.classes?.name || 'Unknown'} ({proj.classes?.code || 'N/A'})
                              {proj.due_date && ` • Due: ${new Date(proj.due_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-[#616f89]">arrow_forward</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
