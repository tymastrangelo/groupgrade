"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { tasksCache } from "@/lib/tasksCache";
import { DisengagementFlaggingConfig, DisengagementConfig, DEFAULT_DISENGAGEMENT_CONFIG } from "@/components/DisengagementFlaggingConfig";

type ClassData = {
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
  auto_generate_code?: boolean | null;
};

type Member = {
  id: string;
  name: string;
  email: string;
  userRole: string | null;
  classRole: string;
  staffRole?: string | null;
  avatar_url?: string | null;
  joined_at?: string | null;
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

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString();
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

function generateGroupName(existing: Set<string>) {
  let counter = 1;
  let name = `Group ${counter}`;
  while (existing.has(name)) {
    counter += 1;
    name = `Group ${counter}`;
  }
  existing.add(name);
  return name;
}

export function TeacherClassDetail({
  classId,
  embeddedGroups = false,
  initialGroupProjectId,
  onClose,
  onGroupsSaved,
}: {
  classId: string;
  embeddedGroups?: boolean;
  initialGroupProjectId?: string;
  onClose?: () => void;
  onGroupsSaved?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
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
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [disengagementConfig, setDisengagementConfig] = useState<DisengagementConfig>(DEFAULT_DISENGAGEMENT_CONFIG);
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
  const [openedFromQuery, setOpenedFromQuery] = useState(false);
  const [isSavingGroups, setIsSavingGroups] = useState(false);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTerm, setEditTerm] = useState("Spring 2026");
  const [editLocation, setEditLocation] = useState("");
  const [editMeetingDays, setEditMeetingDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [editStartTime, setEditStartTime] = useState("10:00");
  const [editEndTime, setEditEndTime] = useState("11:15");
  const [editAutoGenerateCode, setEditAutoGenerateCode] = useState(true);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<"professor" | "ta">("ta");
  const [staffPreview, setStaffPreview] = useState<any>(null);
  const [lookingUpStaff, setLookingUpStaff] = useState(false);
  const [invitingStaff, setInvitingStaff] = useState(false);

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

  const filteredUnassignedStudents = useMemo(() => {
    if (!unassignedSearch.trim()) return unassignedStudents;
    const term = unassignedSearch.toLowerCase();
    return unassignedStudents.filter((s) =>
      [s.name, s.email].some((v) => (v || "").toLowerCase().includes(term))
    );
  }, [unassignedStudents, unassignedSearch]);

  const url = `/api/classes/${classId}`;
  const fetchData = async () => {
    setError(null);
    setLoading(true);
    try {
      const j = await tasksCache.fetch<{ class: ClassData; members: any[]; projects: any[] }>(url);
      if (j) {
        setClassData((j as any).class);
        setMembers((j as any).members || []);
        setProjects((j as any).projects || []);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load class");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!classId) return;
    const unsubClass = tasksCache.subscribe(url, (data: any) => {
      if (data) {
        setClassData(data.class);
        setMembers(data.members || []);
        setProjects(data.projects || []);
      }
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    return () => {
      unsubClass();
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

  const openEditModal = () => {
    if (!classData) return;
    setEditName(classData.name || "");
    setEditTerm(classData.term || "Spring 2026");
    setEditLocation(classData.location || "");
    setEditMeetingDays(classData.meeting_days || ["Mon", "Wed", "Fri"]);
    setEditStartTime(classData.start_time || "10:00");
    setEditEndTime(classData.end_time || "11:15");
    setEditAutoGenerateCode(classData.auto_generate_code ?? true);
    setEditError(null);
    setShowEditModal(true);
  };

  const toggleEditDay = (day: string) => {
    setEditMeetingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const lookupEducator = async () => {
    if (!staffEmail.trim()) return;
    setLookingUpStaff(true);
    setStaffPreview(null);
    try {
      const res = await fetch('/api/educators/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffEmail.trim() }),
      });
      const data = await res.json();
      if (data.found) {
        setStaffPreview(data);
      } else {
        setStaffPreview({ found: false, message: data.message });
      }
    } catch (e) {
      console.error('Error looking up educator:', e);
      setStaffPreview({ found: false, message: 'Error looking up educator' });
    } finally {
      setLookingUpStaff(false);
    }
  };

  const inviteStaff = async () => {
    if (!staffPreview?.found || !staffPreview.educator) return;
    setInvitingStaff(true);
    try {
      const res = await fetch(`/api/classes/${classId}/invite-staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          educatorId: staffPreview.educator.id,
          role: staffRole,
        }),
      });
      if (res.ok) {
        setStaffEmail('');
        setStaffPreview(null);
        await fetchData(); // Refresh members list
      } else {
        const data = await res.json();
        setEditError(data.error || 'Failed to send invitation');
      }
    } catch (e) {
      console.error('Error inviting staff:', e);
      setEditError('Error inviting staff');
    } finally {
      setInvitingStaff(false);
    }
  };

  const saveClassEdits = async () => {
    if (!editName.trim()) return;
    setEditBusy(true);
    setEditError(null);
    const res = await fetch(`/api/classes/${classId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        term: editTerm,
        location: editLocation,
        meetingDays: editMeetingDays,
        startTime: editStartTime,
        endTime: editEndTime,
        autoGenerateCode: editAutoGenerateCode,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setEditError(j.error || "Failed to update class");
      setEditBusy(false);
      return;
    }

    const j = await res.json().catch(() => ({}));
    const updated = j?.class as ClassData | undefined;
    if (updated) {
      setClassData(updated);
      tasksCache.mutate(url, (prev: any) => {
        if (!prev) return prev;
        return { ...prev, class: updated };
      });
    }
    setShowEditModal(false);
    setEditBusy(false);
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
    
    // Convert datetime-local to ISO string to preserve timezone
    let dueDateISO = null;
    if (projectDue) {
      console.log('[Create Project] Raw projectDue value:', projectDue);
      // Parse datetime-local format: "2026-04-10T23:59"
      const [datePart, timePart] = projectDue.split('T');
      if (datePart && timePart) {
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        console.log('[Create Project] Parsed components:', { year, month, day, hours, minutes });
        // Create date in local timezone
        const localDate = new Date(year, month - 1, day, hours, minutes || 0);
        dueDateISO = localDate.toISOString();
        console.log('[Create Project] Local date:', localDate);
        console.log('[Create Project] ISO string to send:', dueDateISO);
      }
    }
    
    // Use FormData if there's a file to upload
    const formData = new FormData();
    formData.append('name', projectName.trim());
    if (dueDateISO) formData.append('due_date', dueDateISO);
    formData.append('assignment_mode', assignmentMode);
    formData.append('grouping_strategy', groupingStrategy);
    if (projectDescription.trim()) formData.append('description', projectDescription.trim());
    if (projectRubric.trim()) formData.append('rubric_text', projectRubric.trim());
    if (projectExpectations.trim()) formData.append('expectations', projectExpectations.trim());
    formData.append('deliverables', JSON.stringify(deliverables));
    formData.append('disengagement_config', JSON.stringify(disengagementConfig));
    if (rubricFile) formData.append('rubric_file', rubricFile);
    
    const res = await fetch(`/api/classes/${classId}/projects`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setProjectError(j.error || "Failed to create project");
      setProjectBusy(false);
      return;
    }
    const responseData = await res.json();
    console.log('[Create Project] API response:', responseData);
    console.log('[Create Project] Returned due_date:', responseData?.project?.due_date);
    
    setProjectName("");
    setProjectDue("");
    setProjectDescription("");
    setProjectRubric("");
    setProjectExpectations("");
    setDeliverables(["Final project report (PDF)", "Peer review form"]);
    setDeliverableInput("");
    setRubricFile(null);
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

  useEffect(() => {
    if (openedFromQuery) return;
    if (isSavingGroups) return; // Don't re-trigger during save operation
    if (initialGroupProjectId && projects.length > 0) {
      openGrouping(initialGroupProjectId);
      setOpenedFromQuery(true);
      return;
    }
    const openGroups = searchParams?.get("openGroups");
    const projectId = searchParams?.get("projectId");
    if (openGroups && projectId && projects.length > 0) {
      openGrouping(projectId);
      setOpenedFromQuery(true);
      if (!embeddedGroups) {
        router.replace(`/teacher/classes/${classId}`);
      }
    }
  }, [openedFromQuery, searchParams, projects, classId, router, embeddedGroups, initialGroupProjectId, isSavingGroups]);

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

  const addManualGroup = () => {
    setManualGroups((prev) => {
      const existingNames = new Set(prev.map((g) => g.name));
      const name = generateGroupName(existingNames);
      const nextIndex = prev.length + 1;
      return [...prev, { id: `temp-${Date.now()}-${nextIndex}`, name, member_ids: [] }];
    });
    setManualGroupCount((prev) => Math.min(12, prev + 1));
  };

  const removeManualGroup = (groupId: string) => {
    setManualGroups((prev) => prev.filter((g) => g.id !== groupId));
    setManualGroupCount((prev) => Math.max(1, prev - 1));
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
    setIsSavingGroups(true);
    const currentProjectId = groupProjectId; // capture before any state changes
    const payload =
      groupMode === "auto"
        ? { mode: "auto", group_size: groupSize }
        : { mode: "manual", groups: manualGroups.map((g) => ({ id: g.id, name: g.name, member_ids: g.member_ids })) };

    const res = await fetch(`/api/classes/${classId}/projects/${currentProjectId}/groups`, {
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

    tasksCache.invalidate(`/api/classes/${classId}`);
    
    if (embeddedGroups) {
      // Re-fetch data and then re-open grouping with fresh data
      const freshRes = await fetch(`/api/classes/${classId}`);
      if (freshRes.ok) {
        const freshData = await freshRes.json();
        const freshProject = freshData.projects?.find((p: any) => p.id === currentProjectId);
        
        if (freshProject?.groups?.length) {
          const mapped = freshProject.groups.map((g: any, idx: number) => ({
            id: g.id || `group-${idx}`,
            name: g.name,
            member_ids: g.members?.map((m: any) => m.id) || [],
          }));
          setManualGroups(mapped);
          setManualGroupCount(mapped.length || 3);
        }
      }
      
      // Notify parent component that groups were saved
      if (onGroupsSaved) {
        await onGroupsSaved();
      }
      
      setGroupBusy(false);
      setIsSavingGroups(false);
    } else {
      await fetchData();
      setGroupBusy(false);
      setGroupProjectId(null);
      setIsSavingGroups(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-[#616f89]">Loading...</div>;
  }

  if (error || !classData) {
    return <div className="text-sm text-red-600">{error || "Class not found"}</div>;
  }

  const renderGroupModalBody = (showHeader: boolean) => (
    <>
      {showHeader && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-xl font-bold text-[#111318]">Set groups</h4>
            <p className="text-sm text-[#616f89]">Choose a strategy and organize students into teams.</p>
          </div>
          <button onClick={() => {
            if (embeddedGroups && onClose) {
              onClose();
            } else {
              setGroupProjectId(null);
            }
          }} className="text-[#616f89] hover:text-[#111318]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setGroupMode("manual")}
          className={`text-left border-2 rounded-xl p-4 transition-all ${
            groupMode === "manual"
              ? "border-primary bg-primary/5"
              : "border-[#e5e7eb] hover:border-primary/30"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary">edit_note</span>
            <span className="text-sm font-bold text-[#111318]">Manual Assignment</span>
          </div>
          <p className="text-xs text-[#616f89]">Drag students into groups to build teams intentionally.</p>
        </button>
        <button
          type="button"
          onClick={() => setGroupMode("auto")}
          className={`text-left border-2 rounded-xl p-4 transition-all ${
            groupMode === "auto"
              ? "border-primary bg-primary/5"
              : "border-[#e5e7eb] hover:border-primary/30"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary">diversity_3</span>
            <span className="text-sm font-bold text-[#111318]">Auto Balance</span>
          </div>
          <p className="text-xs text-[#616f89]">Balance teams using student strengths and preferences.</p>
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
          <p className="text-sm text-[#616f89]">We’ll distribute students evenly while balancing strengths.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#111318]">Groups</p>
              <p className="text-sm text-[#616f89]">Drag and drop students between groups.</p>
            </div>
            <button
              type="button"
              onClick={addManualGroup}
              className="px-4 py-2 rounded-lg text-sm font-bold border border-[#e5e7eb] text-[#111318] hover:bg-[#f9fafb] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Add group
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="border border-[#e5e7eb] rounded-xl p-4 bg-[#fafafa]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(null)}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#111318] uppercase tracking-wider">Unassigned</p>
                <span className="text-[10px] text-[#616f89] font-bold">{filteredUnassignedStudents.length}</span>
              </div>
              <div className="relative mb-3">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] text-base">search</span>
                <input
                  value={unassignedSearch}
                  onChange={(e) => setUnassignedSearch(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e5e7eb] rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {filteredUnassignedStudents.length === 0 ? (
                  <p className="text-sm text-[#616f89]">Everyone is assigned.</p>
                ) : (
                  filteredUnassignedStudents.map((s) => (
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

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {manualGroups.map((g, idx) => (
                <div
                  key={g.id}
                  className="border border-[#e5e7eb] rounded-xl p-3 min-h-36 bg-white"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(g.id)}
                >
                  <div className="flex items-center justify-between">
                    <input
                      className="text-sm font-semibold bg-transparent border-b border-dashed border-[#e5e7eb] focus:outline-none"
                      value={g.name}
                      onChange={(e) => {
                        const newName = e.target.value || `Group ${idx + 1}`;
                        const isDuplicate = manualGroups.some(
                          (grp) => grp.id !== g.id && grp.name.toLowerCase() === newName.toLowerCase()
                        );
                        if (!isDuplicate) {
                          setManualGroups((prev) =>
                            prev.map((grp) => (grp.id === g.id ? { ...grp, name: newName } : grp))
                          );
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#616f89]">{g.member_ids.length} members</span>
                      <button
                        type="button"
                        onClick={() => removeManualGroup(g.id)}
                        className="p-1 rounded text-[#9ca3af] hover:text-red-500 hover:bg-red-50"
                        title="Remove group"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
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
          </div>
        </div>
      )}

      {groupError && <div className="text-sm text-red-600">{groupError}</div>}

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => {
            if (embeddedGroups && onClose) {
              onClose();
            } else {
              setGroupProjectId(null);
            }
          }}
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
    </>
  );

  if (embeddedGroups) {
    if (!groupProjectId) {
      return <div className="p-6 text-sm text-[#616f89]">Loading groups...</div>;
    }
    return (
      <div className="w-full h-full bg-white">
        <div className="w-full h-full bg-white p-6 flex flex-col gap-6 overflow-y-auto">
          {renderGroupModalBody(false)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-screen-2xl mx-auto w-full">
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-[#e5e7eb] p-6 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#9ca3af] font-semibold">Class overview</p>
                <h1 className="text-3xl font-black text-[#111318] tracking-tight">{classData.name}</h1>
                <p className="text-xs text-[#616f89] mt-1">Created {formatDate(classData.created_at)}</p>
              </div>
              <div className="flex items-center">
                <button
                  onClick={openEditModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#111318] text-sm font-bold hover:bg-[#f9fafb]"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  Edit class
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb]">
                <p className="text-xs text-[#616f89]">Total members</p>
                <p className="text-2xl font-bold text-[#111318]">{stats.total}</p>
              </div>
              <div className="p-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb]">
                <p className="text-xs text-[#616f89]">Students</p>
                <p className="text-2xl font-bold text-[#111318]">{stats.students}</p>
              </div>
              <div className="p-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb]">
                <p className="text-xs text-[#616f89]">Professors</p>
                <p className="text-2xl font-bold text-[#111318]">{stats.professors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#111318]">Join code</h3>
                <p className="text-xs text-[#616f89]">Expires {formatDate(classData.join_code_expires_at) || "soon"}</p>
              </div>
              <button
                onClick={mutateCode}
                disabled={codeBusy}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-60"
                title="Regenerate code"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                New code
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb]">
              <span className="text-lg font-bold tracking-widest text-[#111318]">{classData.code}</span>
              <button
                onClick={() => copyCode(classData.code)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20"
              >
                <span className="material-symbols-outlined text-base">content_copy</span>
                {copyMessage ?? "Copy"}
              </button>
            </div>
            <p className="text-xs text-[#616f89]">Share this code with students so they can join from their dashboard.</p>
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
                      {p.due_date && <p className="text-xs text-[#616f89]">Due {formatDateTime(p.due_date)}</p>}
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
                    {m.classRole === "professor" 
                      ? (m.staffRole === "ta" ? "TA" : "Professor")
                      : "Student"}
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
          <div className="w-full max-w-6xl bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-bold text-[#111318]">Create project</h4>
                <p className="text-sm text-[#616f89]">Set basics and grouping preferences.</p>
              </div>
              <button onClick={() => setShowProjectModal(false)} className="text-[#616f89] hover:text-[#111318]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
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
                  type="datetime-local"
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

              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-[#111318]">
                  Grading rubric (text)
                  <textarea
                    className="mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    rows={3}
                    placeholder="Criteria 1: ..."
                    value={projectRubric}
                    onChange={(e) => setProjectRubric(e.target.value)}
                  />
                </label>

                <label className="text-sm font-semibold text-[#111318]">
                  Upload grading rubric (PDF)
                  <div className="mt-1">
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      id="rubric-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.type === 'application/pdf') {
                          setRubricFile(file);
                        } else if (file) {
                          alert('Please select a PDF file');
                          e.target.value = '';
                        }
                      }}
                    />
                    <label
                      htmlFor="rubric-file-input"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-[#f9fafb] cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      {rubricFile ? 'Change PDF' : 'Choose PDF'}
                    </label>
                    {rubricFile && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-[#616f89]">
                        <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                        <span className="flex-1 truncate">{rubricFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setRubricFile(null)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    )}
                  </div>
                </label>
              </div>

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

              <div>
                <DisengagementFlaggingConfig
                  value={disengagementConfig}
                  onChange={setDisengagementConfig}
                />
              </div>
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
          <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-[#e5e7eb] p-6 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            {renderGroupModalBody(true)}
          </div>
        </div>
      )}
      </div>
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-[#e5e7eb]">
            <div className="p-6 border-b border-[#eef2f7] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-[#111318]">Edit Class</h2>
                <p className="text-xs text-[#616f89] mt-1">Update schedule, term, or room details.</p>
              </div>
              <button
                className="text-[#616f89] hover:text-primary transition-colors"
                onClick={() => setShowEditModal(false)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              className="p-6 space-y-5 overflow-y-auto max-h-[80vh]"
              onSubmit={(e) => {
                e.preventDefault();
                saveClassEdits();
              }}
            >
              {editError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {editError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#111318] mb-2">Course Name</label>
                <input
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., BUSFIN 4265 - Financial Institutions"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-[#111318] mb-2">Term / Semester</label>
                  <select
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={editTerm}
                    onChange={(e) => setEditTerm(e.target.value)}
                  >
                    <option>Spring 2026</option>
                    <option>Fall 2025</option>
                    <option>Summer 2025</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-[#111318] mb-2">Location / Room</label>
                  <input
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Schoenbaum Hall 105"
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-[#eef2f7] pb-2">
                  <span className="material-symbols-outlined text-[#616f89] text-xl">schedule</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#616f89]">Class Schedule</h3>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#616f89] uppercase">Meeting Days</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "Mon", label: "M" },
                      { key: "Tue", label: "T" },
                      { key: "Wed", label: "W" },
                      { key: "Thu", label: "Th" },
                      { key: "Fri", label: "F" },
                      { key: "Sat", label: "S" },
                      { key: "Sun", label: "Su" },
                    ].map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleEditDay(day.key)}
                        className={`flex items-center justify-center w-9 h-9 text-xs font-bold border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                          editMeetingDays.includes(day.key)
                            ? "bg-primary text-white border-primary"
                            : "border-gray-200 text-[#111318]"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#111318] mb-2">Start Time</label>
                    <input
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#111318] mb-2">End Time</label>
                    <input
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-background-light rounded-xl border border-[#eef2f7] mt-2">
                <div className="space-y-4">
                  {/* Teaching Team Section */}
                  <div className="border-t border-[#eef2f7] pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#616f89]">group_add</span>
                      <h3 className="text-sm font-bold text-[#111318]">TEACHING TEAM</h3>
                    </div>
                    <p className="text-xs text-[#616f89] mb-4">Only users with an Educator account can be added to the Teaching Team.</p>
                    
                    {/* Current Teaching Team Members */}
                    {members.filter(m => m.classRole === 'professor').length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-[#616f89] mb-2">CURRENT TEAM</p>
                        <div className="space-y-2">
                          {members.filter(m => m.classRole === 'professor').map(m => (
                            <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Avatar name={m.name} src={m.avatar_url} />
                                <div>
                                  <p className="text-sm font-semibold text-[#111318]">{m.name}</p>
                                  <p className="text-xs text-[#616f89]">{m.email}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                                {m.staffRole === 'ta' ? 'TA' : 'Professor'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Staff Member */}
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Enter email address"
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={staffEmail}
                          onChange={(e) => setStaffEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), lookupEducator())}
                        />
                        <select
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={staffRole}
                          onChange={(e) => setStaffRole(e.target.value as 'professor' | 'ta')}
                        >
                          <option value="ta">TA</option>
                          <option value="professor">Professor</option>
                        </select>
                        <button
                          type="button"
                          className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                          onClick={lookupEducator}
                          disabled={lookingUpStaff || !staffEmail.trim()}
                        >
                          {lookingUpStaff ? 'Looking up...' : 'Lookup'}
                        </button>
                      </div>

                      {/* Staff Preview */}
                      {staffPreview && (
                        <div className={`p-3 rounded-lg ${staffPreview.found ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          {staffPreview.found ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar name={staffPreview.educator.name} src={staffPreview.educator.profileImage} />
                                <div>
                                  <p className="text-sm font-semibold text-[#111318]">{staffPreview.educator.name}</p>
                                  <p className="text-xs text-[#616f89]">{staffPreview.educator.email}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                                onClick={inviteStaff}
                                disabled={invitingStaff}
                              >
                                {invitingStaff ? 'Sending...' : 'Send Invitation'}
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-red-700">{staffPreview.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auto-generate Class Code Section */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#616f89]">vpn_key</span>
                      <div>
                        <p className="text-sm font-bold text-[#111318]">Auto-generate Class Code</p>
                        <p className="text-xs text-[#616f89]">Students will use this to join</p>
                      </div>
                    </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={editAutoGenerateCode}
                      className="sr-only peer"
                      type="checkbox"
                      onChange={(e) => setEditAutoGenerateCode(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-lg py-3">
                  <span className="text-2xl font-black tracking-widest text-primary">{classData.code}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eef2f7]">
                <button
                  className="px-6 py-2.5 text-sm font-bold text-[#616f89] hover:text-[#111318] border border-gray-200 rounded-lg transition-colors"
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={editBusy}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2.5 text-sm font-bold text-white bg-primary hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-60"
                  type="submit"
                  disabled={editBusy || !editName.trim()}
                >
                  {editBusy ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

