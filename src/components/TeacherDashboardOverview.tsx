"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { tasksCache } from "@/lib/tasksCache";

type ClassRow = {
  id: string;
  name: string;
  code: string;
  join_code_expires_at?: string | null;
  created_at?: string | null;
  term?: string | null;
  location?: string | null;
  meeting_days?: string[] | null;
  start_time?: string | null;
  end_time?: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
  due_date?: string | null;
  class_id?: string | null;
  class_name?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

function isWithinDays(dateValue: string | null | undefined, days: number) {
  if (!dateValue) return false;
  const target = new Date(dateValue).getTime();
  const now = Date.now();
  return target >= now && target <= now + days * 24 * 60 * 60 * 1000;
}

export default function TeacherDashboardOverview() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const classesUrl = "/api/classes";
  const projectsUrl = "/api/teacher/projects";

  useEffect(() => {
    const unsubClasses = tasksCache.subscribe<{ classes: ClassRow[] }>(classesUrl, (data) => {
      if (data?.classes) setClasses(data.classes);
    });
    const unsubProjects = tasksCache.subscribe<{ projects: ProjectRow[] }>(projectsUrl, (data) => {
      if (data?.projects) setProjects(data.projects);
    });

    const fetchAll = async () => {
      setError(null);
      setLoading(true);
      try {
        const [classData, projectData] = await Promise.all([
          tasksCache.fetch<{ classes: ClassRow[] }>(classesUrl),
          tasksCache.fetch<{ projects: ProjectRow[] }>(projectsUrl),
        ]);
        setClasses(classData?.classes || []);
        setProjects(projectData?.projects || []);
      } catch (e: any) {
        setError(e.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    return () => {
      unsubClasses();
      unsubProjects();
    };
  }, []);

  const totals = useMemo(() => {
    const totalClasses = classes.length;
    const totalProjects = projects.length;
    const dueSoon = projects.filter((p) => isWithinDays(p.due_date || null, 14));
    const overdue = projects.filter((p) => p.due_date && new Date(p.due_date).getTime() < Date.now());
    const codesExpiring = classes.filter((c) => isWithinDays(c.join_code_expires_at || null, 7));
    return {
      totalClasses,
      totalProjects,
      dueSoonCount: dueSoon.length,
      overdueCount: overdue.length,
      codesExpiringCount: codesExpiring.length,
    };
  }, [classes, projects]);

  const upcomingProjects = useMemo(() => {
    return [...projects]
      .filter((p) => p.due_date)
      .sort((a, b) => (new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()))
      .slice(0, 5);
  }, [projects]);

  const recentClasses = useMemo(() => {
    return [...classes]
      .sort((a, b) => (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()))
      .slice(0, 4);
  }, [classes]);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">Dashboard</h2>
          <p className="text-[#475569] mt-1 font-medium">At-a-glance view of classes, projects, and upcoming deadlines.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/classes"
            className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#111318] text-sm font-bold hover:bg-[#f9fafb]"
          >
            View classes
          </Link>
          <Link
            href="/teacher/projects"
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-blue-700"
          >
            Manage projects
          </Link>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-[#475569]">Total Classes</p>
          <p className="text-2xl font-black text-[#111318] mt-2">{loading ? "—" : totals.totalClasses}</p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-[#475569]">Active Projects</p>
          <p className="text-2xl font-black text-[#111318] mt-2">{loading ? "—" : totals.totalProjects}</p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-[#475569]">Due in 14 Days</p>
          <p className="text-2xl font-black text-[#111318] mt-2">{loading ? "—" : totals.dueSoonCount}</p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-[#475569]">Overdue</p>
          <p className="text-2xl font-black text-[#111318] mt-2">{loading ? "—" : totals.overdueCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#111318]">Upcoming deadlines</h3>
            <Link href="/teacher/projects" className="text-primary text-sm font-bold hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : upcomingProjects.length === 0 ? (
            <div className="text-sm text-[#616f89]">No upcoming deadlines yet.</div>
          ) : (
            <div className="divide-y divide-[#f0f2f4]">
              {upcomingProjects.map((project) => (
                <div key={project.id} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#111318]">{project.name}</p>
                    <p className="text-xs text-[#475569]">{project.class_name || "Class"} • Due {formatDate(project.due_date)}</p>
                  </div>
                  <Link
                    href={`/teacher/projects/${project.id}`}
                    className="px-3 py-1.5 text-xs font-bold border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb]"
                  >
                    Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-bold text-[#111318]">Needs attention</h3>
            <p className="text-sm text-[#475569]">Quick signals to review.</p>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
              <p className="text-xs uppercase tracking-wider text-[#475569]">Join codes expiring</p>
              <p className="text-lg font-bold text-[#111318]">{loading ? "—" : totals.codesExpiringCount}</p>
              <p className="text-xs text-[#616f89]">Refresh codes to keep onboarding smooth.</p>
            </div>
            <div className="p-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
              <p className="text-xs uppercase tracking-wider text-[#475569]">Overdue projects</p>
              <p className="text-lg font-bold text-[#111318]">{loading ? "—" : totals.overdueCount}</p>
              <p className="text-xs text-[#616f89]">Follow up with teams behind schedule.</p>
            </div>
          </div>
          <Link
            href="/teacher/classes"
            className="mt-auto px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-bold text-[#111318] hover:bg-[#f9fafb]"
          >
            Review classes
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#111318]">Recent classes</h3>
          <Link href="/teacher/classes" className="text-primary text-sm font-bold hover:underline">Manage</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentClasses.length === 0 ? (
          <div className="text-sm text-[#616f89]">No classes created yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentClasses.map((cls) => (
              <Link
                key={cls.id}
                href={`/teacher/classes/${cls.id}`}
                className="border border-[#e5e7eb] rounded-lg p-4 hover:shadow-sm transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#111318]">{cls.name}</p>
                    <p className="text-xs text-[#475569]">Created {formatDate(cls.created_at)}</p>
                  </div>
                  <span className="text-xs font-bold text-primary">{cls.code}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-[#475569]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">location_on</span>
                    {cls.location || "Room TBD"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">calendar_today</span>
                    {cls.term || "Term TBD"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
