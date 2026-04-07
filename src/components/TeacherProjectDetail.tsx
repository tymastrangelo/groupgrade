"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { tasksCache } from "@/lib/tasksCache";
import StudentProjectDetail from "@/components/StudentProjectDetail";
import { TeacherClassDetail } from "@/components/TeacherClassDetail";
import { DisengagementFlaggingConfig, DisengagementConfig, DEFAULT_DISENGAGEMENT_CONFIG } from "@/components/DisengagementFlaggingConfig";

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
  rubric_file_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  disengagement_config: any;
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
  // datetime-local format: "2026-04-10T23:59"
  // We need to ensure this is interpreted as local time, not UTC
  // Create date by parsing the components to avoid timezone issues
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create date in local timezone
  const d = new Date(year, month - 1, day, hours, minutes);
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
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showProjectOverviewModal, setShowProjectOverviewModal] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpectations, setEditExpectations] = useState("");
  const [editDeliverables, setEditDeliverables] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editRubricFile, setEditRubricFile] = useState<File | null>(null);
  const [disengagementConfig, setDisengagementConfig] = useState<DisengagementConfig>(DEFAULT_DISENGAGEMENT_CONFIG);

  const url = `/api/projects/${projectId}`;

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
        // Load disengagement config
        if (p.disengagement_config) {
          try {
            const config = typeof p.disengagement_config === 'string' 
              ? JSON.parse(p.disengagement_config)
              : p.disengagement_config;
            setDisengagementConfig(config);
          } catch (e) {
            console.error('Failed to parse disengagement_config:', e);
            setDisengagementConfig(DEFAULT_DISENGAGEMENT_CONFIG);
          }
        } else {
          setDisengagementConfig(DEFAULT_DISENGAGEMENT_CONFIG);
        }
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
        // Load disengagement config
        if (p.disengagement_config) {
          try {
            const config = typeof p.disengagement_config === 'string' 
              ? JSON.parse(p.disengagement_config)
              : p.disengagement_config;
            setDisengagementConfig(config);
          } catch (e) {
            console.error('Failed to parse disengagement_config:', e);
            setDisengagementConfig(DEFAULT_DISENGAGEMENT_CONFIG);
          }
        } else {
          setDisengagementConfig(DEFAULT_DISENGAGEMENT_CONFIG);
        }
      }
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProject();
    return () => {
      unsubscribe();
    };
  }, [projectId]);

  useEffect(() => {
    if (!selectedGroupId && project?.groups?.length) {
      setSelectedGroupId(project.groups[0].id);
    }
  }, [project?.groups, selectedGroupId]);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    setError(null);
    
    // Use FormData if there's a file to upload
    const formData = new FormData();
    formData.append('name', editName.trim());
    formData.append('description', editDescription.trim());
    formData.append('expectations', editExpectations.trim());
    formData.append('deliverables', editDeliverables.trim());
    const dueDate = fromLocalInput(editDueDate);
    if (dueDate) formData.append('due_date', dueDate);
    if (editRubricFile) formData.append('rubric_file', editRubricFile);
    formData.append('disengagement_config', JSON.stringify(disengagementConfig));
    
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: formData,
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to save");
      setSaving(false);
      return;
    }
    // Invalidate cache to ensure fresh data
    tasksCache.invalidate(url);
    await fetchProject();
    setEditMode(false);
    setEditRubricFile(null);
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
              <button
                onClick={() => setShowProjectOverviewModal(true)}
                className="text-sm font-bold px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#111318] hover:bg-[#f9fafb] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">info</span>
                Project info
              </button>
            </div>
          </div>
        </div>

        {!editMode && (
          <>
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-lg font-bold text-[#111318]">Groups ({project.groups.length})</h3>
                <button
                  onClick={() => setShowGroupsModal(true)}
                  className="text-sm font-bold px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10"
                >
                  Manage groups
                </button>
              </div>
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
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-[#616f89]">{g.members.length} total members</span>
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

            <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-lg font-bold text-[#111318]">Student View Preview</h3>
                  <p className="text-sm text-[#616f89]">See exactly what students see for the selected group.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[#616f89]">Group</label>
                  <select
                    value={selectedGroupId || ""}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm"
                  >
                    {project.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedGroupId ? (
                <div className="rounded-xl border border-[#e5e7eb] overflow-hidden">
                  <StudentProjectDetail projectId={projectId} previewGroupId={selectedGroupId} hideLayout={true} />
                </div>
              ) : (
                <p className="text-sm text-[#616f89]">Select a group to preview the student view.</p>
              )}
            </div>
          </>
        )}

        {/* Project Overview Modal */}
        {showProjectOverviewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] shrink-0">
                <h2 className="text-lg font-bold text-[#111318] flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">info</span>
                  Project Overview
                </h2>
                <button
                  onClick={() => {
                    setShowProjectOverviewModal(false);
                    setEditMode(false);
                  }}
                  className="text-[#616f89] hover:text-[#111318] text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                {!editMode ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-[#111318] mb-1">{project.name}</h3>
                        <p className="text-sm text-[#616f89]">{project.class_name}</p>
                      </div>
                      {project.is_professor && (
                        <button
                          onClick={() => setEditMode(true)}
                          className="text-sm font-bold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
                        >
                          Edit details
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f9fafb] border border-[#e5e7eb]">
                      <span className="material-symbols-outlined text-primary text-2xl">event</span>
                      <div>
                        <p className="text-xs font-bold text-[#616f89] uppercase tracking-wider">Due Date</p>
                        <p className="text-sm font-semibold text-[#111318]">{formatDate(project?.due_date) || "No due date set"}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#111318] mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#616f89] text-lg">description</span>
                        Description
                      </h4>
                      <p className="text-sm text-[#616f89] leading-relaxed bg-[#f9fafb] p-4 rounded-lg border border-[#e5e7eb] whitespace-pre-wrap">
                        {project?.description || "No description available"}
                      </p>
                    </div>

                    {project?.expectations && (
                      <div>
                        <h4 className="text-sm font-bold text-[#111318] mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#616f89] text-lg">checklist</span>
                          Expectations
                        </h4>
                        <p className="text-sm text-[#616f89] leading-relaxed bg-[#f9fafb] p-4 rounded-lg border border-[#e5e7eb] whitespace-pre-wrap">
                          {project.expectations}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-[#111318] mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#616f89] text-lg">assignment</span>
                        Deliverables (from instructor)
                      </h4>
                      {project?.deliverables ? (
                        <ul className="list-disc list-inside text-sm text-[#111318] space-y-1">
                          {project.deliverables.split("\n").filter(Boolean).map((d: string, idx: number) => (
                            <li key={`proj-del-${idx}`}>{d.trim()}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#616f89]">No instructor-defined deliverables.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#111318]">Edit project details</h3>
                      <button onClick={() => setEditMode(false)} className="text-[#616f89] hover:text-[#111318]">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
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
                        className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-25"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Describe the project goals and overview"
                      />
                    </label>
                    <label className="text-sm font-semibold text-[#111318]">
                      Expectations
                      <textarea
                        className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-20"
                        value={editExpectations}
                        onChange={(e) => setEditExpectations(e.target.value)}
                        placeholder="What do you expect from students?"
                      />
                    </label>
                    <label className="text-sm font-semibold text-[#111318]">
                      Deliverables (one per line)
                      <textarea
                        className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-20"
                        value={editDeliverables}
                        onChange={(e) => setEditDeliverables(e.target.value)}
                        placeholder="Final report&#10;Presentation slides&#10;Source code"
                      />
                    </label>
                    
                    <div className="flex flex-col gap-3">
                      <label className="text-sm font-semibold text-[#111318]">
                        Grading Rubric (PDF)
                        {project?.rubric_file_url && !editRubricFile && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <a
                              href={project.rubric_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-[#f9fafb] transition-colors"
                            >
                              <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                              Current Rubric
                            </a>
                          </div>
                        )}
                        <div className="mt-2">
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            id="edit-rubric-file-input"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.type === 'application/pdf') {
                                setEditRubricFile(file);
                              } else if (file) {
                                alert('Please select a PDF file');
                                e.target.value = '';
                              }
                            }}
                          />
                          <label
                            htmlFor="edit-rubric-file-input"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-[#f9fafb] cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">upload_file</span>
                            {editRubricFile ? 'Change PDF' : (project?.rubric_file_url ? 'Replace PDF' : 'Upload PDF')}
                          </label>
                          {editRubricFile && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-[#616f89]">
                              <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                              <span className="flex-1 truncate">{editRubricFile.name}</span>
                              <button
                                type="button"
                                onClick={() => setEditRubricFile(null)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <span className="material-symbols-outlined text-base">close</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>

                    <div className="mt-6">
                      <DisengagementFlaggingConfig
                        value={disengagementConfig}
                        onChange={setDisengagementConfig}
                      />
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
                        onClick={async () => {
                          await handleSave();
                          setEditMode(false);
                        }}
                        disabled={saving || !editName.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manage Groups Modal */}
        {showGroupsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <div>
                  <h2 className="text-lg font-bold text-[#111318]">Manage Groups</h2>
                  <p className="text-xs text-[#616f89]">Edit and save group assignments.</p>
                </div>
                <button
                  onClick={() => setShowGroupsModal(false)}
                  className="text-[#616f89] hover:text-[#111318] text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TeacherClassDetail
                  classId={project.class_id}
                  embeddedGroups={true}
                  initialGroupProjectId={project.id}
                  onClose={() => setShowGroupsModal(false)}
                  onGroupsSaved={async () => {
                    tasksCache.invalidate(url);
                    await fetchProject();
                  }}
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
