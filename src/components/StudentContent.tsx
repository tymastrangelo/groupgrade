"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type ClassRow = {
  id: string;
  name: string;
  code: string;
  join_code_expires_at?: string;
  created_at?: string;
};

type StudentProject = {
  id: string;
  name: string;
  classId: string;
  className: string;
  due_date?: string | null;
  assignment_mode?: string;
  grouping_strategy?: string;
  groupsCount: number;
  myGroupName?: string;
  myGroupMembers?: { id: string; name: string; avatar_url?: string | null }[];
};

export function StudentContent({ userName = 'Alex' }: { userName?: string }) {
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [shake, setShake] = useState(false);
  const [activeTab, setActiveTab] = useState<'classes' | 'projects'>('classes');
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsFetched, setProjectsFetched] = useState(false);

  const fetchClasses = async () => {
    setError(null);
    const res = await fetch('/api/classes');
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to load classes');
      setLoading(false);
      return;
    }
    const j = await res.json();
    setClasses(j.classes || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'projects') {
      setActiveTab('projects');
    }
  }, [searchParams]);

  useEffect(() => {
    const loadProjects = async () => {
      if (projectsFetched || loading || classes.length === 0) return;
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const results = await Promise.all(
          classes.map(async (cls) => {
            const res = await fetch(`/api/classes/${cls.id}`);
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              throw new Error(j.error || 'Failed to load class projects');
            }
            const j = await res.json();
            const viewerId = j.viewer_id;
            return (j.projects || []).map((p: any) => {
              let parsed: any = {};
              try {
                parsed = p.rubric ? JSON.parse(p.rubric) : {};
              } catch {}
              const myGroup = (p.groups || []).find((g: any) => g.members.some((m: any) => m.id === viewerId));
              return {
                id: p.id,
                name: p.name,
                classId: cls.id,
                className: cls.name,
                due_date: p.due_date,
                assignment_mode: parsed.assignment_mode,
                grouping_strategy: parsed.grouping_strategy,
                groupsCount: p.groups?.length || 0,
                myGroupName: myGroup?.name,
                myGroupMembers: myGroup?.members || [],
              } as StudentProject;
            });
          })
        );
        setProjects(results.flat());
        setProjectsFetched(true);
      } catch (e: any) {
        setProjectsError(e.message || 'Failed to load projects');
      } finally {
        setProjectsLoading(false);
      }
    };

    if (activeTab === 'projects') {
      loadProjects();
    }
  }, [activeTab, classes, loading, projectsFetched]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setError(null);
    const res = await fetch('/api/classes/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: joinCode.trim() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to join class');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setJoining(false);
      return;
    }
    setJoinCode('');
    await fetchClasses();
    setJoining(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[#111318] dark:text-white text-4xl font-black tracking-tight">Welcome back, {userName}</h1>
        <div className="flex items-center gap-2 text-[#616f89] dark:text-gray-400 font-normal">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Empty state: no classes yet */}
      {!loading && classes.length === 0 ? (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-[#f0f2f4] dark:border-gray-700 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[#111318] dark:text-white text-xl font-bold tracking-tight">Join your first class</h2>
                  <p className="text-sm text-[#616f89]">Enter the 6-character code your professor shares.</p>
                </div>
                <span className="text-[11px] px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">Students only</span>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm font-semibold bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <span>{error}</span>
                </div>
              )}
              <style jsx>{`
                @keyframes shake {
                  0%, 100% { transform: translateX(0); }
                  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                  20%, 40%, 60%, 80% { transform: translateX(10px); }
                }
                .shake {
                  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
              `}</style>
              <div className={`flex flex-col gap-3 md:flex-row md:items-center ${shake ? 'shake' : ''}`}>
                <input
                  className="flex-1 bg-white dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter join code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <button
                  onClick={handleJoin}
                  disabled={joining || !joinCode.trim()}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                >
                  {joining ? 'Joining...' : 'Join Class'}
                </button>
              </div>
              <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border border-primary/20 flex items-start gap-2 text-sm text-[#616f89] dark:text-gray-300">
                <span className="material-symbols-outlined text-primary">info</span>
                <div>
                  <p className="font-semibold text-[#111318] dark:text-white">Need help?</p>
                  <p>Ask your professor for the code. Codes expire after 14 days.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className={`px-4 py-2 rounded-lg text-sm font-bold border cursor-pointer ${
                activeTab === 'classes'
                  ? 'bg-primary text-white border-primary'
                  : 'border-[#e5e7eb] dark:border-gray-700 text-[#111318] dark:text-white'
              }`}
              aria-pressed={activeTab === 'classes'}
              aria-label="Show classes"
            >
              Classes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 rounded-lg text-sm font-bold border cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-primary text-white border-primary'
                  : 'border-[#e5e7eb] dark:border-gray-700 text-[#111318] dark:text-white'
              }`}
              aria-pressed={activeTab === 'projects'}
              aria-label="Show projects"
            >
              Projects
            </button>
          </div>

      {activeTab === 'classes' ? (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-[#f0f2f4] dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#111318] dark:text-white text-xl font-bold tracking-tight">Your Classes</h2>
                <div className={`flex gap-2 ${shake ? 'shake' : ''}`}>
                  <input
                    className="bg-white dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter join code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  />
                  <button
                    onClick={handleJoin}
                    disabled={joining || !joinCode.trim()}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                  >
                    Join Class
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm font-semibold bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-40 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  ))
                ) : classes.length === 0 ? (
                  <div className="col-span-2 text-[#616f89] text-sm">No classes yet. Enter a join code to get started.</div>
                ) : (
                  classes.map(cls => (
                    <Link
                      key={cls.id}
                      href={`/student/classes/${cls.id}`}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-[#f0f2f4] dark:border-gray-700 p-4 hover:shadow-md transition-shadow block"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-lg font-bold text-[#111318] dark:text-white">{cls.name}</p>
                          <p className="text-xs text-[#616f89]">Joined {cls.created_at ? new Date(cls.created_at).toLocaleDateString() : ''}</p>
                        </div>
                        <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full font-bold">Class</span>
                      </div>
                      <p className="text-sm text-[#616f89]">Code: {cls.code}</p>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-6 border border-primary/20">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <span className="material-symbols-outlined">lightbulb</span>
                <h3 className="text-sm font-bold">Tip</h3>
              </div>
              <p className="text-xs text-[#616f89] dark:text-gray-400">Ask your professor for the class join code. Codes expire after 14 days.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-[#f0f2f4] dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[#111318] dark:text-white text-xl font-bold tracking-tight">Your Projects</h2>
                  <p className="text-sm text-[#616f89]">Grouped by class with your team.</p>
                </div>
                <span className="text-xs text-[#616f89]">{projects.length} total</span>
              </div>
              {projectsError && <div className="text-red-600 text-sm mb-2">{projectsError}</div>}
              <div className="flex flex-col gap-3">
                {projectsLoading ? (
                  <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                ) : projects.length === 0 ? (
                  <p className="text-sm text-[#616f89]">No projects yet.</p>
                ) : (
                  projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/student/projects/${p.id}`}
                      className="p-4 rounded-xl border border-[#f0f2f4] dark:border-gray-700 bg-[#f9fafb] dark:bg-gray-800 flex flex-col gap-2 hover:shadow-md transition-shadow"
                      aria-label={`View project ${p.name}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-lg font-bold text-[#111318] dark:text-white">{p.name}</p>
                          <p className="text-xs text-[#616f89]">Class: {p.className}</p>
                          {p.due_date && <p className="text-xs text-[#616f89]">Due {new Date(p.due_date).toLocaleDateString()}</p>}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                              {p.assignment_mode === 'students_self_assign' ? 'Students assign' : 'Teacher assigns'}
                            </span>
                            <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                              {p.grouping_strategy === 'random_from_survey' ? 'Random (survey)' : 'Manual groups'}
                            </span>
                            <span className="text-[11px] px-2 py-1 rounded-full bg-[#f3f4f6] dark:bg-gray-700 text-[#616f89]">
                              {p.groupsCount} groups
                            </span>
                          </div>
                        </div>
                        {p.myGroupName ? (
                          <span className="text-[11px] px-3 py-1 rounded-full bg-primary text-white font-bold">Your group</span>
                        ) : (
                          <span className="text-[11px] px-3 py-1 rounded-full bg-[#f3f4f6] dark:bg-gray-700 text-[#616f89] font-bold">Not assigned</span>
                        )}
                      </div>
                      {p.myGroupName && p.myGroupMembers && (
                        <div className="border border-[#e5e7eb] dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900">
                          <p className="text-sm font-semibold text-[#111318] dark:text-white">{p.myGroupName}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {p.myGroupMembers.map((m) => (
                              <span
                                key={m.id}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#f3f4f6] dark:bg-gray-800 text-[#111318] dark:text-white border border-[#e5e7eb] dark:border-gray-700"
                              >
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center overflow-hidden">
                                  {m.avatar_url ? <img src={m.avatar_url} alt={m.name} className="h-full w-full object-cover" /> : m.name.charAt(0).toUpperCase()}
                                </div>
                                {m.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1 text-sm font-bold text-primary mt-1">
                        <span>View details</span>
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-6 border border-primary/20">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <span className="material-symbols-outlined">group</span>
                <h3 className="text-sm font-bold">Stay updated</h3>
              </div>
              <p className="text-xs text-[#616f89] dark:text-gray-400">When professors create groups, your team appears here automatically.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )}
</div>
);
}
