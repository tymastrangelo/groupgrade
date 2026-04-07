"use client";

import { useEffect, useMemo, useState } from "react";
import { tasksCache } from "@/lib/tasksCache";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DisengagementFlaggingConfig, DisengagementConfig, DEFAULT_DISENGAGEMENT_CONFIG } from "@/components/DisengagementFlaggingConfig";

type ProjectWithClass = {
  id: string;
  name: string;
  due_date: string | null;
  class_id: string;
  class_name: string;
  rubric: string | null;
};

type ClassRow = {
  id: string;
  name: string;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleDateString();
}

export default function TeacherProjectsList() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithClass[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDue, setProjectDue] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"teacher_assigns" | "students_self_assign">("teacher_assigns");
  const [groupingStrategy, setGroupingStrategy] = useState<"manual" | "random_from_survey">("manual");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectRubric, setProjectRubric] = useState("");
  const [projectExpectations, setProjectExpectations] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>(["Final project report (PDF)", "Peer review form"]);
  const [deliverableInput, setDeliverableInput] = useState("");
  const [disengagementConfig, setDisengagementConfig] = useState<DisengagementConfig>(DEFAULT_DISENGAGEMENT_CONFIG);

  const url = "/api/teacher/projects";
  const classesUrl = "/api/classes";
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
    const unsubscribeClasses = tasksCache.subscribe<{ classes: ClassRow[] }>(classesUrl, (data) => {
      if (data && (data as any).classes) setClasses((data as any).classes || []);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
    const fetchClasses = async () => {
      try {
        const data = await tasksCache.fetch<{ classes: ClassRow[] }>(classesUrl);
        if (data && (data as any).classes) setClasses((data as any).classes || []);
      } catch {
        // ignore class list errors here
      }
    };
    fetchClasses();
    return () => {
      unsubscribe();
      unsubscribeClasses();
    };
  }, []);

  const resetCreateForm = () => {
    setClassId("");
    setProjectName("");
    setProjectDue("");
    setAssignmentMode("teacher_assigns");
    setGroupingStrategy("manual");
    setProjectDescription("");
    setProjectRubric("");
    setProjectExpectations("");
    setDeliverables(["Final project report (PDF)", "Peer review form"]);
    setDeliverableInput("");
    setDisengagementConfig(DEFAULT_DISENGAGEMENT_CONFIG);
    setCreateError(null);
  };

  const addDeliverable = () => {
    const trimmed = deliverableInput.trim();
    if (!trimmed) return;
    if (deliverables.includes(trimmed)) return;
    setDeliverables((prev) => [...prev, trimmed]);
    setDeliverableInput("");
  };

  const removeDeliverable = (value: string) => {
    setDeliverables((prev) => prev.filter((d) => d !== value));
  };

  const handleCreateProject = async () => {
    if (!classId || !projectName.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    const res = await fetch(`/api/classes/${classId}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName.trim(),
        due_date: projectDue || null,
        assignment_mode: assignmentMode,
        grouping_strategy: groupingStrategy,
        description: projectDescription,
        rubric_text: projectRubric,
        expectations: projectExpectations,
        deliverables,
        disengagement_config: disengagementConfig,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setCreateError(j.error || "Failed to create project");
      setCreateBusy(false);
      return;
    }

    const j = await res.json().catch(() => ({}));
    const created = j?.project as { id?: string } | undefined;
    if (created?.id) {
      setShowCreate(false);
      resetCreateForm();
      router.push(`/teacher/classes/${classId}?openGroups=1&projectId=${created.id}`);
    } else {
      await fetchProjects();
      setShowCreate(false);
      resetCreateForm();
    }
    setCreateBusy(false);
  };

  const classOptions = useMemo(() => classes, [classes]);

  return (
    <DashboardLayout initialRole="teacher" overrideHeaderLabel="Projects">
      <div className="p-8 max-w-screen-2xl mx-auto w-full">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-[#111318] tracking-tight">Projects</h1>
              <p className="text-sm text-[#616f89] mt-1">View and manage all your projects across classes</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-blue-700"
            >
              Create project
            </button>
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden border border-[#e5e7eb]">
            <div className="p-6 border-b border-[#eef2f7] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-[#111318]">Create New Project</h2>
                <p className="text-xs text-[#616f89] mt-1">Add project info, then assign groups.</p>
              </div>
              <button
                className="text-[#616f89] hover:text-primary transition-colors"
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
                }}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              className="p-6 max-h-[80vh] overflow-y-auto"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateProject();
              }}
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-5">
              {createError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-[#111318] mb-2">Class</label>
                  <select
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                  >
                    <option value="">Select a class...</option>
                    {classOptions.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-[#111318] mb-2">Due Date</label>
                  <input
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    type="date"
                    value={projectDue}
                    onChange={(e) => setProjectDue(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#111318] mb-2">Project Name</label>
                <input
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Final Group Project Report"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">Assignment Mode</label>
                  <div className="flex flex-wrap gap-2">
                    {(["teacher_assigns", "students_self_assign"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAssignmentMode(mode)}
                        className={`px-3 py-2 text-xs font-semibold rounded-full border transition-all ${
                          assignmentMode === mode
                            ? "bg-primary/10 text-primary border-primary"
                            : "bg-white text-[#657386] border-[#e5e7eb] hover:bg-[#f9fafb]"
                        }`}
                      >
                        {mode === "teacher_assigns" ? "Teacher assigns" : "Students assign"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">Grouping Strategy</label>
                  <div className="flex flex-wrap gap-2">
                    {(["manual", "random_from_survey"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setGroupingStrategy(mode)}
                        className={`px-3 py-2 text-xs font-semibold rounded-full border transition-all ${
                          groupingStrategy === mode
                            ? "bg-primary/10 text-primary border-primary"
                            : "bg-white text-[#657386] border-[#e5e7eb] hover:bg-[#f9fafb]"
                        }`}
                      >
                        {mode === "manual" ? "Manual groups" : "Auto groups"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111318] mb-2">Description</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Add project context"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111318] mb-2">Expectations</label>
                <textarea
                  value={projectExpectations}
                  onChange={(e) => setProjectExpectations(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Define expectations or grading criteria"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111318] mb-2">Rubric / Notes</label>
                <textarea
                  value={projectRubric}
                  onChange={(e) => setProjectRubric(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Add rubric details"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111318] mb-2">Deliverables</label>
                <div className="flex gap-2">
                  <input
                    value={deliverableInput}
                    onChange={(e) => setDeliverableInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Add deliverable"
                  />
                  <button
                    type="button"
                    onClick={addDeliverable}
                    className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#111318] text-sm font-bold hover:bg-[#f9fafb]"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {deliverables.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => removeDeliverable(item)}
                      className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold"
                    >
                      {item}
                      <span className="material-symbols-outlined text-sm ml-1 align-middle">close</span>
                    </button>
                  ))}
                </div>
              </div>
              </div>

              <div>
                <DisengagementFlaggingConfig
                  value={disengagementConfig}
                  onChange={setDisengagementConfig}
                />
              </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eef2f7] mt-6">
                <button
                  className="px-6 py-2.5 text-sm font-bold text-[#616f89] hover:text-[#111318] border border-gray-200 rounded-lg transition-colors"
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    resetCreateForm();
                  }}
                  disabled={createBusy}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2.5 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-60"
                  type="submit"
                  disabled={createBusy || !projectName.trim() || !classId}
                >
                  {createBusy ? "Saving..." : "Next: Assign Groups"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
