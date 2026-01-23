"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useSession } from "next-auth/react";
import { TasksWidget } from "./TasksWidget";
import { tasksCache } from "@/lib/tasksCache";
import { ProjectTimeline, type Milestone } from "@/components/ProjectTimeline";

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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDue(value?: string | null) {
  if (!value) return "No due date";
  const d = new Date(value);
  return d.toLocaleDateString();
}

function getCountdown(dueDate?: string | null) {
  if (!dueDate) return { days: 0, hours: 0, minutes: 0, isOverdue: false };
  
  const now = new Date();
  const deadline = new Date(dueDate);
  const isOverdue = deadline < now;
  
  if (isOverdue) {
    return { days: 0, hours: 0, minutes: 0, isOverdue: true };
  }
  
  const diffMs = deadline.getTime() - now.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, isOverdue: false };
}

function Avatar({ name, src, size = "h-8 w-8" }: { name: string; src?: string | null; size?: string }) {
  const letter = (name || "?").charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${size} rounded-full object-cover border border-[#e5e7eb]`}
      />
    );
  }
  return (
    <div className={`${size} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-[#e5e7eb]`}>
      {letter}
    </div>
  );
}

export default function StudentProjectDetail({ projectId }: { projectId: string }) {
  const { data: session } = useSession();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, isOverdue: false });
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);

  const url = `/api/projects/${projectId}`;
  const milestonesUrl = `/api/projects/${projectId}/milestones`;

  const fetchMilestones = async () => {
    try {
      const data = await tasksCache.fetch<{ milestones: Milestone[] }>(milestonesUrl);
      if (data && (data as any).milestones) {
        setMilestones((data as any).milestones || []);
      }
    } catch (e) {
      console.error('Failed to fetch milestones:', e);
    }
  };

  const fetchProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksCache.fetch<{ project: ProjectData }>(url);
      if (data && (data as any).project) {
        const p = (data as any).project as ProjectData;
        setProject(p);
        setCountdown(getCountdown(p.due_date));
      }
    } catch (e: any) {
      setError(e.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = tasksCache.subscribe<{ project: ProjectData }>(url, (data) => {
      if (data && (data as any).project) {
        const p = (data as any).project as ProjectData;
        setProject(p);
        setCountdown(getCountdown(p.due_date));
      }
    });
    const unsubscribeMilestones = tasksCache.subscribe(milestonesUrl, fetchMilestones);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProject();
    fetchMilestones();
    return () => {
      unsubscribe();
      unsubscribeMilestones();
    };
  }, [projectId]);

  // Update countdown every minute
  useEffect(() => {
    if (!project) return;
    const interval = setInterval(() => {
      setCountdown(getCountdown(project.due_date));
    }, 60000);
    return () => clearInterval(interval);
  }, [project]);


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

  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Project">
      <div className="w-full bg-[#f6f6f8] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-8 mb-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-[#111318]">{project.name}</h1>
                  <span className="inline-block text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
                    Active Project
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#616f89] text-sm">
                  <span>{project.class_name}</span>
                  {myGroup && (
                    <>
                      <span className="text-[#d1d5db]">•</span>
                      <span>{myGroup.name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Deadline Timer */}
              <div className="flex flex-col items-end gap-2">
                <p className="text-xs text-[#616f89] font-medium">Due Date</p>
                {countdown.isOverdue ? (
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">Overdue</p>
                    <p className="text-xs text-red-500">{formatDate(project.due_date)}</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{countdown.days}</p>
                      <p className="text-xs text-[#616f89]">Days</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{countdown.hours}</p>
                      <p className="text-xs text-[#616f89]">Hours</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{countdown.minutes}</p>
                      <p className="text-xs text-[#616f89]">Minutes</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-blue-700 transition">
                <span className="material-symbols-outlined text-base">upload_file</span>
                Submit Proof
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#e5e7eb] text-[#111318] font-medium text-sm hover:bg-[#f9fafb] transition">
                <span className="material-symbols-outlined text-base">description</span>
                View Details
              </button>
            </div>
          </div>

          {/* Timeline cards floating on background */}
          {milestones.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[#111318] mb-4">Project Timeline</h3>
              <ProjectTimeline 
                projectId={projectId} 
                milestones={milestones} 
                editable={false}
              />
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Your Contribution Section */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#111318] mb-4">Your Contribution</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#111318]">Completion Status</span>
                      <span className="text-sm font-bold text-primary">65%</span>
                    </div>
                    <div className="w-full h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-primary"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-[#616f89]">
                    <span>Your contribution</span>
                    <span>Group average: 72%</span>
                  </div>
                </div>
              </div>

              <TasksWidget projectId={projectId} title="Project Tasks" />

              {/* Deliverables Section */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#111318] mb-4">Project Deliverables</h2>
                {project.deliverables ? (
                  <div className="grid grid-cols-2 gap-4">
                    {project.deliverables.split("\n").filter(Boolean).map((d: string, idx: number) => (
                      <div key={`del-${idx}`} className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] hover:bg-[#f9fafb] transition">
                        <span className="material-symbols-outlined text-[#616f89]">description</span>
                        <div>
                          <p className="text-sm font-medium text-[#111318]">{d.trim()}</p>
                          <p className="text-xs text-[#616f89]">0 files</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#616f89]">No deliverables listed.</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 space-y-8">
              {/* Rubric Overview */}
              {parsed.rubric_text && (
                <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#111318] mb-4">Rubric Overview</h2>
                  <div className="space-y-3 text-sm">
                    <p className="text-[#616f89] leading-relaxed whitespace-pre-wrap">{parsed.rubric_text}</p>
                  </div>
                </div>
              )}

              {/* Group Information */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#111318] mb-4">Your Group</h2>
                {myGroup ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-primary">{myGroup.name}</p>
                    <div className="space-y-2">
                      {myGroup.members.map((m) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <Avatar name={m.name} src={m.avatar_url} size="h-6 w-6" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#111318] truncate">{m.name}</p>
                            {m.email === session?.user?.email && (
                              <p className="text-[9px] text-primary font-semibold">You</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#616f89]">Not assigned to a group yet</p>
                )}
              </div>

              {/* Recent Work Proof */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#111318] mb-4">Recent Work Proof</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] hover:bg-[#f9fafb] transition">
                    <span className="material-symbols-outlined text-[#616f89]">file_present</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#111318] truncate">Project_Outline.pdf</p>
                      <p className="text-[9px] text-[#616f89]">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] hover:bg-[#f9fafb] transition">
                    <span className="material-symbols-outlined text-[#616f89]">image</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#111318] truncate">Mockup_Design.png</p>
                      <p className="text-[9px] text-[#616f89]">1 day ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
