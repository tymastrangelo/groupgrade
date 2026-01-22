'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

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

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString();
}

export default function StudentProjects() {
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/classes');
      if (!res.ok) throw new Error('Failed to load classes');
      const j = await res.json();
      const classesData = j.classes || [];
      
      const results = await Promise.all(
        classesData.map(async (cls: any) => {
          const res = await fetch(`/api/classes/${cls.id}`);
          if (!res.ok) throw new Error('Failed to load class projects');
          const j = await res.json();
          const viewerId = j.viewer_id;
          return (j.projects || []).map((p: any) => {
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
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Projects">
      <div className="w-full bg-[#f6f6f8] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-black text-[#111318] tracking-tight">Projects</h1>
            <p className="text-sm text-[#616f89] mt-1">View all your projects across classes</p>
          </div>

          {loading ? (
            <div className="text-sm text-[#616f89]">Loading projects...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : projects.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
              <p className="text-sm text-[#616f89]">No projects yet. Ask your professor for a class code to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/student/projects/${project.id}`}
                  className="bg-white border border-[#e5e7eb] rounded-xl p-5 hover:border-primary transition-colors flex flex-col gap-3"
                >
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold text-[#111318]">{project.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-[#616f89]">
                      <span className="material-symbols-outlined text-sm">school</span>
                      <span>{project.className}</span>
                    </div>
                    {project.due_date && (
                      <div className="flex items-center gap-2 text-xs text-[#616f89]">
                        <span className="material-symbols-outlined text-sm">event</span>
                        <span>Due {formatDate(project.due_date)}</span>
                      </div>
                    )}
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
          )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
