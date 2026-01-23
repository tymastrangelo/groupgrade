"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
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
  is_professor: boolean;
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

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString();
}

function pad(n: number): string { return n.toString().padStart(2, "0"); }
function toLocalInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}
function fromLocalInput(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return d.toISOString();
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

export default function TeacherProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpectations, setEditExpectations] = useState("");
  const [editDeliverables, setEditDeliverables] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

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
        setEditName(p.name || "");
        setEditDescription(p.description || "");
        setEditExpectations(p.expectations || "");
        setEditDeliverables(p.deliverables || "");
        setEditDueDate(toLocalInput(p.due_date));
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
        setEditName(p.name || "");
        setEditDescription(p.description || "");
        setEditExpectations(p.expectations || "");
        setEditDeliverables(p.deliverables || "");
        setEditDueDate(toLocalInput(p.due_date));
      }
    });

    const unsubMilestones = tasksCache.subscribe<{ milestones: Milestone[] }>(milestonesUrl, (data) => {
      if (data && (data as any).milestones) {
        setMilestones((data as any).milestones || []);
      }
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProject();
    fetchMilestones();
    return () => {
      unsubscribe();
      unsubMilestones();
    };
  }, [projectId]);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        description: editDescription.trim(),
        expectations: editExpectations.trim(),
        deliverables: editDeliverables.trim(),
        due_date: fromLocalInput(editDueDate),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to save");
      setSaving(false);
      return;
    }
    await fetchProject();
    setEditMode(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardLayout initialRole="teacher" overrideHeaderLabel="Project">
        <div className="p-8">
          <p className="text-sm text-[#616f89]">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout initialRole="teacher" overrideHeaderLabel="Project">
        <div className="p-8">
          <p className="text-sm text-red-600">{error || "Project not found"}</p>
        </div>
      </DashboardLayout>
    );
  }

  const parsed = parseRubric(project.rubric);

  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Project">
      <div className="p-8 max-w-screen-2xl mx-auto w-full">
        <div className="flex flex-col gap-6">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
          {!editMode ? (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold text-[#111318]">{project.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-[#616f89]">
                    <a href={`/teacher/classes/${project.class_id}`} className="text-primary font-semibold hover:underline">
                      {project.class_name}
                    </a>
                    <span className="text-[#d1d5db]">•</span>
                    <span>{project.due_date ? `Due ${formatDateTime(project.due_date)}` : "No due date set"}</span>
                  </div>
                  {project.updated_at && (
                    <p className="text-xs text-[#9ca3af] mt-1">Last edited {formatDateTime(project.updated_at)}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                      {parsed.assignment_mode === "students_self_assign" ? "Students assign" : "Teacher assigns"}
                    </span>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700/30">
                      {parsed.grouping_strategy === "random_from_survey" ? "Random (survey)" : "Manual groups"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {project.is_professor && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-sm font-bold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
                    >
                      Edit project
                    </button>
                  )}
                  <a
                    href={`/teacher/classes/${project.class_id}`}
                    className="text-sm font-bold px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10"
                  >
                    Manage groups
                  </a>
                </div>
              </div>
              {project.description && (
                <div className="mt-2 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[#111318] mb-1">Description</h3>
                    <p className="text-sm text-[#616f89] leading-relaxed whitespace-pre-wrap">{project.description}</p>
                  </div>
                  {project.is_professor && milestones.length === 0 && (
                    <button
                      onClick={async () => {
                        // Trigger add milestone in ProjectTimeline
                        const addBtn = document.querySelector('[data-add-milestone]') as HTMLButtonElement;
                        addBtn?.click();
                      }}
                      className="text-sm font-bold px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">add_circle</span>
                      Add Milestone
                    </button>
                  )}
                </div>
              )}
              {!project.description && project.is_professor && milestones.length === 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      // Trigger add milestone in ProjectTimeline
                      const addBtn = document.querySelector('[data-add-milestone]') as HTMLButtonElement;
                      addBtn?.click();
                    }}
                    className="text-sm font-bold px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Add Milestone
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#111318]">Edit project</h2>
                <button onClick={() => setEditMode(false)} className="text-[#616f89] hover:text-[#111318]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-[#111318]">
                  Project name
                  <input
                    className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </label>
                <label className="text-sm font-semibold text-[#111318]">
                  Due date & time
                  <input
                    type="datetime-local"
                    className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </label>
                <label className="text-sm font-semibold text-[#111318]">
                  Description
                  <textarea
                    className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Describe the project goals and overview"
                  />
                </label>
                <label className="text-sm font-semibold text-[#111318]">
                  Expectations
                  <textarea
                    className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                    value={editExpectations}
                    onChange={(e) => setEditExpectations(e.target.value)}
                    placeholder="What do you expect from students?"
                  />
                </label>
                <label className="text-sm font-semibold text-[#111318]">
                  Deliverables (one per line)
                  <textarea
                    className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                    value={editDeliverables}
                    onChange={(e) => setEditDeliverables(e.target.value)}
                    placeholder="Final report&#10;Presentation slides&#10;Source code"
                  />
                </label>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 rounded-lg text-sm font-bold border border-[#e5e7eb] text-[#111318]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </>
          )}
        </div>

        {!editMode && (
          <>
            {/* Always render ProjectTimeline (modal needs to be visible) */}
            <ProjectTimeline
              projectId={projectId}
              milestones={milestones}
              onUpdate={fetchMilestones}
              editable={project.is_professor}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#111318]">Expectations</h3>
                <p className="text-sm text-[#616f89] whitespace-pre-wrap">{project.expectations || "Not provided."}</p>
              </div>
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#111318]">Deliverables</h3>
                {project.deliverables ? (
                  <ul className="list-disc list-inside text-sm text-[#111318] space-y-1">
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
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#111318]">Rubric</h3>
                <p className="text-sm text-[#111318] leading-relaxed whitespace-pre-wrap">{parsed.rubric_text}</p>
              </div>
            )}

            <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-[#111318]">Groups ({project.groups.length})</h3>
              {project.groups.length === 0 ? (
                <p className="text-sm text-[#616f89]">
                  No groups set yet.{" "}
                  <a href={`/teacher/classes/${project.class_id}`} className="text-primary font-semibold hover:underline">
                    Set groups
                  </a>{" "}
                  to let students see their teammates.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.groups.map((g) => (
                    <div key={g.id} className="rounded-lg border border-[#e5e7eb] p-4 bg-[#fdfefe]">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-[#111318]">{g.name}</p>
                        <span className="text-xs text-[#616f89]">{g.members.length} members</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {g.members.map((m) => (
                          <div key={m.id} className="flex items-center gap-2">
                            <Avatar name={m.name} src={m.avatar_url} />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-[#111318] leading-tight">{m.name}</span>
                              <span className="text-xs text-[#616f89]">{m.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
