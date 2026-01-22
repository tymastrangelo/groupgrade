"use client";

import { useEffect, useMemo, useState } from "react";
import { tasksCache } from "@/lib/tasksCache";

type ClassData = {
  id: string;
  name: string;
  code: string;
  join_code_expires_at?: string | null;
  created_at?: string | null;
};

type Member = {
  id: string;
  name: string;
  email: string;
  userRole: string | null;
  classRole: string;
  avatar_url?: string | null;
  joined_at?: string | null;
};

type Note = {
  id: string;
  content: string;
  created_at?: string | null;
  author_name?: string | null;
};

type Project = {
  id: string;
  name: string;
  due_date?: string | null;
  rubric?: string | null;
  groups?: { id: string; name: string; members: { id: string; name: string; email: string; avatar_url?: string | null }[] }[];
};

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

function badgeColor(role: string) {
  return role === "professor"
    ? "bg-purple-100 text-purple-700/30"
    : "bg-blue-100 text-blue-700/30";
}

function parseRubric(rubric?: string | null) {
  if (!rubric) return {} as Record<string, any>;
  try {
    return JSON.parse(rubric);
  } catch {
    return {} as Record<string, any>;
  }
}

function makeEmptyGroups(count: number) {
  return Array.from({ length: Math.max(1, count) }, (_, idx) => ({
    id: `temp-${idx}`,
    name: `Group ${idx + 1}`,
    member_ids: [] as string[],
  }));
}

export function TeacherClassDetail({ classId }: { classId: string }) {
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDue, setProjectDue] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"teacher_assigns" | "students_self_assign">("teacher_assigns");
  const [groupingStrategy, setGroupingStrategy] = useState<"manual" | "random_from_survey">("manual");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectDescription, setProjectDescription] = useState("");
  const [projectRubric, setProjectRubric] = useState("");
  const [projectExpectations, setProjectExpectations] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>(["Final project report (PDF)", "Peer review form"]);
  const [deliverableInput, setDeliverableInput] = useState("");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [mockBusy, setMockBusy] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);
  const [groupProjectId, setGroupProjectId] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<"auto" | "manual">("auto");
  const [groupSize, setGroupSize] = useState(3);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupBusy, setGroupBusy] = useState(false);
  const [manualGroups, setManualGroups] = useState<{ id: string; name: string; member_ids: string[] }[]>(makeEmptyGroups(3));
  const [manualGroupCount, setManualGroupCount] = useState(3);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const stats = useMemo(() => {
    const professors = members.filter((m) => m.classRole === "professor").length;
    const students = members.filter((m) => m.classRole === "student").length;
    return { total: members.length, professors, students };
  }, [members]);

  const studentMembers = useMemo(() => members.filter((m) => m.classRole === "student"), [members]);

  const unassignedStudents = useMemo(() => {
    const assigned = new Set<string>();
    manualGroups.forEach((g) => g.member_ids.forEach((id) => assigned.add(id)));
    return studentMembers.filter((s) => !assigned.has(s.id));
  }, [studentMembers, manualGroups]);

  const url = `/api/classes/${classId}`;
  const fetchData = async () => {
    setError(null);
    setLoading(true);
    try {
      const j = await tasksCache.fetch<{ class: ClassData; members: any[]; notes: any[]; projects: any[] }>(url);
      if (j) {
        setClassData((j as any).class);
        setMembers((j as any).members || []);
        setNotes((j as any).notes || []);
        setProjects((j as any).projects || []);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load class");
    } finally {
      setLoading(false);
    }
  };

  const notesUrl = `/api/classes/${classId}/notes`;
  const fetchNotes = async () => {
    setNotesLoading(true);
    setNotesError(null);
    try {
      const j = await tasksCache.fetch<{ notes: Note[] }>(notesUrl);
      if (j && (j as any).notes) setNotes((j as any).notes || []);
    } catch (e: any) {
      setNotesError(e.message || "Failed to load notes");
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    if (!classId) return;
    const unsubClass = tasksCache.subscribe(url, (data: any) => {
      if (data) {
        setClassData(data.class);
        setMembers(data.members || []);
        setNotes(data.notes || []);
        setProjects(data.projects || []);
      }
    });
    const unsubNotes = tasksCache.subscribe<{ notes: Note[] }>(notesUrl, (data) => {
      if (data && (data as any).notes) setNotes((data as any).notes || []);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    fetchNotes();
    return () => {
      unsubClass();
      unsubNotes();
    };
  }, [classId]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyMessage("Code copied");
      setTimeout(() => setCopyMessage(null), 1800);
    } catch (e) {
      setCopyMessage("Copy failed");
      setTimeout(() => setCopyMessage(null), 1800);
    }
  };

  const addNote = async () => {
    if (!noteInput.trim()) return;
    const res = await fetch(`/api/classes/${classId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteInput.trim() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setNotesError(j.error || "Failed to add note");
      return;
    }
    setNoteInput("");
    // Revalidate notes via cache fetch
    await fetchNotes();
  };

  const removeStudent = async (userId: string) => {
    setRemoveBusyId(userId);
    setRemoveError(null);
    const res = await fetch(`/api/classes/${classId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setRemoveError(j.error || "Failed to remove student");
      setRemoveBusyId(null);
      return;
    }
    await fetchData();
    setRemoveBusyId(null);
  };

  const mutateCode = async () => {
    setCodeBusy(true);
    const res = await fetch(`/api/classes/${classId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate" }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to update code");
      setCodeBusy(false);
      return;
    }
    const j = await res.json();
    setClassData(j.class);
    // Update class cache with new code
    tasksCache.mutate(url, (prev: any) => ({ ...(prev || {}), class: j.class }));
    setCodeBusy(false);
  };

  const createProject = async () => {
    if (!projectName.trim()) return;
    setProjectBusy(true);
    setProjectError(null);
    const res = await fetch(`/api/classes/${classId}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName.trim(),
        due_date: projectDue || null,
        assignment_mode: assignmentMode,
        grouping_strategy: groupingStrategy,
        description: projectDescription.trim() || undefined,
        rubric_text: projectRubric.trim() || undefined,
        expectations: projectExpectations.trim() || undefined,
        deliverables,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setProjectError(j.error || "Failed to create project");
      setProjectBusy(false);
      return;
    }
    setProjectName("");
    setProjectDue("");
    setProjectDescription("");
    setProjectRubric("");
    setProjectExpectations("");
    setDeliverables(["Final project report (PDF)", "Peer review form"]);
    setDeliverableInput("");
    setShowProjectModal(false);
    // Refresh class data via cache-backed fetch
    await fetchData();
    setProjectBusy(false);
  };

  const addDeliverable = () => {
    if (!deliverableInput.trim()) return;
    setDeliverables((prev) => [...prev, deliverableInput.trim()]);
    setDeliverableInput("");
  };

  const removeDeliverable = (index: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  };

  const addMockStudent = async () => {
    setMockBusy(true);
    setMockError(null);
    const res = await fetch(`/api/classes/${classId}/mock-member`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMockError(j.error || "Failed to add mock student");
      setMockBusy(false);
      return;
    }
    await fetchData();
    setMockBusy(false);
  };

  const confirmDeleteProject = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setProjectError(null);
    const res = await fetch(`/api/classes/${classId}/projects/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setProjectError(j.error || "Failed to delete project");
      setDeleteBusy(false);
      return;
    }
    setDeleteTarget(null);
    setDeleteBusy(false);
    await fetchData();
  };

  const openGrouping = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    let defaultMode: "auto" | "manual" = "auto";
    try {
      const parsed = project?.rubric ? JSON.parse(project.rubric) : {};
      if (parsed.grouping_strategy === "manual") defaultMode = "manual";
      if (parsed.grouping_strategy === "random_from_survey") defaultMode = "auto";
    } catch (e) {
      defaultMode = "auto";
    }
    setGroupMode(defaultMode);

    if (project?.groups?.length) {
      const mapped = project.groups.map((g, idx) => ({
        id: g.id || `group-${idx}`,
        name: g.name,
        member_ids: g.members?.map((m) => m.id) || [],
      }));
      setManualGroups(mapped);
      setManualGroupCount(mapped.length || 3);
    } else {
      setManualGroups(makeEmptyGroups(manualGroupCount));
    }

    setGroupProjectId(projectId);
    setGroupError(null);
    setGroupBusy(false);
  };

  const adjustGroupCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(12, count));
    setManualGroups((prev) => {
      const trimmed = prev.slice(0, safeCount);
      const base = [...trimmed];
      while (base.length < safeCount) {
        base.push({ id: `temp-${Date.now()}-${base.length}`, name: `Group ${base.length + 1}`, member_ids: [] });
      }
      return base;
    });
    setManualGroupCount(safeCount);
  };

  const handleDrop = (targetId: string | null) => {
    if (!draggingId) return;
    setManualGroups((prev) => {
      const without = prev.map((g) => ({ ...g, member_ids: g.member_ids.filter((id) => id !== draggingId) }));
      if (!targetId) return without;
      return without.map((g) => (g.id === targetId ? { ...g, member_ids: [...g.member_ids, draggingId] } : g));
    });
    setDraggingId(null);
  };

  const submitGrouping = async () => {
    if (!groupProjectId) return;
    setGroupBusy(true);
    setGroupError(null);
    const payload =
      groupMode === "auto"
        ? { mode: "auto", group_size: groupSize }
        : { mode: "manual", groups: manualGroups.map((g) => ({ name: g.name, member_ids: g.member_ids })) };

    const res = await fetch(`/api/classes/${classId}/projects/${groupProjectId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setGroupError(j.error || "Failed to save groups");
      setGroupBusy(false);
      return;
    }

    await fetchData();
    setGroupBusy(false);
    setGroupProjectId(null);
  };

  if (loading) {
    return <div className="text-sm text-[#616f89]">Loading...</div>;
  }

  if (error || !classData) {
    return <div className="text-sm text-red-600">{error || "Class not found"}</div>;
  }

  return (
    <div className="p-8 max-w-screen-2xl mx-auto w-full">
      <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-[#e5e7eb] p-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#616f89]">Class</p>
              <h1 className="text-3xl font-black text-[#111318] tracking-tight">{classData.name}</h1>
              <p className="text-xs text-[#616f89] mt-1">Created {formatDate(classData.created_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 rounded-lg bg-[#f3f4f6] text-xs text-[#616f89]">
                Expires {formatDate(classData.join_code_expires_at) || "soon"}
              </div>
              <button
                onClick={mutateCode}
                disabled={codeBusy}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60"
                title="Regenerate code"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
              </button>
              <button
                onClick={() => copyCode(classData.code)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20"
              >
                <span className="material-symbols-outlined text-base">content_copy</span>
                {copyMessage ?? classData.code}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
              <p className="text-xs text-[#616f89]">Total members</p>
              <p className="text-2xl font-bold text-[#111318]">{stats.total}</p>
            </div>
            <div className="p-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
              <p className="text-xs text-[#616f89]">Students</p>
              <p className="text-2xl font-bold text-[#111318]">{stats.students}</p>
            </div>
            <div className="p-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
              <p className="text-xs text-[#616f89]">Professors</p>
              <p className="text-2xl font-bold text-[#111318]">{stats.professors}</p>
            </div>
          </div>

          <div className="rounded-lg border border-[#e5e7eb] p-4 flex flex-col gap-2 bg-[#fdfefe]">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-base">tips_and_updates</span>
              <p className="text-sm font-semibold">Share this code with students to join.</p>
            </div>
            <p className="text-xs text-[#616f89]">Codes expire after 14 days. Students can join from their dashboard using the join form.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-[#111318]">Class content</h3>
          <p className="text-sm text-[#616f89]">Share notes or announcements for students.</p>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Add a note"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
            />
            <button
              onClick={addNote}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              disabled={!noteInput.trim()}
            >
              Add
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {notesLoading ? (
              <div className="text-sm text-[#616f89]">Loading notes...</div>
            ) : notesError ? (
              <div className="text-sm text-red-600">{notesError}</div>
            ) : notes.length === 0 ? (
              <p className="text-sm text-[#616f89]">No notes yet.</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-sm text-[#111318]"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-semibold text-xs text-[#4b5563]">{note.author_name || "Professor"}</p>
                    <p className="text-[10px] text-[#9ca3af]">{formatDate(note.created_at)}</p>
                  </div>
                  <p className="mt-1 leading-snug">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#111318]">Projects</h3>
            <p className="text-sm text-[#616f89]">Create projects, choose grouping, and who assigns tasks.</p>
          </div>
          <button
            onClick={() => {
              setProjectError(null);
              setProjectName("");
              setProjectDue("");
              setProjectDescription("");
              setProjectRubric("");
              setProjectExpectations("");
              setDeliverables(["Final project report (PDF)", "Peer review form"]);
              setDeliverableInput("");
              setShowProjectModal(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            New project
          </button>
        </div>
        {projectError && <div className="text-sm text-red-600">{projectError}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-2 text-sm text-[#616f89]">No projects yet.</div>
          ) : (
            projects.map((p) => {
              const parsed = parseRubric(p.rubric);
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-[#e5e7eb] bg-white flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <a href={`/teacher/projects/${p.id}`} className="text-lg font-bold text-[#111318] hover:text-primary">
                        {p.name}
                      </a>
                      {p.due_date && <p className="text-xs text-[#616f89]">Due {formatDate(p.due_date)}</p>}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                          {parsed.assignment_mode === "students_self_assign" ? "Students assign" : "Teacher assigns"}
                        </span>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700/30">
                          {parsed.grouping_strategy === "random_from_survey" ? "Random (survey)" : "Manual groups"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end items-center">
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="p-2 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50/30"
                        title="Delete project"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                      <button
                        onClick={() => openGrouping(p.id)}
                        className="text-sm font-bold px-3 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10"
                      >
                        {p.groups && p.groups.length ? "Edit groups" : "Set groups"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {parsed.description && <p className="text-sm text-[#111318] leading-snug">{parsed.description}</p>}
                    {parsed.expectations && (
                      <div className="text-sm text-[#616f89]">
                        <span className="font-semibold text-[#111318]">Expectations: </span>
                        {parsed.expectations}
                      </div>
                    )}
                    {Array.isArray(parsed.deliverables) && parsed.deliverables.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[#616f89]">Deliverables</p>
                        <ul className="list-disc list-inside text-sm text-[#111318] space-y-1">
                          {parsed.deliverables.map((d: string, idx: number) => (
                            <li key={`${p.id}-del-${idx}`}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <a href={`/teacher/projects/${p.id}`} className="text-sm font-bold text-primary hover:underline">View project details</a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-[#111318]">Members</h3>
            <p className="text-sm text-[#616f89]">Professor and student roster for this class.</p>
          </div>
          <div className="flex items-center gap-2">
            {mockError && <span className="text-xs text-red-600">{mockError}</span>}
            <button
              onClick={addMockStudent}
              disabled={mockBusy}
              className="text-sm font-bold px-3 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
            >
              {mockBusy ? "Adding..." : "Add mock student"}
            </button>
          </div>
        </div>
        {removeError && <div className="text-sm text-red-600 mb-2">{removeError}</div>}
        {members.length === 0 ? (
          <div className="text-sm text-[#616f89]">No members yet.</div>
        ) : (
          <div className="divide-y divide-[#e5e7eb]">
            {members.map((m) => (
              <div key={`${m.id}-${m.classRole}`} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} src={m.avatar_url} />
                  <div>
                    <p className="text-sm font-semibold text-[#111318]">{m.name}</p>
                    <p className="text-xs text-[#616f89]">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${badgeColor(m.classRole)}`}>
                    {m.classRole === "professor" ? "Professor" : "Student"}
                  </span>
                  <p className="text-xs text-[#616f89]">Joined {formatDate(m.joined_at)}</p>
                  {m.classRole === "student" && (
                    <button
                      onClick={() => removeStudent(m.id)}
                      disabled={removeBusyId === m.id}
                      className="text-xs font-bold px-2.5 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {removeBusyId === m.id ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-bold text-[#111318]">Create project</h4>
                <p className="text-sm text-[#616f89]">Set basics and grouping preferences.</p>
              </div>
              <button onClick={() => setShowProjectModal(false)} className="text-[#616f89] hover:text-[#111318]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-[#111318]">
                Project name
                <input
                  className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Final Report"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </label>

              <label className="text-sm font-semibold text-[#111318]">
                Due date (optional)
                <input
                  type="date"
                  className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={projectDue}
                  onChange={(e) => setProjectDue(e.target.value)}
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm font-semibold text-[#111318]">
                  Assignment mode
                  <select
                    className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={assignmentMode}
                    onChange={(e) => setAssignmentMode(e.target.value as any)}
                  >
                    <option value="teacher_assigns">Teacher assigns tasks</option>
                    <option value="students_self_assign">Students self-assign</option>
                  </select>
                </label>

                <label className="text-sm font-semibold text-[#111318]">
                  Grouping strategy
                  <select
                    className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={groupingStrategy}
                    onChange={(e) => setGroupingStrategy(e.target.value as any)}
                  >
                    <option value="manual">Manual grouping</option>
                    <option value="random_from_survey">Random using survey strengths</option>
                  </select>
                </label>
              </div>

              <label className="text-sm font-semibold text-[#111318]">
                Description
                <textarea
                  className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Explain the project goals and expectations"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
              </label>

              <label className="text-sm font-semibold text-[#111318]">
                Grading rubric
                <textarea
                  className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  rows={3}
                  placeholder="Criteria 1: ..."
                  value={projectRubric}
                  onChange={(e) => setProjectRubric(e.target.value)}
                />
              </label>

              <label className="text-sm font-semibold text-[#111318]">
                Expectations / notes
                <textarea
                  className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Anything else students should know"
                  value={projectExpectations}
                  onChange={(e) => setProjectExpectations(e.target.value)}
                />
              </label>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-[#111318]">Deliverables</p>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {deliverables.map((d, idx) => (
                    <div key={`${d}-${idx}`} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
                      <span>{d}</span>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => removeDeliverable(idx)}
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))}
                  {deliverables.length === 0 && <p className="text-sm text-[#616f89]">No deliverables yet.</p>}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Add a deliverable"
                    value={deliverableInput}
                    onChange={(e) => setDeliverableInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDeliverable();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg text-sm font-bold bg-primary/10 text-primary"
                    onClick={addDeliverable}
                  >
                    Add
                  </button>
                </div>
              </div>

              {projectError && <div className="text-sm text-red-600">{projectError}</div>}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowProjectModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold border border-[#e5e7eb] text-[#111318]"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={projectBusy || !projectName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white disabled:opacity-50"
              >
                {projectBusy ? "Saving..." : "Create project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-6 flex flex-col gap-4">
            <div>
              <h4 className="text-lg font-bold text-[#111318]">Delete project?</h4>
              <p className="text-sm text-[#616f89]">This removes {deleteTarget.name} and any groups attached to it.</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold border border-[#e5e7eb] text-[#111318]"
                disabled={deleteBusy}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProject}
                disabled={deleteBusy}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500 text-white disabled:opacity-50"
              >
                {deleteBusy ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {groupProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-bold text-[#111318]">Set groups</h4>
                <p className="text-sm text-[#616f89]">Build teams manually or auto-balance using strengths.</p>
              </div>
              <button onClick={() => setGroupProjectId(null)} className="text-[#616f89] hover:text-[#111318]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                  groupMode === "auto"
                    ? "bg-primary text-white border-primary"
                    : "border-[#e5e7eb] text-[#111318]"
                }`}
                onClick={() => setGroupMode("auto")}
              >
                Auto (strengths)
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                  groupMode === "manual"
                    ? "bg-primary text-white border-primary"
                    : "border-[#e5e7eb] text-[#111318]"
                }`}
                onClick={() => setGroupMode("manual")}
              >
                Manual (drag & drop)
              </button>
            </div>

            {groupMode === "auto" ? (
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-[#111318]">
                  Preferred group size (2-6)
                  <input
                    type="number"
                    min={2}
                    max={6}
                    value={groupSize}
                    onChange={(e) => setGroupSize(Number(e.target.value))}
                    className="mt-1 w-24 bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <p className="text-sm text-[#616f89]">We’ll balance teams by total strengths and distribute round-robin.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-[#111318]">
                    Number of groups
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={manualGroupCount}
                      onChange={(e) => adjustGroupCount(Number(e.target.value))}
                      className="mt-1 w-24 bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>
                  <p className="text-sm text-[#616f89]">Drag students into groups; unassigned stay in the right column.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {manualGroups.map((g, idx) => (
                      <div
                        key={g.id}
                        className="border border-[#e5e7eb] rounded-lg p-3 min-h-36"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(g.id)}
                      >
                        <div className="flex items-center justify-between">
                          <input
                            className="text-sm font-semibold bg-transparent border-b border-dashed border-[#e5e7eb] focus:outline-none"
                            value={g.name}
                            onChange={(e) =>
                              setManualGroups((prev) =>
                                prev.map((grp) => (grp.id === g.id ? { ...grp, name: e.target.value || `Group ${idx + 1}` } : grp))
                              )
                            }
                          />
                          <span className="text-xs text-[#616f89]">{g.member_ids.length} members</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 min-h-16">
                          {g.member_ids.map((id) => {
                            const stu = studentMembers.find((s) => s.id === id);
                            return (
                              <div
                                key={id}
                                draggable
                                onDragStart={() => setDraggingId(id)}
                                className="flex items-center gap-2 px-2 py-1 rounded-full bg-[#f3f4f6] text-xs text-[#111318] border border-[#e5e7eb] cursor-move"
                              >
                                <Avatar name={stu?.name || "Student"} src={stu?.avatar_url} size="h-6 w-6" />
                                {stu?.name || "Student"}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="border border-dashed border-[#e5e7eb] rounded-lg p-3 bg-[#f9fafb]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(null)}
                  >
                    <p className="text-sm font-semibold text-[#111318] mb-2">Unassigned</p>
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                      {unassignedStudents.length === 0 ? (
                        <p className="text-sm text-[#616f89]">Everyone is assigned.</p>
                      ) : (
                        unassignedStudents.map((s) => (
                          <div
                            key={s.id}
                            draggable
                            onDragStart={() => setDraggingId(s.id)}
                            className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white text-sm text-[#111318] border border-[#e5e7eb] cursor-move"
                          >
                            <Avatar name={s.name} src={s.avatar_url} />
                            <div className="flex flex-col">
                              <span className="font-semibold leading-tight">{s.name}</span>
                              <span className="text-xs text-[#616f89]">{s.email}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {groupError && <div className="text-sm text-red-600">{groupError}</div>}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setGroupProjectId(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold border border-[#e5e7eb] text-[#111318]"
              >
                Cancel
              </button>
              <button
                onClick={submitGrouping}
                disabled={
                  groupBusy ||
                  (groupMode === "manual" && manualGroups.every((g) => g.member_ids.length === 0))
                }
                className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white disabled:opacity-50"
              >
                {groupBusy ? "Saving..." : "Save groups"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

