"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSession } from "next-auth/react";

type ProjectData = {
  id: string;
  name: string;
  rubric: string | null;
  due_date: string | null;
  class_id: string;
  class_name: string;
  description: string | null;
  expectations: string | null;
  deliverables: string | null;
  created_at: string | null;
  updated_at: string | null;
  groups: { id: string; name: string; members: { id: string; name: string; email: string; avatar_url?: string | null }[] }[];
};

function parseRubric(rubric?: string | null) {
  if (!rubric) return {} as Record<string, any>;
  try {
    return JSON.parse(rubric);
  } catch {
    return {} as Record<string, any>;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleDateString();
}

function Avatar({ name, src, size = "h-8 w-8" }: { name: string; src?: string | null; size?: string }) {
  const letter = (name || "?").charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${size} rounded-full object-cover border border-[#e5e7eb] dark:border-[#2d3748]`}
      />
    );
  }
  return (
    <div className={`${size} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-[#e5e7eb] dark:border-[#2d3748]`}>
      {letter}
    </div>
  );
}

export default function StudentProjectDetail({ projectId }: { projectId: string }) {
    const { data: session } = useSession();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to load project");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setProject(data.project);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <DashboardLayout initialRole="student" overrideHeaderLabel="Project">
        <div className="p-8">
          <p className="text-sm text-[#616f89]">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout initialRole="student" overrideHeaderLabel="Project">
        <div className="p-8">
          <p className="text-sm text-red-600">{error || "Project not found"}</p>
        </div>
      </DashboardLayout>
    );
  }

  const parsed = parseRubric(project.rubric);

  // Find the student's group
  const myGroup = project.groups.find((g) => 
    g.members.some((m) => m.email === session?.user?.email)
  );
  
  const otherGroups = project.groups.filter((g) => 
    !g.members.some((m) => m.email === session?.user?.email)
  );

  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Project">
      <div className="p-8 max-w-screen-2xl mx-auto w-full">
        <div className="flex flex-col gap-6">
        <div className="bg-white dark:bg-[#1a202c] border border-[#e5e7eb] dark:border-[#2d3748] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-[#111318] dark:text-white">{project.name}</h1>
              <div className="flex items-center gap-2 text-sm text-[#616f89]">
                <span className="font-semibold">{project.class_name}</span>
                <span className="text-[#d1d5db]">•</span>
                <span>{project.due_date ? `Due ${formatDate(project.due_date)}` : "No due date set"}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                  {parsed.assignment_mode === "students_self_assign" ? "Self-assign tasks" : "Teacher assigns tasks"}
                </span>
              </div>
            </div>
          </div>
          {project.description && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold text-[#111318] dark:text-white mb-1">Description</h3>
              <p className="text-sm text-[#616f89] dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#1a202c] border border-[#e5e7eb] dark:border-[#2d3748] rounded-xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-[#111318] dark:text-white">Expectations</h3>
            <p className="text-sm text-[#616f89] dark:text-gray-300 whitespace-pre-wrap">{project.expectations || "Not provided."}</p>
          </div>
          <div className="bg-white dark:bg-[#1a202c] border border-[#e5e7eb] dark:border-[#2d3748] rounded-xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-[#111318] dark:text-white">Deliverables</h3>
            {project.deliverables ? (
              <ul className="list-disc list-inside text-sm text-[#111318] dark:text-gray-200 space-y-1">
                {project.deliverables.split("\n").filter(Boolean).map((d: string, idx: number) => (
                  <li key={`del-${idx}`}>{d.trim()}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#616f89]">No deliverables listed.</p>
            )}
          </div>
        </div>

        {parsed.rubric_text && (
          <div className="bg-white dark:bg-[#1a202c] border border-[#e5e7eb] dark:border-[#2d3748] rounded-xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-[#111318] dark:text-white">Rubric</h3>
            <p className="text-sm text-[#111318] dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{parsed.rubric_text}</p>
          </div>
        )}

        <div className="bg-white dark:bg-[#1a202c] border border-[#e5e7eb] dark:border-[#2d3748] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">group</span>
            <h3 className="text-lg font-bold text-[#111318] dark:text-white">Your Team</h3>
          </div>
          
          {project.groups.length === 0 ? (
            <div className="rounded-lg border border-[#e5e7eb] dark:border-[#2d3748] p-6 bg-[#fdfefe] dark:bg-[#0f172a] text-center">
              <span className="material-symbols-outlined text-4xl text-[#616f89] mb-2">schedule</span>
              <p className="text-sm text-[#616f89]">Groups have not been assigned yet.</p>
              <p className="text-xs text-[#9ca3af] mt-1">Your teacher will assign teams soon. Check back later!</p>
            </div>
          ) : myGroup ? (
            <>
              <div className="rounded-lg border-2 border-primary bg-primary/5 dark:bg-primary/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">badge</span>
                    <p className="text-base font-bold text-primary">{myGroup.name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary text-white font-bold">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    You&apos;re here
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  {myGroup.members.map((m) => {
                    const isMe = m.email === session?.user?.email;
                    return (
                      <div 
                        key={m.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isMe 
                            ? "bg-white dark:bg-[#1a202c] border-2 border-primary" 
                            : "bg-white/60 dark:bg-[#111827]/60 border border-[#e5e7eb] dark:border-[#2d3748]"
                        }`}
                      >
                        <Avatar name={m.name} src={m.avatar_url} size="h-10 w-10" />
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#111318] dark:text-white leading-tight">
                              {m.name}
                            </span>
                            {isMe && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#616f89]">{m.email}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {otherGroups.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-[#616f89] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">groups</span>
                    Other Teams in this Project
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherGroups.map((g) => (
                      <div key={g.id} className="rounded-lg border border-[#e5e7eb] dark:border-[#2d3748] p-4 bg-[#fdfefe] dark:bg-[#0f172a]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-[#111318] dark:text-white">{g.name}</p>
                          <span className="text-xs text-[#616f89]">{g.members.length} members</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {g.members.map((m) => (
                            <div key={m.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-white dark:bg-[#111827] border border-[#e5e7eb] dark:border-[#2d3748]">
                              <Avatar name={m.name} src={m.avatar_url} size="h-5 w-5" />
                              <span className="text-xs font-medium text-[#111318] dark:text-white">{m.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 p-6 bg-amber-50 dark:bg-amber-900/20 text-center">
              <span className="material-symbols-outlined text-4xl text-amber-600 dark:text-amber-400 mb-2">info</span>
              <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold">You haven&apos;t been assigned to a group yet.</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Please contact your teacher if you think this is an error.</p>
            </div>
          )}
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
