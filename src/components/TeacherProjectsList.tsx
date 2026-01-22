"use client";

import { useEffect, useState } from "react";
import { tasksCache } from "@/lib/tasksCache";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

type ProjectWithClass = {
  id: string;
  name: string;
  due_date: string | null;
  class_id: string;
  class_name: string;
  rubric: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleDateString();
}

export default function TeacherProjectsList() {
  const [projects, setProjects] = useState<ProjectWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const url = "/api/teacher/projects";
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksCache.fetch<{ projects: ProjectWithClass[] }>(url);
      if (data && (data as any).projects) setProjects((data as any).projects || []);
    } catch (e: any) {
      setError(e.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = tasksCache.subscribe<{ projects: ProjectWithClass[] }>(url, (data) => {
      if (data && (data as any).projects) setProjects((data as any).projects || []);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
    return () => unsubscribe();
  }, []);

  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Projects">
      <div className="p-8 max-w-screen-2xl mx-auto w-full">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-[#111318] tracking-tight">Projects</h1>
              <p className="text-sm text-[#616f89] mt-1">View and manage all your projects across classes</p>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-[#616f89]">Loading projects...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : projects.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
              <p className="text-sm text-[#616f89]">No projects yet. Create a project from a class page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                let parsed: any = {};
                try {
                  parsed = project.rubric ? JSON.parse(project.rubric) : {};
                } catch {}

                return (
                  <Link
                    key={project.id}
                    href={`/teacher/projects/${project.id}`}
                    className="bg-white border border-[#e5e7eb] rounded-xl p-5 hover:border-primary transition-colors flex flex-col gap-3"
                  >
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-bold text-[#111318]">{project.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-[#616f89]">
                        <span className="material-symbols-outlined text-sm">school</span>
                        <span>{project.class_name}</span>
                      </div>
                      {project.due_date && (
                        <div className="flex items-center gap-2 text-xs text-[#616f89]">
                          <span className="material-symbols-outlined text-sm">event</span>
                          <span>Due {formatDate(project.due_date)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap mt-auto">
                      <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                        {parsed.assignment_mode === "students_self_assign" ? "Students assign" : "Teacher assigns"}
                      </span>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700/30">
                        {parsed.grouping_strategy === "random_from_survey" ? "Auto groups" : "Manual groups"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
