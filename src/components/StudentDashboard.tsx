'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TasksWidget } from './TasksWidget';
import { TeamActivityWidget } from './TeamActivityWidget';
import { SubmissionCompletionCard } from './SubmissionCompletionCard';
import { tasksCache } from '@/lib/tasksCache';

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

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userName = session?.user?.name || 'User';
  const firstName = userName.split(' ')[0] || userName;

  const fetchClasses = async () => {
    try {
      const data = await tasksCache.fetch<{ classes: ClassRow[] }>("/api/classes");
      if (data && (data as any).classes) setClasses((data as any).classes || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const classesResp = await tasksCache.fetch<{ classes: ClassRow[] }>("/api/classes");
      const classesData = (classesResp && (classesResp as any).classes) || [];
      const results = await Promise.all(
        classesData.map(async (cls: ClassRow) => {
          const j = await tasksCache.fetch<{ viewer_id: string; projects: any[] }>(`/api/classes/${cls.id}`);
          const viewerId = (j as any)?.viewer_id;
          return (((j as any)?.projects) || []).map((p: any) => {
            const myGroup = (p.groups || []).find((g: any) => g.members.some((m: any) => m.id === viewerId));
            return {
              id: p.id,
              name: p.name,
              classId: cls.id,
              className: cls.name,
              due_date: p.due_date,
              groupsCount: p.groups?.length || 0,
              myGroupName: myGroup?.name,
              myGroupMembers: myGroup?.members || [],
            } as StudentProject;
          });
        })
      );
      setProjects(results.flat());
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchProjects();
  }, []);

  const handleJoinClass = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to join class');
      }
      
      setJoinCode('');
      setShowJoinModal(false);
      await fetchClasses();
      await fetchProjects();
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join class');
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      
      {/* Content only - no sidebar or header, those come from DashboardLayout */}
      <div className="w-full bg-[#f6f6f8] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Page Heading with Submit Work Button */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[#111318] text-4xl font-black tracking-tight mb-1">Welcome back, {firstName}</h1>
            <p className="text-[#657386]">
              You have <span className="text-primary font-bold">{Math.max(0, projects.filter(p => p.due_date).length)}</span> {projects.filter(p => p.due_date).length === 1 ? 'deadline' : 'deadlines'} approaching. Stay focused!
            </p>
          </div>
          <button className="bg-primary text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">
            <span className="material-symbols-outlined">upload_file</span>
            Submit Work
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Projects and Tasks */}
          <div className="lg:col-span-8 space-y-8">
            {/* Projects Section */}
            {!loading && projects.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#111318]">Your Projects</h2>
                  {projects.length > 2 && (
                    <Link href="/student/projects" className="text-sm text-primary font-semibold hover:underline">
                      See More
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.slice(0, 2).map((project) => (
                    <Link
                      key={project.id}
                      href={`/student/projects/${project.id}`}
                      className="bg-white border border-[#e5e7eb] rounded-xl p-5 hover:border-primary transition-colors flex flex-col gap-3 group"
                    >
                      <div className="flex flex-col gap-2">
                        <h3 className="text-base font-bold text-[#111318] group-hover:text-primary transition-colors">{project.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-[#616f89]">
                          <span className="material-symbols-outlined text-sm">school</span>
                          <span>{project.className}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-auto">
                        {project.myGroupName && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                            In {project.myGroupName}
                          </span>
                        )}
                        <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100/50 text-[#616f89] font-semibold">
                          {project.groupsCount} {project.groupsCount === 1 ? 'group' : 'groups'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            <TasksWidget 
              usePersonalTasks={true}
              projects={projects.map(p => ({ id: p.id, name: p.name }))}
            />
          </div>

          {/* Right Column: Team Activity and Stats */}
          <div className="lg:col-span-4 space-y-8">
            <TeamActivityWidget />
            <SubmissionCompletionCard />
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
