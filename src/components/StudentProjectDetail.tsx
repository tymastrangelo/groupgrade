"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useSession } from "next-auth/react";
import { tasksCache } from "@/lib/tasksCache";

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

type Deliverable = {
  id: string;
  title: string;
  description?: string;
  status: "not-started" | "in-progress" | "submitted";
  dueDate?: string;
  assignedTo?: { id: string; name: string; email: string; avatar_url?: string | null };
  submittedAt?: string;
  groupId: string;
  createdAt?: string;
  submissionUrl?: string;
  submissionNotes?: string;
};

type GroupMeeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: "virtual" | "in-person";
  isUpcoming: boolean;
  createdBy?: string;
  creatorEmail?: string;
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
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [viewMeetingId, setViewMeetingId] = useState<string | null>(null);
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, isOverdue: false });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: "", date: "", time: "", type: "virtual" as "virtual" | "in-person", link: "", location: "" });
  const [collaborationLinks, setCollaborationLinks] = useState<{ id: string; title: string; url: string; iconType: string; creatorEmail?: string }[]>([]);
  const [newLink, setNewLink] = useState("");
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkForm, setNewLinkForm] = useState({ title: "", url: "", iconType: "document" });
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [newDeliverableForm, setNewDeliverableForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const [assignDropdownOpen, setAssignDropdownOpen] = useState<string | null>(null);
  const [viewDeliverableId, setViewDeliverableId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitWorkId, setSubmitWorkId] = useState<string | null>(null);
  const [submitWorkForm, setSubmitWorkForm] = useState({
    url: "",
    notes: "",
  });

  // Find the student's group
  const myGroup = project?.groups?.find((g) => 
    g.members.some((m) => m.email === session?.user?.email)
  );

  const fetchDeliverables = async () => {
    if (!myGroup || !project) return;
    try {
      const res = await fetch(`/api/deliverables?groupId=${myGroup.id}&projectId=${project.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setDeliverables(data || []);
    } catch (err) {
      console.error("Failed to fetch deliverables", err);
    }
  };

  const fetchMeetings = async () => {
    if (!myGroup) return;
    try {
      const res = await fetch(`/api/meetings?groupId=${myGroup.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setMeetings(data || []);
    } catch (err) {
      console.error("Failed to fetch meetings", err);
    }
  };

  const fetchCollaborationLinks = async () => {
    if (!myGroup) return;
    try {
      const res = await fetch(`/api/collaboration-links?groupId=${myGroup.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setCollaborationLinks(data || []);
    } catch (err) {
      console.error("Failed to fetch collaboration links", err);
    }
  };

  const fetchActivityLogs = async () => {
    if (!myGroup || !project) return;
    try {
      const limit = showAllActivities ? 50 : 5;
      const res = await fetch(`/api/activity?groupId=${myGroup.id}&projectId=${project.id}&limit=${limit}`);
      if (!res.ok) return;
      const data = await res.json();
      setActivityLogs(data || []);
    } catch (err) {
      console.error("Failed to fetch activity logs", err);
    }
  };

  const formatActivityDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getActivityMessage = (activity: any) => {
    const actionMap: Record<string, { action: string; entity: string }> = {
      deliverable_created: { action: "created", entity: "deliverable" },
      deliverable_submitted: { action: "submitted", entity: "deliverable" },
      deliverable_reassigned: { action: "reassigned", entity: "deliverable" },
      deliverable_deleted: { action: "deleted", entity: "deliverable" },
      meeting_created: { action: "scheduled", entity: "meeting" },
      link_created: { action: "added", entity: "collaboration link" },
    };
    const info = actionMap[activity.actionType] || { action: "updated", entity: "item" };
    return { action: info.action, entity: info.entity, title: activity.entityTitle || info.entity };
  };

  const url = `/api/projects/${projectId}`;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProject();
    return () => {
      unsubscribe();
    };
  }, [projectId]);

  useEffect(() => {
    if (myGroup && project) {
      fetchDeliverables();
      fetchMeetings();
      fetchCollaborationLinks();
      fetchActivityLogs();
    }
  }, [myGroup?.id, project?.id, showAllActivities]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.assign-dropdown-container')) {
        setAssignDropdownOpen(null);
      }
    };
    
    if (assignDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [assignDropdownOpen]);

  // Update countdown every minute
  useEffect(() => {
    if (!project) return;
    const interval = setInterval(() => {
      setCountdown(getCountdown(project.due_date));
    }, 60000);
    return () => clearInterval(interval);
  }, [project]);

  const handleAddDeliverable = async () => {
    if (!newDeliverableForm.title.trim() || !myGroup || !project || !session?.user) return;
    
    try {
      const response = await fetch("/api/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: myGroup.id,
          projectId: project.id,
          title: newDeliverableForm.title,
          description: newDeliverableForm.description,
          dueDate: newDeliverableForm.dueDate,
          status: "not-started",
          assignedTo: session.user.id, // Auto-assign to creator
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDeliverables([...deliverables, data]);
        await fetchActivityLogs();
        setNewDeliverableForm({ title: "", description: "", dueDate: "" });
        setShowDeliverableModal(false);
      }
    } catch (error) {
      console.error("Failed to create deliverable:", error);
    }
  };

  const assignDeliverable = async (deliverableId: string, userId: string, userName: string, userEmail: string) => {
    try {
      const response = await fetch(`/api/deliverables/${deliverableId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: userId }),
      });

      if (response.ok) {
        const updated = await response.json();
        setDeliverables(deliverables.map((d) => (d.id === deliverableId ? updated : d)));
        await fetchActivityLogs();
      }
    } catch (error) {
      console.error("Failed to assign deliverable:", error);
    }
  };

  const handleAddMeeting = async () => {
    if (!newMeeting.title.trim() || !newMeeting.date || !newMeeting.time) return;
    if (newMeeting.type === "virtual" && !newMeeting.link.trim()) return;
    if (newMeeting.type === "in-person" && !newMeeting.location.trim()) return;
    try {
      const body = {
        groupId: myGroup?.id,
        title: newMeeting.title,
        date: newMeeting.date,
        time: newMeeting.time,
        type: newMeeting.type,
        link: newMeeting.link,
        location: newMeeting.location,
      };
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchMeetings();
        await fetchActivityLogs();
        setNewMeeting({ title: "", date: "", time: "", type: "virtual", link: "", location: "" });
        setShowScheduleModal(false);
      }
    } catch (err) {
      console.error("Failed to create meeting", err);
    }
  };

  const handleAddLink = async () => {
    if (!newLinkForm.title.trim() || !newLinkForm.url.trim() || !myGroup) return;
    try {
      const body = {
        groupId: myGroup.id,
        title: newLinkForm.title,
        url: newLinkForm.url,
        iconType: newLinkForm.iconType,
      };
      
      if (editingLinkId) {
        // Update existing link
        const res = await fetch(`/api/collaboration-links/${editingLinkId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          await fetchCollaborationLinks();
          await fetchActivityLogs();
          setNewLinkForm({ title: "", url: "", iconType: "document" });
          setEditingLinkId(null);
          setShowAddLinkModal(false);
        }
      } else {
        // Create new link
        const res = await fetch("/api/collaboration-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          await fetchCollaborationLinks();
          await fetchActivityLogs();
          setNewLinkForm({ title: "", url: "", iconType: "document" });
          setShowAddLinkModal(false);
        }
      }
    } catch (err) {
      console.error("Failed to save collaboration link", err);
    }
  };

  const deleteDeliverable = async (id: string) => {
    setDeliverables(deliverables.filter((d) => d.id !== id));
    try {
      await fetch(`/api/deliverables/${id}`, { method: "DELETE" });
      await fetchActivityLogs();
    } catch (err) {
      console.error("Failed to delete deliverable", err);
    }
    setDeleteConfirmId(null);
  };

  const confirmDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const updateDeliverableStatus = (id: string, status: Deliverable["status"]) => {
    setDeliverables(
      deliverables.map((d) =>
        d.id === id
          ? { ...d, status, submittedAt: status === "submitted" ? new Date().toISOString() : undefined }
          : d
      )
    );
      fetch(`/api/deliverables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).catch((err) => console.error("Failed to update status", err));
  };

    const cycleAssignee = (del: Deliverable) => {
      if (!myGroup || myGroup.members.length === 0) return;
      const members = myGroup.members;
      const currentIndex = del.assignedTo ? members.findIndex((m) => m.id === del.assignedTo?.id) : -1;
      const nextIndex = (currentIndex + 1) % members.length;
      const next = members[nextIndex];
      assignDeliverable(del.id, next.id, next.name, next.email);
    };

  const toggleAssignDropdown = (deliverableId: string) => {
    setAssignDropdownOpen(assignDropdownOpen === deliverableId ? null : deliverableId);
  };

  const selectAssignee = (deliverableId: string, userId: string, userName: string, userEmail: string) => {
    assignDeliverable(deliverableId, userId, userName, userEmail);
    setAssignDropdownOpen(null);
  };

  const viewDeliverableDetails = (deliverableId: string) => {
    setViewDeliverableId(deliverableId);
  };

  const closeDeliverableView = () => {
    setViewDeliverableId(null);
  };

  const viewedDeliverable = deliverables.find(d => d.id === viewDeliverableId);

  const openSubmitWorkModal = (deliverableId: string) => {
    const deliverable = deliverables.find(d => d.id === deliverableId);
    if (deliverable) {
      setSubmitWorkForm({
        url: deliverable.submissionUrl || "",
        notes: deliverable.submissionNotes || "",
      });
    }
    // Close details modal before opening submit modal for better UX layering
    setViewDeliverableId(null);
    setSubmitWorkId(deliverableId);
  };

  const closeSubmitWorkModal = () => {
    setSubmitWorkId(null);
    setSubmitWorkForm({ url: "", notes: "" });
  };

  const deleteMeeting = async (id: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMeetings(meetings.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete meeting", err);
    }
    setDeleteMeetingId(null);
  };

  const confirmDeleteMeeting = (id: string) => {
    setDeleteMeetingId(id);
  };

  const cancelDeleteMeeting = () => {
    setDeleteMeetingId(null);
  };

  const editLink = (link: { id: string; title: string; url: string; iconType: string }) => {
    setNewLinkForm({ title: link.title, url: link.url, iconType: link.iconType });
    setEditingLinkId(link.id);
    setShowAddLinkModal(true);
  };

  const deleteLink = async (id: string) => {
    try {
      const res = await fetch(`/api/collaboration-links/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCollaborationLinks(collaborationLinks.filter((l) => l.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete link", err);
    }
    setDeleteLinkId(null);
    setShowAddLinkModal(false);
  };

  const handleSubmitWork = async () => {
    if (!submitWorkId) return;
    
    const updatedDeliverable = {
      status: "submitted" as const,
      submissionUrl: submitWorkForm.url,
      submissionNotes: submitWorkForm.notes,
      submittedAt: new Date().toISOString(),
    };

    setDeliverables(
      deliverables.map((d) =>
        d.id === submitWorkId
          ? { ...d, ...updatedDeliverable }
          : d
      )
    );

    try {
      await fetch(`/api/deliverables/${submitWorkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDeliverable),
      });
      await fetchActivityLogs();
    } catch (err) {
      console.error("Failed to submit work", err);
    }

    closeSubmitWorkModal();
  };


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

  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Project">
      <div className="w-full bg-[#f6f6f8] min-h-screen">
        {/* Add Collaboration Link Modal */}
        {showAddLinkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">{editingLinkId ? "Edit Link" : "Add Collaboration Link"}</h2>
                <button
                  onClick={() => {
                    setShowAddLinkModal(false);
                    setEditingLinkId(null);
                    setNewLinkForm({ title: "", url: "", iconType: "document" });
                  }}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleAddLink(); }} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLinkForm.title}
                    onChange={(e) => setNewLinkForm({ ...newLinkForm, title: e.target.value })}
                    placeholder="e.g. Project Proposal"
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    URL <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="url"
                    value={newLinkForm.url}
                    onChange={(e) => setNewLinkForm({ ...newLinkForm, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Icon Type <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewLinkForm({ ...newLinkForm, iconType: "document" })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        newLinkForm.iconType === "document"
                          ? "border-blue-600 bg-blue-50"
                          : "border-[#e5e7eb] hover:border-blue-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-blue-600 text-2xl">description</span>
                      <span className="text-xs font-medium text-[#111318]">Document</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLinkForm({ ...newLinkForm, iconType: "presentation" })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        newLinkForm.iconType === "presentation"
                          ? "border-orange-600 bg-orange-50"
                          : "border-[#e5e7eb] hover:border-orange-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-orange-600 text-2xl">slideshow</span>
                      <span className="text-xs font-medium text-[#111318]">Presentation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLinkForm({ ...newLinkForm, iconType: "spreadsheet" })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        newLinkForm.iconType === "spreadsheet"
                          ? "border-green-600 bg-green-50"
                          : "border-[#e5e7eb] hover:border-green-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-green-600 text-2xl">table_chart</span>
                      <span className="text-xs font-medium text-[#111318]">Spreadsheet</span>
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  {editingLinkId && (
                    <button
                      type="button"
                      onClick={() => setDeleteLinkId(editingLinkId)}
                      className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-sm font-medium transition-all"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddLinkModal(false);
                      setEditingLinkId(null);
                      setNewLinkForm({ title: "", url: "", iconType: "document" });
                    }}
                    className="flex-1 py-2 px-4 border border-[#e5e7eb] rounded-lg text-[#111318] font-medium text-sm hover:bg-[#f9fafb] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-primary hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors"
                  >
                    {editingLinkId ? "Save Changes" : "Add Link"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Deliverable Modal */}
        {showDeliverableModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">Add Deliverable</h2>
                <button
                  onClick={() => setShowDeliverableModal(false)}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Content */}
              <form onSubmit={(e) => { e.preventDefault(); handleAddDeliverable(); }} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newDeliverableForm.title}
                    onChange={(e) => setNewDeliverableForm({ ...newDeliverableForm, title: e.target.value })}
                    placeholder="e.g. Financial Projections"
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Description
                  </label>
                  <textarea
                    value={newDeliverableForm.description}
                    onChange={(e) => setNewDeliverableForm({ ...newDeliverableForm, description: e.target.value })}
                    placeholder="Add deliverable details (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newDeliverableForm.dueDate}
                    onChange={(e) => setNewDeliverableForm({ ...newDeliverableForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDeliverableModal(false)}
                    className="flex-1 py-2 px-4 border border-[#e5e7eb] rounded-lg text-[#111318] font-medium text-sm hover:bg-[#f9fafb] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-primary hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors"
                  >
                    Add Deliverable
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Submit Work Modal */}
        {submitWorkId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">Submit Work</h2>
                <button
                  onClick={closeSubmitWorkModal}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Attach Files <span className="text-xs text-[#616f89]">(optional)</span>
                  </label>
                  <div
                    className="border border-dashed border-[#e5e7eb] rounded-lg p-4 text-center text-sm text-[#616f89] hover:border-primary cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files || []);
                      if (files.length > 0) {
                        const names = files.map(f => f.name).join(', ');
                        setSubmitWorkForm(prev => ({ ...prev, notes: prev.notes ? prev.notes + `\nFiles: ${names}` : `Files: ${names}` }));
                      }
                    }}
                  >
                    Drag & drop files here, or click to browse
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Submission Link <span className="text-xs text-[#616f89]">(optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={submitWorkForm.url}
                    onChange={(e) => setSubmitWorkForm({ ...submitWorkForm, url: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-[#616f89] mt-1">Link to your Google Drive, Dropbox, GitHub, etc.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Notes <span className="text-xs text-[#616f89]">(optional)</span>
                  </label>
                  <textarea
                    placeholder="Add any additional notes about your submission..."
                    value={submitWorkForm.notes}
                    onChange={(e) => setSubmitWorkForm({ ...submitWorkForm, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[#e5e7eb] flex gap-3">
                <button
                  onClick={closeSubmitWorkModal}
                  className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitWork}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Meeting Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">Schedule Group Meeting</h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Meeting Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly Sync"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Meeting Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Meeting Type
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewMeeting({ ...newMeeting, type: "virtual", link: "", location: "" })}
                      className={`flex-1 py-2 px-3 rounded-lg border transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                        newMeeting.type === "virtual"
                          ? "bg-primary text-white border-primary"
                          : "border-[#e5e7eb] text-[#111318] hover:border-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">videocam</span>
                      Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMeeting({ ...newMeeting, type: "in-person", link: "", location: "" })}
                      className={`flex-1 py-2 px-3 rounded-lg border transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                        newMeeting.type === "in-person"
                          ? "bg-primary text-white border-primary"
                          : "border-[#e5e7eb] text-[#111318] hover:border-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">location_on</span>
                      In-Person
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111318] mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newMeeting.date}
                      onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111318] mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={newMeeting.time}
                      onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Conditional fields based on meeting type */}
                {newMeeting.type === "virtual" ? (
                  <div>
                    <label className="block text-sm font-medium text-[#111318] mb-2">
                      Meeting Link
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://zoom.us/j/123456789"
                      value={newMeeting.link}
                      onChange={(e) => setNewMeeting({ ...newMeeting, link: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-[#111318] mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Building A, Room 100"
                      value={newMeeting.location}
                      onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 px-6 pb-6 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-2 px-4 border border-[#e5e7eb] rounded-lg text-[#111318] font-medium text-sm hover:bg-[#f9fafb] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMeeting}
                  className="flex-1 py-2 px-4 bg-primary hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors"
                >
                  Schedule Meeting
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header with Breadcrumb */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-[#616f89] mb-4">
              <Link href="/student/classes" className="hover:text-primary transition-colors">
                Classes
              </Link>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <Link href={`/student/classes/${project?.class_id}`} className="hover:text-primary transition-colors">
                {project?.class_name}
              </Link>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-[#111318] font-medium">{project?.name}</span>
            </div>
          </div>

          {/* Main Header Section */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 mb-8 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-[#111318]">Your Group Progress</h1>
                </div>
                <div className="flex items-center gap-2 text-[#616f89] text-sm">
                  <span className="material-symbols-outlined text-sm">event</span>
                  Due: {formatDate(project?.due_date)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-3xl font-bold text-primary">85%</span>
                <span className="text-[#616f89] text-sm ml-1 uppercase tracking-wider font-semibold">Complete</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#e5e7eb] h-3 rounded-full overflow-hidden mt-4">
              <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: "85%" }}></div>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-4 mt-6 p-4 rounded-xl bg-[#f9fafb] border border-[#e5e7eb]">
              {countdown.isOverdue ? (
                <div className="flex-1">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider">OVERDUE</p>
                  <p className="text-sm text-red-500 font-medium">Submission deadline has passed</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center justify-center bg-[#111318] text-white rounded-lg px-3 py-2 min-w-[60px]">
                      <span className="text-2xl font-bold">{countdown.days.toString().padStart(2, "0")}</span>
                      <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">Days</span>
                    </div>
                    <div className="text-xl font-bold text-[#616f89]">:</div>
                    <div className="flex flex-col items-center justify-center bg-[#111318] text-white rounded-lg px-3 py-2 min-w-[60px]">
                      <span className="text-2xl font-bold">{countdown.hours.toString().padStart(2, "0")}</span>
                      <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">Hours</span>
                    </div>
                    <div className="text-xl font-bold text-[#616f89]">:</div>
                    <div className="flex flex-col items-center justify-center bg-[#111318] text-white rounded-lg px-3 py-2 min-w-[60px]">
                      <span className="text-2xl font-bold">{countdown.minutes.toString().padStart(2, "0")}</span>
                      <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">Mins</span>
                    </div>
                  </div>
                  <div className="hidden sm:block ml-4 pl-4 border-l border-[#e5e7eb]">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Remaining Time</p>
                    <p className="text-xs text-[#616f89] font-medium">Until Final Submission</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Project Assets Grid */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#111318] mb-4">Project Assets & Submissions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Your Deliverables */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm">
                <div className="pb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#616f89] mb-4 flex items-center">
                    <span className="material-symbols-outlined text-sm mr-1.5">upload_file</span>
                    Your Deliverables
                  </h3>
                  <button
                    onClick={() => setShowDeliverableModal(true)}
                    className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base mr-2">add</span>
                    Add Deliverable
                  </button>
                </div>
                <div className="flex-1 space-y-3">
                  {deliverables.length === 0 ? (
                    <p className="text-xs text-[#616f89]">No deliverables added yet</p>
                  ) : (
                    deliverables.map((del) => {
                      const isAssignedToCurrentUser = del.assignedTo?.email === session?.user?.email;
                      
                      return (
                        <div
                          key={del.id}
                          className={`relative group flex items-center justify-between p-3 rounded-xl border transition-all shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md ${
                            del.status === "submitted"
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-white border-[#e5e7eb]"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="material-symbols-outlined text-primary text-xl">description</span>
                            <p className="text-sm font-semibold text-[#111318] truncate">{del.title}</p>
                          </div>
                            
                            {/* Status badge - fades out on hover */}
                            <span
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider whitespace-nowrap transition-opacity duration-200 group-hover:opacity-0 ${
                                del.status === "submitted"
                                  ? "bg-emerald-500 text-white"
                                  : del.status === "in-progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-[#e5e7eb] text-[#616f89]"
                              }`}
                            >
                              {del.status === "submitted" ? "Submitted" : del.status === "in-progress" ? "Started" : "New"}
                            </span>

                            {/* Action buttons - fade in on hover */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"><div className="flex items-center gap-2">
                              {/* Reassign Dropdown */}
                              <div className="relative assign-dropdown-container">
                                <button
                                  onClick={() => toggleAssignDropdown(del.id)}
                                  className="h-9 w-9 flex items-center justify-center rounded-xl border border-primary/30 text-primary hover:bg-primary hover:text-white transition-all"
                                  title="Reassign"
                                >
                                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                                </button>
                                {assignDropdownOpen === del.id && myGroup && (
                                  <div className="absolute right-0 mt-1 w-52 bg-white border border-[#e5e7eb] rounded-lg shadow-lg z-50 py-1">
                                    {myGroup.members.map((member) => (
                                      <button
                                        key={member.id}
                                        onClick={() => selectAssignee(del.id, member.id, member.name, member.email)}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                          del.assignedTo?.id === member.id ? 'bg-blue-50' : ''
                                        }`}
                                      >
                                        <Avatar name={member.name} src={member.avatar_url} size="h-6 w-6" />
                                        <span className="flex-1 truncate">{member.name}</span>
                                        {del.assignedTo?.id === member.id && (
                                          <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              

                              
                              {/* View Button */}
                              <button
                                onClick={() => viewDeliverableDetails(del.id)}
                                className="h-9 w-9 flex items-center justify-center rounded-xl border border-primary/30 text-primary hover:bg-primary hover:text-white transition-all"
                                title="View Details"
                              >
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </button>
                              
                              {/* Delete Button */}
                              <button
                                onClick={() => confirmDelete(del.id)}
                                className="h-9 w-9 flex items-center justify-center rounded-xl border border-red-300 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                title="Delete"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                              </button>
                            </div></div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Group Meetings */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm">
                <div className="pb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#616f89] mb-4 flex items-center">
                    <span className="material-symbols-outlined text-sm mr-1.5">groups</span>
                    Group Meetings
                  </h3>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base mr-2">add_alarm</span>
                    + Add Meeting
                  </button>
                </div>
                <div className="space-y-2">
                  {meetings.length === 0 ? (
                    <p className="text-xs text-[#616f89]">No meetings scheduled yet</p>
                  ) : (
                    meetings.map((meeting) => (
                      <button
                        key={meeting.id}
                        onClick={() => setViewMeetingId(meeting.id)}
                        className="w-full text-left p-3 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="material-symbols-outlined text-blue-600 text-lg">
                            {meeting.type === "virtual" ? "videocam" : "groups"}
                          </span>
                          <div>
                            <p className="text-[11px] font-bold text-[#111318]">{meeting.title}</p>
                            <p className="text-[9px] text-[#616f89]">
                              {meeting.date} at {meeting.time}
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase">
                          {meeting.isUpcoming ? "Upcoming" : "Past"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Collaboration Hub */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm">
                <div className="pb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#616f89] mb-4 flex items-center">
                    <span className="material-symbols-outlined text-sm mr-1.5">hub</span>
                    Collaboration Hub
                  </h3>
                  <button
                    onClick={() => setShowAddLinkModal(true)}
                    className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base mr-2">add</span>
                    Add Link
                  </button>
                </div>
                <div className="space-y-2">
                  {collaborationLinks.length === 0 ? (
                    <p className="text-xs text-[#616f89]">No collaboration links added</p>
                  ) : (
                    collaborationLinks.map((link) => {
                      const iconConfig = {
                        document: { icon: "description", color: "text-blue-600", bgColor: "bg-blue-600", hoverColor: "hover:bg-blue-700" },
                        presentation: { icon: "slideshow", color: "text-orange-600", bgColor: "bg-orange-600", hoverColor: "hover:bg-orange-700" },
                        spreadsheet: { icon: "table_chart", color: "text-green-600", bgColor: "bg-green-600", hoverColor: "hover:bg-green-700" },
                      }[link.iconType] || { icon: "description", color: "text-blue-600", bgColor: "bg-blue-600", hoverColor: "hover:bg-blue-700" };
                      
                      const isCreator = link.creatorEmail === session?.user?.email;
                      
                      return (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg border border-[#e5e7eb] hover:bg-white transition-all"
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <span className={`material-symbols-outlined ${iconConfig.color} text-xl`}>{iconConfig.icon}</span>
                            <span className="text-[11px] font-medium text-[#111318] truncate">{link.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isCreator && (
                              <button
                                onClick={() => editLink(link)}
                                className="text-[#616f89] hover:text-primary transition-colors"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                            )}
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${iconConfig.bgColor} ${iconConfig.hoverColor} text-white text-[10px] font-bold px-3 py-1.5 rounded transition-colors uppercase tracking-tight`}
                            >
                              View
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Group Roster */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#e5e7eb] flex justify-between items-center">
                  <h2 className="text-lg font-bold text-[#111318]">Your Group Roster</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#f9fafb] text-[#616f89] text-xs uppercase tracking-wider font-semibold border-b border-[#e5e7eb]">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Contribution</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                      {myGroup?.members.map((member) => (
                        <tr key={member.id} className="hover:bg-[#f9fafb] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={member.name} src={member.avatar_url} size="h-8 w-8" />
                              <div>
                                <p className="text-sm font-medium text-[#111318]">{member.name}</p>
                                {member.email === session?.user?.email && (
                                  <p className="text-xs text-primary font-semibold">You</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded bg-[#f9fafb] text-[#616f89] text-[10px] font-bold uppercase tracking-tight border border-[#e5e7eb]">
                              Member
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-24 bg-[#e5e7eb] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full" style={{ width: "65%" }}></div>
                            </div>
                            <span className="text-[10px] text-[#616f89] mt-1 block">65% share</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-green-600 whitespace-nowrap">
                            Active Now
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Group Activity */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
                <h3 className="text-lg font-bold text-[#111318] mb-6 flex items-center">
                  <span className="material-symbols-outlined mr-2 text-primary">history</span>
                  Group Activity
                </h3>
                <div className="space-y-6">
                  {activityLogs.length === 0 ? (
                    <p className="text-sm text-[#616f89]">No recent activity</p>
                  ) : (
                    activityLogs.map((activity, index) => {
                      const message = getActivityMessage(activity);
                      return (
                        <div key={activity.id} className="flex gap-4 relative">
                          {index < activityLogs.length - 1 && (
                            <div className="absolute left-[15px] top-8 bottom-[-1.5rem] w-[1px] bg-[#e5e7eb]"></div>
                          )}
                          <Avatar
                            name={activity.user?.name || "Unknown"}
                            src={activity.user?.avatar_url}
                            size="h-8 w-8"
                          />
                          <div>
                            <p className="text-sm font-medium">
                              <span className="text-[#111318]">{activity.user?.name || "Unknown"}</span>{" "}
                              <span className="text-[#616f89] font-normal">{message.action}</span>{" "}
                              <span className="text-primary font-semibold">{message.title}</span>
                            </p>
                            <p className="text-xs text-[#616f89] mt-0.5">{formatActivityDate(activity.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {activityLogs.length > 0 && (
                  <button
                    onClick={() => setShowAllActivities(!showAllActivities)}
                    className="w-full mt-8 py-2 text-[10px] font-bold text-[#616f89] bg-[#f9fafb] hover:bg-[#e5e7eb] rounded-lg transition-all tracking-widest uppercase"
                  >
                    {showAllActivities ? "Show Less" : "View All Activity"}
                  </button>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 space-y-8">
              {/* Your Contribution */}
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

              {/* Rubric Overview */}
              {project?.rubric && (
                <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#111318] mb-4">Rubric Overview</h2>
                  <div className="space-y-3 text-sm">
                    <p className="text-[#616f89] leading-relaxed whitespace-pre-wrap text-xs">
                      {parseRubric(project.rubric).rubric_text || "Rubric details coming soon"}
                    </p>
                  </div>
                </div>
              )}

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

              {/* Project Info & Brief */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#111318] mb-4 flex items-center">
                  <span className="material-symbols-outlined text-base mr-2" style={{ fontSize: '20px' }}>info</span>
                  Project Info & Brief
                </h3>
                <div className="space-y-4">
                  <button className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-base mr-2">picture_as_pdf</span>
                    View Project Brief
                  </button>
                  <div>
                    <p className="font-semibold text-[#111318] mb-2 text-sm">Description:</p>
                    <p className="text-[#616f89] text-sm leading-relaxed">{project?.description || "No description available"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">Delete Deliverable</h2>
                <button
                  onClick={cancelDelete}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-[#616f89] mb-6">
                  Are you sure you want to delete this deliverable? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteDeliverable(deleteConfirmId)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Deliverable Modal */}
        {viewDeliverableId && viewedDeliverable && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">Deliverable Details</h2>
                <button
                  onClick={closeDeliverableView}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#111318] mb-2">Title</label>
                  <p className="text-sm text-[#616f89]">{viewedDeliverable.title}</p>
                </div>
                {viewedDeliverable.description && (
                  <div>
                    <label className="block text-sm font-bold text-[#111318] mb-2">Description</label>
                    <p className="text-sm text-[#616f89]">{viewedDeliverable.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-[#111318] mb-2">Status</label>
                  <select
                    value={viewedDeliverable.status}
                    onChange={(e) => updateDeliverableStatus(viewedDeliverable.id, e.target.value as Deliverable["status"])}
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="not-started">New</option>
                    <option value="in-progress">Started</option>
                    <option value="submitted">Submitted</option>
                  </select>
                </div>
                {viewedDeliverable.dueDate && (
                  <div>
                    <label className="block text-sm font-bold text-[#111318] mb-2">Due Date</label>
                    <p className="text-sm text-[#616f89]">{formatDate(viewedDeliverable.dueDate)}</p>
                  </div>
                )}
                {viewedDeliverable.assignedTo && (
                  <div>
                    <label className="block text-sm font-bold text-[#111318] mb-2">Assigned To</label>
                    <div className="flex items-center gap-2">
                      <Avatar name={viewedDeliverable.assignedTo.name} src={viewedDeliverable.assignedTo.avatar_url} size="h-8 w-8" />
                      <div>
                        <p className="text-sm font-medium text-[#111318]">{viewedDeliverable.assignedTo.name}</p>
                        <p className="text-xs text-[#616f89]">{viewedDeliverable.assignedTo.email}</p>
                      </div>
                    </div>
                  </div>
                )}
                {viewedDeliverable.submissionUrl && (
                  <div>
                    <label className="block text-sm font-bold text-[#111318] mb-2">Submission Link</label>
                    <a 
                      href={viewedDeliverable.submissionUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {viewedDeliverable.submissionUrl}
                    </a>
                  </div>
                )}
                {viewedDeliverable.submissionNotes && (
                  <div>
                    <label className="block text-sm font-bold text-[#111318] mb-2">Submission Notes</label>
                    <p className="text-sm text-[#616f89]">{viewedDeliverable.submissionNotes}</p>
                  </div>
                )}
                {viewedDeliverable.submittedAt && (
                  <div>
                    <label className="block text-sm font-bold text-[#111318] mb-2">Submitted At</label>
                    <p className="text-sm text-[#616f89]">{formatDate(viewedDeliverable.submittedAt)}</p>
                  </div>
                )}

              </div>
              <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end gap-3">
                {viewedDeliverable.assignedTo?.email === session?.user?.email && viewedDeliverable.status !== "submitted" && (
                  <button
                    onClick={() => openSubmitWorkModal(viewedDeliverable.id)}
                    className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary hover:text-white transition-all"
                  >
                    Submit Work
                  </button>
                )}
                <button
                  onClick={closeDeliverableView}
                  className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Meeting Modal */}
        {viewMeetingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">Meeting Details</h2>
                <button
                  onClick={() => setViewMeetingId(null)}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              {(() => {
                const m = meetings.find(me => me.id === viewMeetingId);
                if (!m) return null;
                const isCreator = m.creatorEmail === session?.user?.email;
                return (
                  <>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-[#111318] mb-2">Title</label>
                        <p className="text-sm text-[#616f89]">{m.title}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-[#111318] mb-2">Date</label>
                          <p className="text-sm text-[#616f89]">{m.date}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-[#111318] mb-2">Time</label>
                          <p className="text-sm text-[#616f89]">{m.time}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-[#111318] mb-2">Type</label>
                        <p className="text-sm text-[#616f89]">{m.type === "virtual" ? "Online" : "In-Person"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-[#111318] mb-2">{m.type === "virtual" ? "Meeting Link" : "Location"}</label>
                        {m.type === "virtual" ? (
                          <a href={m.location} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{m.location}</a>
                        ) : (
                          <p className="text-sm text-[#616f89]">{m.location}</p>
                        )}
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end gap-3">
                      {isCreator && (
                        <button
                          onClick={() => {
                            setViewMeetingId(null);
                            confirmDeleteMeeting(m.id);
                          }}
                          className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-sm font-medium transition-all"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        onClick={() => setViewMeetingId(null)}
                        className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Delete Meeting Confirmation Modal */}
        {deleteMeetingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">Delete Meeting</h2>
                <button
                  onClick={cancelDeleteMeeting}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-[#616f89] mb-6">
                  Are you sure you want to delete this meeting? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelDeleteMeeting}
                    className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteMeeting(deleteMeetingId)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
