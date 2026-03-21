"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import DeliverableFileUpload from "@/components/DeliverableFileUpload";
import { AddTaskModal } from "@/components/AddTaskModal";
import { useSession } from "next-auth/react";
import { tasksCache } from "@/lib/tasksCache";
import { getMemberColor } from "@/components/GroupMemberColors";
import { GroupProjectTimeline, TimelineEvent } from "@/components/GroupProjectTimeline";

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
  groups: { id: string; name: string; members: { id: string; name: string; email: string; avatar_url?: string | null; last_active?: string | null }[] }[];
};

type Deliverable = {
  id: string;
  title: string;
  description?: string;
  status: "not-started" | "in-progress" | "submitted" | "pending";
  dueDate?: string;
  assignedTo?: { id: string; name: string; email: string; avatar_url?: string | null };
  pendingAssignee?: { id: string; name: string; email: string; avatar_url?: string | null };
  submittedAt?: string;
  groupId: string;
  projectId?: string;
  createdAt?: string;
  submissionUrl?: string;
  submissionNotes?: string;
};

// Date conversion helpers for handling timezone issues
function pad(n: number): string { return n.toString().padStart(2, '0'); }
function toLocalInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}
function fromLocalInput(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value + 'T00:00:00');
  return d.toISOString();
}

type GroupMeeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: "virtual" | "in-person";
  isUpcoming: boolean;
  status?: "scheduled" | "concluded" | "cancelled";
  lengthMinutes?: number;
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

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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

function getActivityStatus(lastActive?: string | null) {
  if (!lastActive) return { text: "Never", color: "text-gray-400", dot: "bg-gray-300" };
  
  const now = new Date();
  const last = new Date(lastActive);
  const diffMs = now.getTime() - last.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Online: last 5 minutes
  if (minutes < 5) {
    return { text: "Now", color: "text-green-600", dot: "bg-green-500" };
  }
  
  // Active: last hour
  if (minutes < 60) {
    return { text: `${minutes}m ago`, color: "text-green-600", dot: "bg-green-400" };
  }
  
  // Recent: last day
  if (hours < 24) {
    return { text: `${hours}h ago`, color: "text-yellow-600", dot: "bg-yellow-400" };
  }
  
  // Away: more than a day
  if (days < 7) {
    return { text: `${days}d ago`, color: "text-gray-500", dot: "bg-gray-400" };
  }
  
  return { text: `${days}d ago`, color: "text-gray-400", dot: "bg-gray-300" };
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

export default function StudentProjectDetail({
  projectId,
  previewGroupId,
  hideLayout = false,
}: {
  projectId: string;
  previewGroupId?: string | null;
  hideLayout?: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<ProjectData | null>(null);
  
  // Guard against invalid projectId
  useEffect(() => {
    if (!projectId || projectId === "null" || projectId === "undefined") {
      router.push("/student/projects");
    }
  }, [projectId, router]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [viewMeetingId, setViewMeetingId] = useState<string | null>(null);
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<any | null>(null);
  const [meetingSummaries, setMeetingSummaries] = useState<any[]>([]);
  const [meetingDetailsLoading, setMeetingDetailsLoading] = useState(false);
  const [summaryForm, setSummaryForm] = useState({ notes: "", attended: true });
  const [summarySaving, setSummarySaving] = useState(false);
  const [meetingNotesByUser, setMeetingNotesByUser] = useState<Record<string, number>>({});
  const [totalPastMeetings, setTotalPastMeetings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, isOverdue: false });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: "", date: "", time: "", type: "virtual" as "virtual" | "in-person", link: "", location: "" });
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [editMeetingForm, setEditMeetingForm] = useState({ id: "", title: "", date: "", time: "", type: "virtual" as "virtual" | "in-person", link: "", location: "", lengthMinutes: 60 });
  const [collaborationLinks, setCollaborationLinks] = useState<{ id: string; title: string; url: string; iconType: string; creatorEmail?: string }[]>([]);
  const [newLink, setNewLink] = useState("");
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkForm, setNewLinkForm] = useState({ title: "", url: "", iconType: "document" });
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [showProjectOverviewModal, setShowProjectOverviewModal] = useState(false);
  const [newDeliverableForm, setNewDeliverableForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });

  const [deliverableErrors, setDeliverableErrors] = useState<{ title?: string; description?: string; dueDate?: string }>({});

  // Flag for creating a final deliverable
  const [isFinalDeliverable, setIsFinalDeliverable] = useState(false);
  const [viewDeliverableId, setViewDeliverableId] = useState<string | null>(null);
  const [editingDeliverable, setEditingDeliverable] = useState<{ title: string; description: string; dueDate: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitWorkId, setSubmitWorkId] = useState<string | null>(null);
  const [submitWorkForm, setSubmitWorkForm] = useState({
    url: "",
    notes: "",
  });
  const [reassignModalOpen, setReassignModalOpen] = useState<string | null>(null);
  const [selectedReassignUser, setSelectedReassignUser] = useState<{ id: string; name: string; email: string; avatar_url?: string | null } | null>(null);
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);
  const [viewedDeliverableFilesCount, setViewedDeliverableFilesCount] = useState<number | null>(null);
  const [chatMember, setChatMember] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  // Member deliverables list modal
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; email: string; avatar_url?: string | null } | null>(null);
  const [showMemberDeliverables, setShowMemberDeliverables] = useState(false);
  // When opening a deliverable from the member list, store the member so we can return to the list
  const [memberReturn, setMemberReturn] = useState<{ id: string; name: string; email: string; avatar_url?: string | null } | null>(null);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState("");
  const [groupNameError, setGroupNameError] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [memberActivity, setMemberActivity] = useState<Record<string, string | null>>({});
  const [showComprehensiveHistory, setShowComprehensiveHistory] = useState(false);
  const [allActivityLogs, setAllActivityLogs] = useState<any[]>([]);

  // Find the student's group
  const myGroup = previewGroupId
    ? project?.groups?.find((g) => g.id === previewGroupId)
    : project?.groups?.find((g) => g.members.some((m) => m.email === session?.user?.email));

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
      const userFilter = activityFilter !== "all" ? `&userEmail=${encodeURIComponent(activityFilter)}` : "";
      const res = await fetch(`/api/activity?groupId=${myGroup.id}&projectId=${project.id}&limit=${limit}${userFilter}`);
      if (!res.ok) return;
      const data = await res.json();
      console.log('[Activity Logs] Fetched:', data);
      setActivityLogs(data || []);
    } catch (err) {
      console.error("Failed to fetch activity logs", err);
    }
  };

  const fetchAllActivityLogs = async () => {
    if (!myGroup || !project) return;
    try {
      const res = await fetch(`/api/activity?groupId=${myGroup.id}&projectId=${project.id}&limit=1000`);
      if (!res.ok) return;
      const data = await res.json();
      setAllActivityLogs(data || []);
    } catch (err) {
      console.error("Failed to fetch all activity logs", err);
    }
  };

  const fetchMeetingNotesCounts = async () => {
    if (!myGroup) return;
    try {
      const res = await fetch(`/api/meetings/notes?groupId=${myGroup.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setMeetingNotesByUser(data?.counts || {});
      setTotalPastMeetings(data?.total || 0);
    } catch (err) {
      console.error("Failed to fetch meeting notes counts", err);
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
      deliverable_reassign_pending: { action: "requested reassignment of", entity: "deliverable" },
      deliverable_reassign_accepted: { action: "accepted reassignment of", entity: "deliverable" },
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
      fetchMeetingNotesCounts();
    }
  }, [myGroup?.id, project?.id, showAllActivities, activityFilter]);

  // Fetch all activity logs when comprehensive history modal opens
  useEffect(() => {
    if (showComprehensiveHistory) {
      fetchAllActivityLogs();
    }
  }, [showComprehensiveHistory]);

  useEffect(() => {
    const meetingId = searchParams?.get("meetingId");
    if (meetingId) {
      setViewMeetingId(meetingId);
    }
  }, [searchParams]);

  // Track user activity (last_active timestamp)
  useEffect(() => {
    const trackActivity = async () => {
      try {
        await fetch('/api/user/last-active', { method: 'POST' });
      } catch (err) {
        console.error('Failed to track activity:', err);
      }
    };

    // Track on component mount
    trackActivity();

    // Track every 2 minutes of activity
    const interval = setInterval(trackActivity, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Refresh member activity status periodically
  useEffect(() => {
    if (!myGroup?.id) return;

    const refreshMemberActivity = async () => {
      try {
        const res = await fetch(`/api/groups/${myGroup.id}/members-activity`);
        if (res.ok) {
          const data = await res.json();
          const activityMap: Record<string, string | null> = {};
          data.members?.forEach((member: any) => {
            if (member.email) {
              activityMap[member.email] = member.last_active;
            }
          });
          console.log('Refreshed member activity:', activityMap);
          setMemberActivity(activityMap);
        } else {
          console.error('Failed to fetch member activity:', res.status);
        }
      } catch (err) {
        console.error('Failed to refresh member activity:', err);
      }
    };

    // Refresh immediately on mount
    refreshMemberActivity();

    // Refresh every 30 seconds to show real-time activity
    const interval = setInterval(refreshMemberActivity, 30 * 1000);

    return () => clearInterval(interval);
  }, [myGroup?.id]);

  // Update countdown every minute
  useEffect(() => {
    if (!project) return;
    const interval = setInterval(() => {
      setCountdown(getCountdown(project.due_date));
    }, 60000);
    return () => clearInterval(interval);
  }, [project]);

  const handleAddDeliverable = async () => {
    if (!myGroup || !project || !session?.user) return;

    const errors: { title?: string; description?: string; dueDate?: string } = {};

    if (!newDeliverableForm.title.trim()) errors.title = 'Title is required';
    if (!newDeliverableForm.description.trim()) errors.description = 'Description is required';
    if (!newDeliverableForm.dueDate) errors.dueDate = 'Due date is required';

    // If user chose final but a final already exists, prevent creation
    const hasFinal = deliverables.some(d => typeof d.title === 'string' && d.title.startsWith('[FINAL]'));
    if (isFinalDeliverable && hasFinal) {
      errors.title = 'A final deliverable already exists for this group';
    }

    // Prevent creating deliverable past project due date
    if (project?.due_date && newDeliverableForm.dueDate) {
      const projectDue = new Date(project.due_date);
      const chosen = new Date(newDeliverableForm.dueDate + 'T00:00:00');
      if (chosen > projectDue) {
        errors.dueDate = 'Deliverable due date cannot be after the project due date';
      }
    }

    if (Object.keys(errors).length > 0) {
      setDeliverableErrors(errors);
      return;
    }

    setDeliverableErrors({});

    try {
      const response = await fetch("/api/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: myGroup.id,
          projectId: project.id,
          title: newDeliverableForm.title,
          description: newDeliverableForm.description,
          dueDate: fromLocalInput(newDeliverableForm.dueDate),
          status: "not-started",
          assignedTo: session.user.id, // Auto-assign to creator
          isFinal: isFinalDeliverable,
        }),
      });

      if (response.ok) {
        // Refresh deliverables from server so `assignedTo` and pending assignee info are populated
        await fetchDeliverables();
        await fetchActivityLogs();
        setNewDeliverableForm({ title: "", description: "", dueDate: "" });
        setIsFinalDeliverable(false);
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
        body: JSON.stringify({ 
          assignedTo: userId, 
          userName, 
          userEmail,
          createPendingAssignment: true // Always create pending assignment requiring acceptance
        }),
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
        lengthMinutes: (newMeeting as any).lengthMinutes || 60,
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

  useEffect(() => {
    if (viewMeetingId) {
      const m = meetings.find((me) => me.id === viewMeetingId);
      if (m) {
        setEditMeetingForm({
          id: m.id,
          title: m.title || "",
          date: m.date || "",
          time: m.time || "",
          type: m.type || "virtual",
          link: m.type === "virtual" ? (m.location || "") : "",
          location: m.type === "in-person" ? (m.location || "") : "",
          lengthMinutes: (m as any).lengthMinutes || 60,
        });
      }
    } else {
      setIsEditingMeeting(false);
      setEditMeetingForm({ id: "", title: "", date: "", time: "", type: "virtual", link: "", location: "", lengthMinutes: 60 });
    }
  }, [viewMeetingId, meetings]);

  useEffect(() => {
    const loadMeetingDetails = async () => {
      if (!viewMeetingId) {
        setMeetingDetails(null);
        setMeetingSummaries([]);
        setSummaryForm({ notes: "", attended: true });
        return;
      }
      setMeetingDetailsLoading(true);
      try {
        const res = await fetch(`/api/meetings/${viewMeetingId}`);
        if (res.ok) {
          const data = await res.json();
          setMeetingDetails(data?.meeting || null);
          setMeetingSummaries(data?.summaries || []);
          const mySummary = (data?.summaries || []).find(
            (s: any) => s.user_id === session?.user?.id || s.users?.email === session?.user?.email
          );
          setSummaryForm({
            notes: mySummary?.notes || "",
            attended: mySummary?.attended !== false,
          });
        }
      } catch (err) {
        console.error("Failed to load meeting details", err);
      } finally {
        setMeetingDetailsLoading(false);
      }
    };

    loadMeetingDetails();
  }, [viewMeetingId, session?.user?.id]);

  const saveMeetingEdits = async () => {
    try {
      const body: any = {};
      if (editMeetingForm.link !== undefined && editMeetingForm.type === "virtual") body.meetingUrl = editMeetingForm.link;
      if (editMeetingForm.location !== undefined && editMeetingForm.type === "in-person") body.location = editMeetingForm.location;
      body.title = editMeetingForm.title;
      body.date = editMeetingForm.date;
      body.time = editMeetingForm.time;
      body.lengthMinutes = editMeetingForm.lengthMinutes;

      const res = await fetch(`/api/meetings/${editMeetingForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchMeetings();
        setIsEditingMeeting(false);
        setViewMeetingId(null);
      }
    } catch (err) {
      console.error("Failed to save meeting edits", err);
    }
  };

  const submitMeetingSummary = async () => {
    if (!viewMeetingId) return;
    setSummarySaving(true);
    try {
      const res = await fetch(`/api/meetings/${viewMeetingId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: summaryForm.notes, attended: summaryForm.attended }),
      });
      if (res.ok) {
        const refresh = await fetch(`/api/meetings/${viewMeetingId}`);
        if (refresh.ok) {
          const data = await refresh.json();
          setMeetingDetails(data?.meeting || null);
          setMeetingSummaries(data?.summaries || []);
        }
      }
    } catch (err) {
      console.error("Failed to submit meeting summary", err);
    } finally {
      setSummarySaving(false);
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
    // Find the deliverable first so we can invalidate caches after delete
    const del = deliverables.find((d) => d.id === id);
    // Optimistically remove from local state
    setDeliverables(deliverables.filter((d) => d.id !== id));
    try {
      await fetch(`/api/deliverables/${id}`, { method: "DELETE" });
      await fetchActivityLogs();
      // Invalidate deliverables cache for affected project so other views (calendar) refresh
      try {
        if (del && (del.projectId || (del as any).projectId)) {
          const pid = (del as any).projectId;
          tasksCache.invalidate(`/api/deliverables?projectId=${pid}`);
          // also notify listeners in other components to reload their data
          window.dispatchEvent(new CustomEvent('deliverables:changed', { detail: { projectId: pid } }));
        } else {
          // Still notify listeners even if we couldn't determine projectId
          window.dispatchEvent(new CustomEvent('deliverables:changed'));
        }
      } catch (e) {
        // ignore cache invalidate failures
      }
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

  const openReassignModal = (deliverableId: string) => {
    setReassignModalOpen(deliverableId);
    setSelectedReassignUser(null);
    setShowReassignConfirm(false);
  };

  const closeReassignModal = () => {
    setReassignModalOpen(null);
    setSelectedReassignUser(null);
    setShowReassignConfirm(false);
  };

  const selectReassignUser = (user: { id: string; name: string; email: string; avatar_url?: string | null }) => {
    setSelectedReassignUser(user);
    setShowReassignConfirm(true);
  };

  const confirmReassignment = () => {
    if (reassignModalOpen && selectedReassignUser) {
      assignDeliverable(reassignModalOpen, selectedReassignUser.id, selectedReassignUser.name, selectedReassignUser.email);
      closeReassignModal();
    }
  };

  const viewDeliverableDetails = (deliverableId: string) => {
    setViewDeliverableId(deliverableId);
  };

  const closeDeliverableView = () => {
    setViewDeliverableId(null);
    setViewedDeliverableFilesCount(null);
    setMemberReturn(null);
    setEditingDeliverable(null);
  };

  const handleRemoveSubmission = async (deliverableId: string) => {
    try {
      const res = await fetch(`/api/deliverables/${deliverableId}/remove-submission`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchDeliverables();
        await fetchActivityLogs();
      }
    } catch (err) {
      console.error('Failed to remove submission', err);
    }
  };

  const saveDeliverableEdits = async (deliverableId: string) => {
    if (!editingDeliverable) return;
    try {
      const res = await fetch(`/api/deliverables/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingDeliverable.title,
          description: editingDeliverable.description,
          dueDate: editingDeliverable.dueDate,
        }),
      });
      if (res.ok) {
        await fetchDeliverables();
        setEditingDeliverable(null);
      }
    } catch (err) {
      console.error('Failed to update deliverable', err);
    }
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

  // When opening a deliverable view, fetch file count for that deliverable
  useEffect(() => {
    const fetchFilesCount = async (id: string) => {
      try {
        const res = await fetch(`/api/deliverables/${id}/files`);
        if (!res.ok) {
          setViewedDeliverableFilesCount(0);
          return;
        }
        const data = await res.json();
        setViewedDeliverableFilesCount(Array.isArray(data) ? data.length : 0);
      } catch (err) {
        console.error('Failed to fetch deliverable files count', err);
        setViewedDeliverableFilesCount(0);
      }
    };

    if (viewDeliverableId) {
      fetchFilesCount(viewDeliverableId);
    }
  }, [viewDeliverableId]);

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
    if (hideLayout) {
      return (
        <div className="p-8">
          <p className="text-sm text-[#616f89]">Loading...</p>
        </div>
      );
    }
    return (
      <DashboardLayout initialRole="student" overrideHeaderLabel="Project">
        <div className="p-8">
          <p className="text-sm text-[#616f89]">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    if (hideLayout) {
      return (
        <div className="p-8">
          <p className="text-sm text-red-600">{error || "Project not found"}</p>
        </div>
      );
    }
    return (
      <DashboardLayout initialRole="student" overrideHeaderLabel="Project">
        <div className="p-8">
          <p className="text-sm text-red-600">{error || "Project not found"}</p>
        </div>
      </DashboardLayout>
    );
  }

  const parsed = parseRubric(project.rubric);
  const headerLabel = (
    <div className="flex items-center gap-2 text-sm font-medium">
      <span className="text-[#111318]">{project.class_name}</span>
      <span className="text-[#9ca3af]">/</span>
      <span className="text-[#111318]">{project.name}</span>
    </div>
  );

  const content = (
    <div className="w-full bg-background-light min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
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
                    Title <span className="text-red-600">*</span>
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
                    onChange={(e) => {
                      setNewDeliverableForm({ ...newDeliverableForm, title: e.target.value });
                      setDeliverableErrors(prev => ({ ...prev, title: undefined }));
                    }}
                    placeholder="e.g. Financial Projections"
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {deliverableErrors.title && (
                    <p className="text-xs text-red-600 mt-1">{deliverableErrors.title}</p>
                  )}
                </div>

                {!deliverables.some(d => typeof d.title === 'string' && d.title.startsWith('[FINAL]')) && (
                  <div className="flex items-center gap-3">
                    <input
                      id="isFinal"
                      type="checkbox"
                      checked={isFinalDeliverable}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsFinalDeliverable(checked);
                        if (checked && project?.due_date) {
                          setNewDeliverableForm({ ...newDeliverableForm, dueDate: toLocalInput(project.due_date) });
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <label htmlFor="isFinal" className="text-sm text-[#111318]">Mark as final deliverable (requires approval from all members)</label>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Description <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={newDeliverableForm.description}
                    onChange={(e) => {
                      setNewDeliverableForm({ ...newDeliverableForm, description: e.target.value });
                      setDeliverableErrors(prev => ({ ...prev, description: undefined }));
                    }}
                    placeholder="Add deliverable details"
                    rows={3}
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  {deliverableErrors.description && (
                    <p className="text-xs text-red-600 mt-1">{deliverableErrors.description}</p>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-[#111318] mb-2">
                    Due Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={newDeliverableForm.dueDate}
                    onChange={(e) => {
                      setNewDeliverableForm({ ...newDeliverableForm, dueDate: e.target.value });
                      setDeliverableErrors(prev => ({ ...prev, dueDate: undefined }));
                    }}
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {deliverableErrors.dueDate && (
                    <p className="text-xs text-red-600 mt-1">{deliverableErrors.dueDate}</p>
                  )}
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
                  {submitWorkId && (
                    <DeliverableFileUpload 
                      deliverableId={submitWorkId}
                      onFilesUploaded={(files) => {
                        console.log('Files uploaded:', files);
                      }}
                    />
                  )}
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
                  <div>
                    <label className="block text-sm font-medium text-[#111318] mb-2">Length (minutes)</label>
                    <input
                      type="number"
                      min={5}
                      value={(newMeeting as any).lengthMinutes || 60}
                      onChange={(e) => setNewMeeting({ ...(newMeeting as any), lengthMinutes: parseInt(e.target.value || '60', 10) })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
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

        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Main Header Section */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 mb-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isEditingGroupName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedGroupName}
                        onChange={(e) => setEditedGroupName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            const finalName = editedGroupName.trim() || myGroup?.name || "Group";
                            setGroupNameError(null);
                            try {
                              const res = await fetch(`/api/groups/${myGroup?.id}/name`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: finalName }),
                              });
                              if (res.ok) {
                                setProject((prev) => prev ? {
                                  ...prev,
                                  groups: prev.groups.map((g) => g.id === myGroup?.id ? { ...g, name: finalName } : g)
                                } : null);
                                setIsEditingGroupName(false);
                              } else {
                                const data = await res.json();
                                setGroupNameError(data.error || "Failed to update group name");
                              }
                            } catch (err) {
                              console.error("Failed to update group name", err);
                              setGroupNameError("Failed to update group name");
                            }
                          }
                        }}
                        className="text-2xl font-bold text-[#111318] border-b-2 border-primary focus:outline-none bg-transparent"
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          const finalName = editedGroupName.trim() || myGroup?.name || "Group";
                          setGroupNameError(null);
                          try {
                            const res = await fetch(`/api/groups/${myGroup?.id}/name`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ name: finalName }),
                            });
                            if (res.ok) {
                              setProject((prev) => prev ? {
                                ...prev,
                                groups: prev.groups.map((g) => g.id === myGroup?.id ? { ...g, name: finalName } : g)
                              } : null);
                              setIsEditingGroupName(false);
                            } else {
                              const data = await res.json();
                              setGroupNameError(data.error || "Failed to update group name");
                            }
                          } catch (err) {
                            console.error("Failed to update group name", err);
                            setGroupNameError("Failed to update group name");
                          }
                        }}
                        className="text-primary hover:text-blue-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">check</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-[#111318]">{myGroup?.name || "Group"}</h1>
                      <button
                        onClick={() => {
                          setEditedGroupName(myGroup?.name || "Group");
                          setIsEditingGroupName(true);
                        }}
                        className="text-[#616f89] hover:text-primary transition-colors"
                        title="Edit group name"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    </>
                  )}
                </div>
                {groupNameError && (
                  <p className="text-sm text-red-600 mt-1">{groupNameError}</p>
                )}
                <div className="flex items-center gap-2 text-[#616f89] text-sm">
                  <span className="material-symbols-outlined text-sm">event</span>
                  Due: {formatDateTime(project?.due_date)}
                </div>
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-4">
                {countdown.isOverdue ? (
                  <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider">OVERDUE</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center justify-center bg-[#111318] text-white rounded-lg px-3 py-2 min-w-12.5">
                      <span className="text-xl font-bold">{countdown.days.toString().padStart(2, "0")}</span>
                      <span className="text-[8px] uppercase font-bold tracking-widest opacity-60">Days</span>
                    </div>
                    <span className="text-lg font-bold text-[#616f89]">:</span>
                    <div className="flex flex-col items-center justify-center bg-[#111318] text-white rounded-lg px-3 py-2 min-w-12.5">
                      <span className="text-xl font-bold">{countdown.hours.toString().padStart(2, "0")}</span>
                      <span className="text-[8px] uppercase font-bold tracking-widest opacity-60">Hrs</span>
                    </div>
                    <span className="text-lg font-bold text-[#616f89]">:</span>
                    <div className="flex flex-col items-center justify-center bg-[#111318] text-white rounded-lg px-3 py-2 min-w-12.5">
                      <span className="text-xl font-bold">{countdown.minutes.toString().padStart(2, "0")}</span>
                      <span className="text-[8px] uppercase font-bold tracking-widest opacity-60">Min</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setShowProjectOverviewModal(true)}
                  className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#e5e7eb] text-[#616f89] hover:bg-[#f9fafb] hover:text-primary transition-all"
                  title="Project Overview"
                >
                  <span className="material-symbols-outlined text-xl">info</span>
                </button>
              </div>
            </div>
          </div>

          {/* Project Assets Grid */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#111318] mb-4">Project Assets & Submissions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Your Deliverables */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm flex flex-col">
                <div className={deliverables.length === 0 ? "pb-4" : ""}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#616f89] flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1.5">upload_file</span>
                      Deliverables
                    </h3>
                    {deliverables.length > 0 && (
                      <button
                        onClick={() => setShowDeliverableModal(true)}
                        className="text-primary hover:bg-primary/10 p-1 rounded transition text-sm"
                        title="Add deliverable"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                      </button>
                    )}
                  </div>
                  {deliverables.length === 0 && (
                    <button
                      onClick={() => setShowDeliverableModal(true)}
                      className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center shadow-sm"
                    >
                      <span className="material-symbols-outlined text-base mr-2">add</span>
                      Add Deliverable
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                  {(() => {
                    if (deliverables.length === 0) {
                      return <p className="text-xs text-[#616f89]">No deliverables added yet</p>;
                    }

                    // Filter to only show deliverables assigned to current user
                    const myDeliverables = deliverables.filter(d => d.assignedTo?.email === session?.user?.email);
                    
                    // Sort deliverables: active (not submitted) first, then by due date, then submitted
                    const sortedDeliverables = [...myDeliverables].sort((a, b) => {
                      const aIsMine = a.assignedTo?.email === session?.user?.email;
                      const bIsMine = b.assignedTo?.email === session?.user?.email;
                      const aIsSubmitted = a.status === "submitted";
                      const bIsSubmitted = b.status === "submitted";

                      // Priority 1: My active (not submitted) deliverables first
                      if (aIsMine && !aIsSubmitted && !(bIsMine && !bIsSubmitted)) return -1;
                      if (bIsMine && !bIsSubmitted && !(aIsMine && !aIsSubmitted)) return 1;

                      // Priority 2: Among my active deliverables, sort by due date
                      if (aIsMine && !aIsSubmitted && bIsMine && !bIsSubmitted) {
                        if (!a.dueDate && !b.dueDate) return 0;
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                      }

                      // Priority 3: My submitted deliverables
                      if (aIsMine && aIsSubmitted && !(bIsMine && bIsSubmitted)) return -1;
                      if (bIsMine && bIsSubmitted && !(aIsMine && aIsSubmitted)) return 1;

                      // Priority 4: Others' active deliverables (by due date)
                      if (!aIsSubmitted && !bIsSubmitted) {
                        if (!a.dueDate && !b.dueDate) return 0;
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                      }

                      // Priority 5: Others' submitted deliverables last
                      if (aIsSubmitted && !bIsSubmitted) return 1;
                      if (bIsSubmitted && !aIsSubmitted) return -1;

                      return 0;
                    });

                    return sortedDeliverables.map((del) => {
                      const isAssignedToCurrentUser = del.assignedTo?.email === session?.user?.email;
                      const isPending = del.status === "pending";

                      return (
                        <div
                          key={del.id}
                          className={`relative group w-full flex items-center justify-between p-3 rounded-xl border transition-all shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md ${
                            del.status === "submitted"
                              ? "bg-emerald-50 border-emerald-200"
                              : isPending
                                ? "bg-amber-50 border-amber-200"
                                : isAssignedToCurrentUser
                                  ? "bg-white border-primary/30"
                                  : "bg-[#f9fafb] border-[#e5e7eb]"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                            <span className={`material-symbols-outlined text-xl shrink-0 ${
                              isPending 
                                ? 'text-amber-600' 
                                : isAssignedToCurrentUser 
                                  ? 'text-primary' 
                                  : 'text-[#616f89]'
                            }`}>description</span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#111318] truncate">{del.title}</p>
                              {isPending && del.pendingAssignee ? (
                                <p className="text-[9px] text-amber-700 truncate">Pending: {del.pendingAssignee.name}</p>
                              ) : !isAssignedToCurrentUser && del.assignedTo ? (
                                <p className="text-[9px] text-[#616f89] truncate">{del.assignedTo.name}</p>
                              ) : null}
                            </div>
                          </div>

                            {/* Status badge - fades out on hover */}
                            <span
                              className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap transition-opacity duration-200 group-hover:opacity-0 ${
                                del.status === "submitted"
                                  ? "bg-emerald-500 text-white"
                                  : del.status === "pending"
                                    ? "bg-amber-500 text-white"
                                    : del.status === "in-progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-[#e5e7eb] text-[#616f89]"
                              }`}
                            >
                              {del.status === "submitted" 
                                ? "Done" 
                                : del.status === "pending"
                                  ? "Pending"
                                  : del.status === "in-progress" 
                                    ? "Started" 
                                    : "New"}
                            </span>

                            {/* Action buttons - fade in on hover */}
                            <div className={`absolute right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex items-center pr-3 pl-4 rounded-r-xl backdrop-blur-sm ${
                              del.status === "submitted"
                                ? "bg-emerald-50/95"
                                : isPending
                                  ? "bg-amber-50/95"
                                  : isAssignedToCurrentUser
                                    ? "bg-white/95"
                                    : "bg-[#f9fafb]/95"
                            }`}><div className="flex items-center gap-2">
                              {/* Reassign Button */}
                              <button
                                onClick={() => openReassignModal(del.id)}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-primary/30 text-primary hover:bg-primary hover:text-white transition-all"
                                title="Reassign"
                              >
                                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                              </button>

                              {/* View Button */}
                              <button
                                onClick={() => viewDeliverableDetails(del.id)}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-primary/30 text-primary hover:bg-primary hover:text-white transition-all"
                                title="View Details"
                              >
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => confirmDelete(del.id)}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-red-300 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                title="Delete"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                              </button>
                            </div></div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Group Meetings */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm">
                <div className={meetings.length === 0 ? "pb-4" : ""}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#616f89] mb-2 flex items-center justify-between">
                    <span className="flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1.5">groups</span>
                      Group Meetings
                    </span>
                    {meetings.length > 0 && (
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="text-primary hover:bg-primary/10 p-1 rounded transition text-sm"
                        title="Add meeting"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                      </button>
                    )}
                  </h3>
                  {meetings.length === 0 && (
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center shadow-sm"
                    >
                      <span className="material-symbols-outlined text-base mr-2">add_alarm</span>
                      + Add Meeting
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                  {meetings.length === 0 ? (
                    <p className="text-xs text-[#616f89]">No meetings scheduled yet</p>
                  ) : (
                    meetings.map((meeting) => {
                      const isConcluded = meeting.status === "concluded";
                      return (
                        <button
                          key={meeting.id}
                          onClick={() => setViewMeetingId(meeting.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between ${
                            isConcluded
                              ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                              : "bg-blue-50 border-blue-100 hover:bg-blue-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className={`material-symbols-outlined text-lg ${isConcluded ? "text-gray-500" : "text-blue-600"}`}>
                              {meeting.type === "virtual" ? "videocam" : "groups"}
                            </span>
                            <div>
                              <p className={`text-[11px] font-bold ${isConcluded ? "text-gray-700" : "text-[#111318]"}`}>{meeting.title}</p>
                              <p className="text-[9px] text-[#616f89]">
                                {meeting.date} at {meeting.time}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isConcluded
                              ? "bg-gray-200 text-gray-700"
                              : meeting.isUpcoming
                                ? "bg-blue-600 text-white"
                                : "bg-slate-200 text-slate-700"
                          }`}>
                            {isConcluded ? "Completed" : meeting.isUpcoming ? "Upcoming" : "Past"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Collaboration Hub */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm">
                <div className={collaborationLinks.length === 0 ? "pb-4" : ""}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#616f89] mb-2 flex items-center justify-between">
                    <span className="flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1.5">hub</span>
                      Collaboration Hub
                    </span>
                    {collaborationLinks.length > 0 && (
                      <button
                        onClick={() => setShowAddLinkModal(true)}
                        className="text-primary hover:bg-primary/10 p-1 rounded transition text-sm"
                        title="Add link"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                      </button>
                    )}
                  </h3>
                  {collaborationLinks.length === 0 && (
                    <button
                      onClick={() => setShowAddLinkModal(true)}
                      className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center shadow-sm"
                    >
                      <span className="material-symbols-outlined text-base mr-2">add</span>
                      Add Link
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Group Roster */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#e5e7eb] flex justify-between items-center">
                  <h2 className="text-lg font-bold text-[#111318]">Your Group Roster</h2>
                </div>
                <div className="px-6 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
                  <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_1fr] gap-4 text-[10px] font-bold uppercase tracking-wider text-[#616f89]">
                    <span>Student</span>
                    <span>Last Active</span>
                    <span>Activity Log</span>
                    <span className="text-center">Deliverables</span>
                    <span className="text-center">Meetings</span>
                    <span className="text-center">Action</span>
                  </div>
                </div>
                <div className="divide-y divide-[#e5e7eb]">
                  {myGroup?.members.sort((a, b) => {
                    const aIsCurrentUser = a.email === session?.user?.email;
                    const bIsCurrentUser = b.email === session?.user?.email;
                    if (aIsCurrentUser) return -1;
                    if (bIsCurrentUser) return 1;
                    return 0;
                  }).map((member) => {
                    // Use refreshed activity data if available, otherwise fall back to initial data
                    const lastActive = memberActivity[member.email] ?? member.last_active;
                    let status = getActivityStatus(lastActive);
                    const isCurrentUser = member.email === session?.user?.email;
                    const memberColor = getMemberColor(member.name, myGroup?.members);
                    
                    if (isCurrentUser && status.text === "Never") {
                      status = { text: "Active Now", color: "text-green-600", dot: "bg-green-500" };
                    }
                    
                    const assignedCount = deliverables.filter(d => d.assignedTo?.email === member.email).length;
                    const completedCount = deliverables.filter(d => d.assignedTo?.email === member.email && d.status === 'submitted').length;
                    const deliverablePercentage = assignedCount > 0 ? (completedCount / assignedCount) * 100 : 0;
                    
                    const attendedMeetings = meetingNotesByUser[member.id] || 0;
                    const meetingPercentage = totalPastMeetings > 0 ? (attendedMeetings / totalPastMeetings) * 100 : 0;
                    
                    const getPercentageColor = (percentage: number) => {
                      if (percentage === 100) return "text-green-600";
                      if (percentage >= 75) return "text-yellow-600";
                      return "text-red-600";
                    };
                    
                    const recentActivity = activityLogs
                      .filter(log => log.user?.email === member.email)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                    
                    const getActivityText = () => {
                      if (!recentActivity) return "No activity";
                      const action = recentActivity.actionType;
                      if (action === "deliverable_submitted") return "Submitted";
                      if (action === "deliverable_created") return "Created";
                      if (action === "deliverable_updated") return "Edited";
                      if (action === "deliverable_reassigned") return "Reassigned";
                      if (action === "deliverable_reassign_pending") return "Requested reassignment";
                      if (action === "deliverable_reassign_accepted") return "Accepted reassignment";
                      if (action === "meeting_created") return "Scheduled meeting";
                      if (action === "link_added") return "Added link";
                      if (action === "meeting_summary_added") return "Added meeting notes";
                      return "Updated";
                    };
                    
                    const getActivityTitle = () => {
                      if (!recentActivity) return "";
                      
                      // Try to get title from metadata first
                      if (recentActivity.metadata?.title || recentActivity.metadata?.name) {
                        return recentActivity.metadata.title || recentActivity.metadata.name;
                      }
                      
                      // For deliverable actions, look up the deliverable by entityId
                      if (recentActivity.entityId && recentActivity.actionType?.includes('deliverable')) {
                        const deliverable = deliverables.find(d => d.id === recentActivity.entityId);
                        if (deliverable) return deliverable.title;
                      }
                      
                      return "";
                    };
                    
                    const isExpanded = expandedMemberId === member.id;
                    const memberDeliverables = deliverables.filter(d => d.assignedTo?.email === member.email);
                    
                    return (
                      <div key={member.id}>
                        <div className="px-6 py-4 grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_1fr] gap-4 items-center">
                          {/* Student */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full ${memberColor.dot} shrink-0`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-[#111318] truncate">
                                  {member.name}
                                  {isCurrentUser && <span className="text-xs font-normal text-[#616f89]"> (Me)</span>}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Last Active */}
                          <div>
                            <p className={`text-sm font-medium ${status.color}`}>{status.text}</p>
                          </div>
                          
                          {/* Activity Log */}
                          <div>
                            <p className="text-xs text-[#616f89] truncate">{getActivityText()}</p>
                            {getActivityTitle() && (
                              <p className="text-[10px] text-[#9ca3af] italic truncate">
                                "{getActivityTitle()}"
                              </p>
                            )}
                          </div>
                          
                          {/* Deliverables */}
                          <div className="text-center">
                            <p className="text-sm font-bold text-[#111318]">
                              {completedCount}/{assignedCount}
                            </p>
                            <p className={`text-xs font-semibold ${getPercentageColor(deliverablePercentage)}`}>
                              ({Math.round(deliverablePercentage)}%)
                            </p>
                          </div>
                          
                          {/* Meetings */}
                          <div className="text-center">
                            <p className="text-sm font-bold text-[#111318]">
                              {attendedMeetings}/{totalPastMeetings}
                            </p>
                            <p className={`text-xs font-semibold ${getPercentageColor(meetingPercentage)}`}>
                              ({Math.round(meetingPercentage)}%)
                            </p>
                          </div>
                          
                          {/* Action */}
                          <div className="text-center">
                            <button
                              onClick={() => {
                                setExpandedMemberId(isExpanded ? null : member.id);
                              }}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                isExpanded
                                  ? `bg-red-600 text-white hover:bg-red-700`
                                  : `border-2 ${memberColor.text} border-current hover:shadow-md hover:scale-105`
                              }`}
                            >
                              {isExpanded ? (
                                <span className="flex items-center gap-1">
                                  Hide Activity
                                  <span className="material-symbols-outlined text-xs">expand_less</span>
                                </span>
                              ) : (
                                "Activity"
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Expanded Activity Section */}
                        {isExpanded && (
                          <div className="bg-[#f9fafb] border-t border-[#e5e7eb]">
                            <div className="px-6 py-4">
                              <div className="flex items-center gap-2 mb-4">
                                <div className={`w-2 h-2 rounded-full ${memberColor.dot}`}></div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#616f89]">
                                  Recent Contributions: {member.name}
                                </h4>
                              </div>
                              {memberDeliverables.length === 0 ? (
                                <p className="text-sm text-[#616f89] pl-4">No deliverables assigned yet</p>
                              ) : (
                                <div className="space-y-3 border-l-2 border-[#e5e7eb] pl-6">
                                  {memberDeliverables.slice(0, 3).map((deliverable) => {
                                    const getStatusDisplay = () => {
                                      if (deliverable.status === 'submitted') {
                                        return {
                                          text: deliverable.submittedAt 
                                            ? `Completed: ${new Date(deliverable.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                            : 'Completed',
                                          color: 'text-green-600'
                                        };
                                      }
                                      if (deliverable.status === 'in-progress') {
                                        return { text: 'In Progress', color: 'text-blue-600' };
                                      }
                                      return { text: 'Not Started', color: 'text-[#616f89]' };
                                    };
                                    
                                    const statusDisplay = getStatusDisplay();
                                    
                                    return (
                                      <div key={deliverable.id} className="flex items-start justify-between group">
                                        <div className="flex items-start gap-3 flex-1">
                                          <div className={`w-2 h-2 rounded-full ${memberColor.dot} mt-1.5 shrink-0`}></div>
                                          <div className="flex-1">
                                            <p className="text-sm font-bold text-[#111318]">{deliverable.title}</p>
                                            <p className={`text-xs ${statusDisplay.color} italic`}>
                                              {statusDisplay.text}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => setViewDeliverableId(deliverable.id)}
                                          className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1 transition-opacity"
                                        >
                                          View
                                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 space-y-8">
              {/* Group Activity */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-6 pb-4 border-b border-[#e5e7eb]">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-[#111318] flex items-center whitespace-nowrap">
                    <span className="material-symbols-outlined mr-2 text-red-600">schedule</span>
                    Group Activity
                  </h2>
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                    className="text-xs font-medium text-[#616f89] bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 flex-shrink-0"
                  >
                    <option value="all">All Students</option>
                    {myGroup?.members.map((member) => (
                      <option key={member.id} value={member.email}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-6">
                  {(() => {
                    if (activityLogs.length === 0) {
                      return <p className="text-sm text-[#616f89]">No recent activity</p>;
                    }
                    
                    return activityLogs.map((activity) => {
                      const message = getActivityMessage(activity);
                      const activityUserColor = activity.user ? getMemberColor(activity.user.name, myGroup?.members) : null;
                      
                      const getActionText = () => {
                        const action = activity.actionType;
                        if (action === "deliverable_submitted") return "submitted";
                        if (action === "deliverable_created") return "created";
                        if (action === "deliverable_updated") return "edited";
                        if (action === "deliverable_reassigned") return "reassigned";
                        if (action === "deliverable_reassign_pending") {
                          const pendingName = activity.metadata?.pending_assignee_name;
                          return pendingName ? `requested reassignment to ${pendingName} (pending)` : "requested reassignment (pending)";
                        }
                        if (action === "deliverable_reassign_accepted") {
                          const originalName = activity.metadata?.original_assignee_name;
                          return originalName ? `accepted reassignment from ${originalName}` : "accepted reassignment";
                        }
                        if (action === "deliverable_deleted") return "deleted";
                        if (action === "meeting_created") return "scheduled";
                        if (action === "meeting_concluded") return "concluded";
                        if (action === "link_added") return "uploaded";
                        if (action === "meeting_summary_added") return "completed";
                        return "updated";
                      };
                      
                      return (
                        <div key={activity.id} className="flex gap-3 items-start">
                          {activity.user?.avatar_url ? (
                            <Avatar
                              name={activity.user?.name || "Unknown"}
                              src={activity.user?.avatar_url}
                              size="h-10 w-10"
                            />
                          ) : (
                            <div 
                              className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                              style={{ backgroundColor: activityUserColor?.hex || '#6b7280' }}
                            >
                              {(activity.user?.name || "?").split(" ").map((n: string) => n.charAt(0)).join("").toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">
                              <span className="font-semibold text-[#111318]">{activity.user?.name || "Unknown"} </span>
                              <span className="text-[#616f89]">{getActionText()} </span>
                              {activity.entityId ? (
                                <button
                                  onClick={() => {
                                    if (activity.actionType?.startsWith('deliverable')) {
                                      setViewDeliverableId(activity.entityId);
                                    }
                                    if (activity.actionType === 'meeting_created' || activity.actionType === 'meeting_concluded') {
                                      setViewMeetingId(activity.entityId);
                                    }
                                  }}
                                  className="font-semibold italic cursor-pointer focus:outline-none"
                                  style={{ color: activityUserColor?.hex || '#0066cc' }}
                                >
                                  {message.title}
                                </button>
                              ) : (
                                <span className="font-semibold italic" style={{ color: activityUserColor?.hex || '#0066cc' }}>{message.title}</span>
                              )}
                            </p>
                            <p className="text-xs text-[#9ca3af] uppercase tracking-wide mt-1.5">{formatActivityDate(activity.createdAt)}</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                </div>
                {activityLogs.length > 0 && (
                  <div className="px-6 py-8 border-t border-[#e5e7eb]">
                    <button
                      onClick={() => setShowComprehensiveHistory(true)}
                      className="w-full py-2.5 text-xs font-bold text-[#616f89] bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] rounded-lg transition-all tracking-widest uppercase"
                    >
                      View Comprehensive History
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group Project Timeline */}
          <section className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden mt-8">
            <div className="p-6 border-b border-[#e5e7eb]">
              <div>
                <h2 className="text-lg font-bold text-[#111318] mb-1">Group Project Timeline</h2>
                <p className="text-xs text-[#616f89]">Click or hover over markers to review historical data</p>
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-[#616f89] mt-4">
                {myGroup?.members.map((member) => {
                  const memberColor = getMemberColor(member.name, myGroup?.members);
                  return (
                    <div key={member.id} className="flex items-center">
                      <div 
                        className="w-2 h-2 rounded-full mr-1.5" 
                        style={{ backgroundColor: memberColor.hex }}
                      ></div>
                      <span>{member.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline */}
            <div className="p-8 pb-20 overflow-x-auto">
              <GroupProjectTimeline
                events={(() => {
                  const timelineEvents: TimelineEvent[] = [];

                  // Identify final deliverable IDs so we can suppress duplicate timeline entries (submission/create)
                  const finalDeliverableIds = new Set(deliverables.filter(d => typeof d.title === 'string' && d.title.startsWith('[FINAL]')).map(d => d.id));

                  // Add activity events
                  activityLogs.forEach((activity) => {
                    // Skip deleted deliverable activity from timeline
                    if (activity.actionType === 'deliverable_deleted') return;
                    // If this is a submission for a final deliverable, skip it (represented by the deadline flag)
                    if (activity.actionType === 'deliverable_submitted' && activity.entityId && finalDeliverableIds.has(activity.entityId)) return;
                    if (activity.user && activity.createdAt && activity.entityTitle) {
                      const actionLabel = 
                        activity.actionType === "deliverable_submitted" ? "Deliverable submitted" :
                        activity.actionType === "task_completed" ? "Task completed" :
                        activity.actionType === "file_uploaded" ? "File uploaded" :
                        activity.actionType === "comment_added" ? "Comment added" :
                        activity.actionType.replace(/_/g, " ");
                      
                      const event: TimelineEvent = {
                        id: activity.id,
                        date: activity.createdAt.split("T")[0],
                        title: activity.entityTitle,
                        memberName: activity.user.name,
                        type: activity.actionType === "deliverable_submitted" ? "deliverable" : "member-update",
                        description: actionLabel,
                      };

                      // Only add viewButton for deliverable submissions
                      if (activity.actionType === "deliverable_submitted" && activity.entityId) {
                        event.viewButton = {
                          label: "View Work",
                          onClick: () => {
                            setViewDeliverableId(activity.entityId);
                          },
                        };
                      }

                      timelineEvents.push(event);
                    }
                  });

                  // Add deliverable events (including final marker)
                  deliverables.forEach((d) => {
                    if (d.dueDate) {
                      timelineEvents.push({
                        id: `deliverable-${d.id}`,
                        date: d.dueDate.split("T")[0],
                        title: d.title,
                        type: "deliverable",
                        description: d.status === 'submitted' ? 'Submitted' : d.status,
                        status: d.status,
                        assignedTo: d.assignedTo?.name,
                        pendingTransferFrom: d.status === 'pending' && d.assignedTo ? d.assignedTo.name : undefined,
                        pendingTransferTo: d.status === 'pending' && d.pendingAssignee ? d.pendingAssignee.name : undefined,
                        color: d.assignedTo ? getMemberColor(d.assignedTo.name, myGroup?.members).hex : undefined,
                        memberName: d.assignedTo?.name,
                        viewButton: {
                          label: 'View Deliverable',
                          onClick: () => setViewDeliverableId(d.id),
                        },
                      });
                    } else if (d.createdAt) {
                      timelineEvents.push({
                        id: `deliverable-${d.id}`,
                        date: d.createdAt.split("T")[0],
                        title: d.title,
                        type: "deliverable",
                        description: d.status === 'submitted' ? 'Submitted' : d.status,
                        status: d.status,
                        assignedTo: d.assignedTo?.name,
                        pendingTransferFrom: d.status === 'pending' && d.assignedTo ? d.assignedTo.name : undefined,
                        pendingTransferTo: d.status === 'pending' && d.pendingAssignee ? d.pendingAssignee.name : undefined,
                        color: d.assignedTo ? getMemberColor(d.assignedTo.name, myGroup?.members).hex : undefined,
                        memberName: d.assignedTo?.name,
                        viewButton: {
                          label: 'View Deliverable',
                          onClick: () => setViewDeliverableId(d.id),
                        },
                      });
                    }
                  });

                  // Add meeting events
                  meetings.forEach((meeting) => {
                    const meetingDate = meeting.date;
                    if (meetingDate) {
                      timelineEvents.push({
                        id: `meeting-${meeting.id}`,
                        date: meetingDate,
                        title: meeting.title,
                        type: "meeting",
                        color: "#6b7280",
                        description: `${meeting.type === "virtual" ? "Online" : "In-person"} • ${meeting.time}`,
                        viewButton: {
                          label: "View Details",
                          onClick: () => setViewMeetingId(meeting.id),
                        },
                      });
                    }
                  });

                  return timelineEvents.sort((a, b) => 
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                })()}
                projectStartDate={project?.created_at ? new Date(project.created_at).toISOString().split("T")[0] : undefined}
                projectDueDate={project?.due_date ? new Date(project.due_date).toISOString().split("T")[0] : undefined}
                members={myGroup?.members || []}
              />
            </div>
          </section>
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
        {/* Member Deliverables Modal */}
        {showMemberDeliverables && selectedMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">{selectedMember.name}&apos;s Deliverables</h2>
                <button
                  onClick={() => { setShowMemberDeliverables(false); setSelectedMember(null); }}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
                {deliverables.filter(d => d.assignedTo?.email === selectedMember.email).length === 0 ? (
                  <p className="text-sm text-[#616f89]">No deliverables assigned to {selectedMember.name}.</p>
                ) : (
                  deliverables
                    .filter(d => d.assignedTo?.email === selectedMember.email)
                    .map(d => (
                      <button
                        key={d.id}
                        onClick={() => {
                          // remember which member's list we came from so we can return
                          setMemberReturn(selectedMember);
                          setShowMemberDeliverables(false);
                          setSelectedMember(null);
                          setViewDeliverableId(d.id);
                        }}
                        className="w-full text-left p-3 rounded-lg border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#111318] truncate">{d.title}</p>
                            <p className="text-xs text-[#616f89]">Status: {d.status}</p>
                          </div>
                          <div className="text-xs text-[#616f89]">
                            {d.dueDate ? formatDate(d.dueDate) : "No due date"}
                          </div>
                        </div>
                      </button>
                    ))
                )}
              </div>
              <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end">
                <button
                  onClick={() => { setShowMemberDeliverables(false); setSelectedMember(null); }}
                  className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {viewDeliverableId && viewedDeliverable && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] flex-shrink-0">
                <h2 className="text-lg font-bold text-[#111318]">Deliverable Details</h2>
                <button
                  onClick={closeDeliverableView}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1" id="deliverable-modal-content">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-[#111318]">Title</label>
                    {!editingDeliverable && viewedDeliverable.assignedTo?.email === session?.user?.email && (
                      <button
                        onClick={() => {
                          setEditingDeliverable({
                            title: viewedDeliverable.title,
                            description: viewedDeliverable.description || '',
                            dueDate: viewedDeliverable.dueDate || '',
                          });
                          // Scroll to top of modal
                          setTimeout(() => {
                            document.getElementById('deliverable-modal-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 0);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editingDeliverable ? (
                    <input
                      type="text"
                      value={editingDeliverable.title}
                      onChange={(e) => setEditingDeliverable({ ...editingDeliverable, title: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <p className="text-sm text-[#616f89]">{viewedDeliverable.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#111318] mb-2">Description</label>
                  {editingDeliverable ? (
                    <textarea
                      value={editingDeliverable.description}
                      onChange={(e) => setEditingDeliverable({ ...editingDeliverable, description: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-[#616f89]">{viewedDeliverable.description || 'No description'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#111318] mb-2">Status</label>
                  {viewedDeliverable.status === 'submitted' ? (
                    <select
                      value="submitted"
                      onChange={async (e) => {
                        if (e.target.value === 'remove-submission') {
                          await handleRemoveSubmission(viewedDeliverable.id);
                          e.target.value = 'submitted'; // Reset dropdown
                        }
                      }}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="remove-submission">Remove Submission / Resubmit</option>
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm bg-gray-50 text-[#616f89]">
                      In Progress
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#111318] mb-2">Due Date</label>
                  {editingDeliverable ? (
                    <input
                      type="date"
                      value={editingDeliverable.dueDate}
                      onChange={(e) => setEditingDeliverable({ ...editingDeliverable, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <p className="text-sm text-[#616f89]">{viewedDeliverable.dueDate ? formatDate(viewedDeliverable.dueDate) : 'No due date'}</p>
                  )}
                </div>
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
                {viewedDeliverable.status === "submitted" && (typeof viewedDeliverableFilesCount === 'number' && viewedDeliverableFilesCount > 0) && (
                  <div className="pt-4 border-t border-[#e5e7eb]">
                    <label className="block text-sm font-bold text-[#111318] mb-3">Submitted Files</label>
                    <DeliverableFileUpload
                      deliverableId={viewedDeliverable.id}
                      readOnly={true}
                    />
                  </div>
                )}

              </div>
              <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end gap-3 flex-shrink-0">
                {editingDeliverable && (
                  <>
                    <button
                      onClick={() => setEditingDeliverable(null)}
                      className="px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium hover:bg-[#f9fafb] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveDeliverableEdits(viewedDeliverable.id)}
                      className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      Save Changes
                    </button>
                  </>
                )}
                {!editingDeliverable && viewedDeliverable.assignedTo?.email === session?.user?.email && viewedDeliverable.status !== "submitted" && (
                  <button
                    onClick={() => openSubmitWorkModal(viewedDeliverable.id)}
                    className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary hover:text-white transition-all"
                  >
                    Upload File
                  </button>
                )}
                {memberReturn && (
                  <button
                    onClick={() => {
                      // return to the member deliverables list
                      const m = memberReturn;
                      setViewDeliverableId(null);
                      setViewedDeliverableFilesCount(null);
                      setSelectedMember(m);
                      setShowMemberDeliverables(true);
                      setMemberReturn(null);
                    }}
                    className="px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium hover:bg-[#f9fafb] transition-all"
                  >
                    Back to list
                  </button>
                )}
                {!editingDeliverable && (
                  <button
                    onClick={closeDeliverableView}
                    className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Close
                  </button>
                )}
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
                const meetingData = meetingDetails || m;
                if (!meetingData) return null;
                const isCreator = m?.creatorEmail === session?.user?.email;
                const isConcluded = meetingData.status === "concluded";
                const isUpcoming = m?.isUpcoming ?? false;
                const meetingLocation = meetingData.type === "virtual"
                  ? (meetingData.meeting_url || meetingData.location || meetingData.meetingUrl || m?.location)
                  : (meetingData.location || m?.location);
                return (
                  <>
                    <div className="p-6 space-y-4">
                      {meetingDetailsLoading ? (
                        <p className="text-sm text-[#616f89]">Loading...</p>
                      ) : isEditingMeeting ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-[#111318] mb-2">Title</label>
                            <input
                              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm"
                              value={editMeetingForm.title}
                              onChange={(e) => setEditMeetingForm({ ...editMeetingForm, title: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-[#111318] mb-2">Date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm"
                                value={editMeetingForm.date}
                                onChange={(e) => setEditMeetingForm({ ...editMeetingForm, date: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-[#111318] mb-2">Time</label>
                              <input
                                type="time"
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm"
                                value={editMeetingForm.time}
                                onChange={(e) => setEditMeetingForm({ ...editMeetingForm, time: e.target.value })}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-[#111318] mb-2">Type</label>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => setEditMeetingForm({ ...editMeetingForm, type: 'virtual' })}
                                className={`py-2 px-3 rounded-lg border text-sm font-medium ${editMeetingForm.type === 'virtual' ? 'bg-primary text-white border-primary' : 'border-[#e5e7eb] hover:border-primary'}`}>
                                Online
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditMeetingForm({ ...editMeetingForm, type: 'in-person' })}
                                className={`py-2 px-3 rounded-lg border text-sm font-medium ${editMeetingForm.type === 'in-person' ? 'bg-primary text-white border-primary' : 'border-[#e5e7eb] hover:border-primary'}`}>
                                In-Person
                              </button>
                            </div>
                          </div>

                          {editMeetingForm.type === 'virtual' ? (
                            <div>
                              <label className="block text-sm font-bold text-[#111318] mb-2">Meeting Link</label>
                              <input
                                type="url"
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm"
                                value={editMeetingForm.link}
                                onChange={(e) => setEditMeetingForm({ ...editMeetingForm, link: e.target.value })}
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-bold text-[#111318] mb-2">Location</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm"
                                value={editMeetingForm.location}
                                onChange={(e) => setEditMeetingForm({ ...editMeetingForm, location: e.target.value })}
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-bold text-[#111318] mb-2">Length (minutes)</label>
                            <input
                              type="number"
                              min={5}
                              className="w-28 px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm"
                              value={editMeetingForm.lengthMinutes}
                              onChange={(e) => setEditMeetingForm({ ...editMeetingForm, lengthMinutes: parseInt(e.target.value || '60', 10) })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div>
                            <label className="block text-sm font-bold text-[#111318] mb-2">Title</label>
                            <p className="text-sm text-[#616f89]">{meetingData.title}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-[#111318] mb-2">Date</label>
                              <p className="text-sm text-[#616f89]">{meetingData.date}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-[#111318] mb-2">Time</label>
                              <p className="text-sm text-[#616f89]">{meetingData.time}</p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-[#111318] mb-2">Type</label>
                            <p className="text-sm text-[#616f89]">{meetingData.type === "virtual" ? "Online" : "In-Person"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-[#111318] mb-2">{meetingData.type === "virtual" ? "Meeting Link" : "Location"}</label>
                            {meetingData.type === "virtual" ? (
                              <a href={meetingLocation} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{meetingLocation}</a>
                            ) : (
                              <p className="text-sm text-[#616f89]">{meetingLocation}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-[#111318] mb-2">Length</label>
                            <p className="text-sm text-[#616f89]">{meetingData.length_minutes || meetingData.lengthMinutes || m?.lengthMinutes || 60} minutes</p>
                          </div>
                          {isConcluded && (
                            <div className="pt-4 border-t border-[#e5e7eb] space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-[#111318]">Meeting Summary</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase">Concluded</span>
                              </div>
                              {(() => {
                                const mySummary = meetingSummaries.find(
                                  (summary) => summary.user_id === session?.user?.id || summary.users?.email === session?.user?.email
                                );
                                if (mySummary) {
                                  return (
                                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                      <p className="text-xs font-bold text-emerald-700">Your summary is submitted.</p>
                                      {mySummary.attended === false && (
                                        <span className="inline-block mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">No-show</span>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <>
                                    <div>
                                      <label className="block text-xs font-bold text-[#111318] mb-2">Your Notes</label>
                                      <textarea
                                        value={summaryForm.notes}
                                        onChange={(e) => setSummaryForm({ ...summaryForm, notes: e.target.value })}
                                        placeholder="Add a short summary of what happened..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-xs"
                                      />
                                    </div>
                                    <label className="flex items-center gap-2 text-xs text-[#616f89]">
                                      <input
                                        type="checkbox"
                                        checked={summaryForm.attended}
                                        onChange={(e) => setSummaryForm({ ...summaryForm, attended: e.target.checked })}
                                      />
                                      I attended this meeting
                                    </label>
                                    <button
                                      onClick={submitMeetingSummary}
                                      disabled={summarySaving}
                                      className="w-full px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                                    >
                                      {summarySaving ? "Saving..." : "Submit Summary"}
                                    </button>
                                  </>
                                );
                              })()}

                              <div className="pt-2">
                                <label className="block text-xs font-bold text-[#111318] mb-2">Team Notes</label>
                                {meetingSummaries.length === 0 ? (
                                  <p className="text-xs text-[#616f89]">No notes submitted yet.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {meetingSummaries.map((summary) => {
                                      const authorName = summary.users?.name || "Team member";
                                      return (
                                        <div key={summary.id} className="flex items-start gap-3 p-2 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]">
                                          <Avatar
                                            name={authorName}
                                            src={summary.users?.avatar_url}
                                            size="h-7 w-7"
                                          />
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="text-xs font-semibold text-[#111318]">{authorName}</p>
                                              {summary.attended === false && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">No-show</span>
                                              )}
                                            </div>
                                            <p className="text-xs text-[#616f89] mt-0.5">
                                              {summary.notes || "No notes provided."}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-between items-center gap-3">
                      <div>
                        {isCreator && isUpcoming && (
                          <button
                            onClick={() => {
                              setViewMeetingId(null);
                              confirmDeleteMeeting(meetingData.id);
                            }}
                            className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-sm font-medium transition-all"
                          >
                            Cancel Meeting
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {isCreator && isUpcoming && (
                          <>
                            {!isEditingMeeting ? (
                              <button
                                onClick={() => setIsEditingMeeting(true)}
                                className="px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium hover:bg-[#f9fafb] transition-all"
                              >
                                Edit
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={saveMeetingEdits}
                                  className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    // discard edits
                                    setIsEditingMeeting(false);
                                    const orig = meetings.find((me) => me.id === viewMeetingId);
                                    if (orig) {
                                      setEditMeetingForm({
                                        id: orig.id,
                                        title: orig.title || "",
                                        date: orig.date || "",
                                        time: orig.time || "",
                                        type: orig.type || "virtual",
                                        link: orig.type === "virtual" ? (orig.location || "") : "",
                                        location: orig.type === "in-person" ? (orig.location || "") : "",
                                        lengthMinutes: (orig as any).lengthMinutes || 60,
                                      });
                                    }
                                  }}
                                  className="px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium hover:bg-[#f9fafb] transition-all"
                                >
                                  Discard
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => setViewMeetingId(null)}
                          className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          Close
                        </button>
                      </div>
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
                <h2 className="text-lg font-bold text-[#111318]">Cancel Meeting</h2>
                <button
                  onClick={cancelDeleteMeeting}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-[#616f89] mb-6">
                  Are you sure you want to cancel this meeting? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelDeleteMeeting}
                    className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-gray-50 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => deleteMeeting(deleteMeetingId)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Cancel Meeting
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mock Chat Modal */}
        {chatMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <div>
                  <h2 className="text-lg font-bold text-[#111318]">Chat with {chatMember.name}</h2>
                  <p className="text-xs text-[#616f89]">Mock chat window</p>
                </div>
                <button
                  onClick={() => setChatMember(null)}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-3">
                  <p className="text-xs text-[#616f89]">
                    This is a placeholder for chat. You can wire this to Team Chat later.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm"
                  />
                  <button
                    className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <AddTaskModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          projectId={project?.id}
        />

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
                  onClick={() => setShowProjectOverviewModal(false)}
                  className="text-[#616f89] hover:text-[#111318] text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Project Name & Class */}
                <div>
                  <h3 className="text-xl font-bold text-[#111318] mb-1">{project?.name}</h3>
                  <p className="text-sm text-[#616f89]">{project?.class_name}</p>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f9fafb] border border-[#e5e7eb]">
                  <span className="material-symbols-outlined text-primary text-2xl">event</span>
                  <div>
                    <p className="text-xs font-bold text-[#616f89] uppercase tracking-wider">Due Date</p>
                    <p className="text-sm font-semibold text-[#111318]">{formatDate(project?.due_date) || "No due date set"}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-bold text-[#111318] mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#616f89] text-lg">description</span>
                    Description
                  </h4>
                  <p className="text-sm text-[#616f89] leading-relaxed bg-[#f9fafb] p-4 rounded-lg border border-[#e5e7eb]">
                    {project?.description || "No description available"}
                  </p>
                </div>

                {/* Expectations */}
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

                {/* Teacher-defined deliverables (from project settings) */}
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

                {/* Grading Rubric PDF */}
                {project?.rubric_file_url && (
                  <div>
                    <h4 className="text-sm font-bold text-[#111318] mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#616f89] text-lg">grading</span>
                      Grading Rubric
                    </h4>
                    <a
                      href={project.rubric_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-[#f9fafb] transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                      Download Rubric PDF
                    </a>
                  </div>
                )}

                {/* View Project Brief Button */}
                <button className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                  View Project Brief
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reassign Modal */}
        {reassignModalOpen && myGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-lg font-bold text-[#111318]">
                  {showReassignConfirm ? "Confirm Reassignment" : "Reassign Deliverable"}
                </h2>
                <button
                  onClick={closeReassignModal}
                  className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {!showReassignConfirm ? (
                  <>
                    <p className="text-sm text-[#616f89] mb-4">
                      Select a team member to assign this deliverable to:
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {myGroup.members.map((member) => {
                        const currentDeliverable = deliverables.find(d => d.id === reassignModalOpen);
                        const isCurrentAssignee = currentDeliverable?.assignedTo?.id === member.id;
                        
                        return (
                          <button
                            key={member.id}
                            onClick={() => selectReassignUser(member)}
                            disabled={isCurrentAssignee}
                            className={`w-full px-4 py-3 text-left rounded-lg border transition-all flex items-center gap-3 ${
                              isCurrentAssignee
                                ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                                : selectedReassignUser?.id === member.id
                                  ? 'bg-blue-50 border-primary shadow-sm'
                                  : 'bg-white border-[#e5e7eb] hover:border-primary/50 hover:bg-gray-50'
                            }`}
                          >
                            <Avatar name={member.name} src={member.avatar_url} size="h-10 w-10" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#111318] truncate">{member.name}</p>
                              <p className="text-xs text-[#616f89] truncate">{member.email}</p>
                            </div>
                            {isCurrentAssignee && (
                              <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2 py-1 rounded uppercase">
                                Current
                              </span>
                            )}
                            {selectedReassignUser?.id === member.id && !isCurrentAssignee && (
                              <span className="material-symbols-outlined text-primary">check_circle</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-amber-600 text-3xl">swap_horiz</span>
                      </div>
                      <h3 className="text-base font-bold text-[#111318] mb-2">Confirm Reassignment</h3>
                      <p className="text-sm text-[#616f89] mb-4">
                        Are you sure you want to reassign this deliverable to:
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3 mb-4">
                        <Avatar 
                          name={selectedReassignUser?.name || ""} 
                          src={selectedReassignUser?.avatar_url} 
                          size="h-12 w-12" 
                        />
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#111318] truncate">{selectedReassignUser?.name}</p>
                          <p className="text-xs text-[#616f89] truncate">{selectedReassignUser?.email}</p>
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                        <div className="flex gap-2">
                          <span className="material-symbols-outlined text-amber-600 text-lg shrink-0">info</span>
                          <p className="text-xs text-amber-800">
                            This user will receive a notification and must accept the deliverable before it appears in their task list.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#e5e7eb] flex gap-3">
                {!showReassignConfirm ? (
                  <>
                    <button
                      onClick={closeReassignModal}
                      className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => selectedReassignUser && setShowReassignConfirm(true)}
                      disabled={!selectedReassignUser}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowReassignConfirm(false)}
                      className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-gray-50 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={confirmReassignment}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">send</span>
                      Confirm & Send
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Comprehensive History Modal */}
      {showComprehensiveHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">schedule</span>
                <h2 className="text-lg font-bold text-[#111318]">Group Activity</h2>
              </div>
              <button
                onClick={() => setShowComprehensiveHistory(false)}
                className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[60vh]">
              <div className="space-y-6">
                {allActivityLogs.length === 0 ? (
                  <p className="text-sm text-[#616f89] text-center py-8">No activity history</p>
                ) : (
                  allActivityLogs.map((activity) => {
                    const message = getActivityMessage(activity);
                    const activityUserColor = activity.user ? getMemberColor(activity.user.name, myGroup?.members) : null;
                    
                    const getActionText = () => {
                      const action = activity.actionType;
                      if (action === "deliverable_submitted") return "submitted";
                      if (action === "deliverable_created") return "created";
                      if (action === "deliverable_updated") return "edited";
                      if (action === "deliverable_reassigned") return "reassigned";
                      if (action === "deliverable_reassign_pending") {
                        const pendingName = activity.metadata?.pending_assignee_name;
                        return pendingName ? `requested reassignment to ${pendingName} (pending)` : "requested reassignment (pending)";
                      }
                      if (action === "deliverable_reassign_accepted") {
                        const originalName = activity.metadata?.original_assignee_name;
                        return originalName ? `accepted reassignment from ${originalName}` : "accepted reassignment";
                      }
                      if (action === "deliverable_deleted") return "deleted";
                      if (action === "meeting_created") return "scheduled";
                      if (action === "meeting_concluded") return "concluded";
                      if (action === "link_added") return "uploaded";
                      if (action === "meeting_summary_added") return "completed";
                      return "updated";
                    };
                    
                    return (
                      <div key={activity.id} className="flex gap-3 items-start">
                        {activity.user?.avatar_url ? (
                          <Avatar
                            name={activity.user?.name || "Unknown"}
                            src={activity.user?.avatar_url}
                            size="h-10 w-10"
                          />
                        ) : (
                          <div 
                            className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                            style={{ backgroundColor: activityUserColor?.hex || '#6b7280' }}
                          >
                            {(activity.user?.name || "?").split(" ").map((n: string) => n.charAt(0)).join("").toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">
                            <span className="font-semibold text-[#111318]">{activity.user?.name || "Unknown"} </span>
                            <span className="text-[#616f89]">{getActionText()} </span>
                            {activity.entityId ? (
                              <button
                                onClick={() => {
                                  if (activity.actionType?.startsWith('deliverable')) {
                                    setViewDeliverableId(activity.entityId);
                                    setShowComprehensiveHistory(false);
                                  }
                                  if (activity.actionType === 'meeting_created' || activity.actionType === 'meeting_concluded') {
                                    setViewMeetingId(activity.entityId);
                                    setShowComprehensiveHistory(false);
                                  }
                                }}
                                className="font-semibold italic cursor-pointer focus:outline-none hover:underline"
                                style={{ color: activityUserColor?.hex || '#0066cc' }}
                              >
                                {message.title}
                              </button>
                            ) : (
                              <span className="font-semibold italic" style={{ color: activityUserColor?.hex || '#0066cc' }}>{message.title}</span>
                            )}
                          </p>
                          <p className="text-xs text-[#9ca3af] uppercase tracking-wide mt-1.5">{formatActivityDate(activity.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowComprehensiveHistory(false)}
                className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );

  if (hideLayout) return content;

  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel={headerLabel}>
      {content}
    </DashboardLayout>
  );
}
