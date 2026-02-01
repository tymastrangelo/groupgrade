'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type PendingNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  from_user?: {
    name: string;
    avatar_url?: string;
  };
  deliverable?: {
    id: string;
    title: string;
    project_id: string;
  };
};

type ActiveDeliverable = {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  projectId: string;
  groupId: string;
};

function formatTimeAgo(dateString: string) {
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
}

function formatDueDate(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMs < 0) return { text: "Overdue", color: "text-red-600", bg: "bg-red-100" };
  if (diffDays === 0) return { text: "Due Today", color: "text-orange-600", bg: "bg-orange-100" };
  if (diffDays === 1) return { text: "Due Tomorrow", color: "text-amber-600", bg: "bg-amber-100" };
  if (diffDays <= 7) return { text: `${diffDays}d left`, color: "text-blue-600", bg: "bg-blue-100" };
  
  return { text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "text-gray-600", bg: "bg-gray-100" };
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const letter = (name || "?").charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-8 w-8 rounded-full object-cover border border-[#e5e7eb]"
      />
    );
  }
  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-[#e5e7eb] text-xs">
      {letter}
    </div>
  );
}

export function SubmissionCompletionCard() {
  const { data: session } = useSession();
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
  const [activeDeliverables, setActiveDeliverables] = useState<ActiveDeliverable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch pending notifications
        const notifRes = await fetch('/api/notifications');
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          const pending = notifData.filter((n: any) => 
            n.type === 'deliverable_assignment' && n.status === 'pending'
          );
          setPendingNotifications(pending);
        }

        // Fetch user's active deliverables across all projects
        const deliverablesRes = await fetch('/api/user/activity');
        if (deliverablesRes.ok) {
          const data = await deliverablesRes.json();
          // Filter for deliverables assigned to current user that aren't submitted or pending
          const active = (data.deliverables || [])
            .filter((d: any) => d.status !== 'submitted' && d.status !== 'pending')
            .slice(0, 5);
          setActiveDeliverables(active);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.email]);

  const handleAction = async (notificationId: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        setPendingNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (action === 'accept') {
          // Refresh deliverables
          const deliverablesRes = await fetch('/api/user/activity');
          if (deliverablesRes.ok) {
            const data = await deliverablesRes.json();
            const active = (data.deliverables || [])
              .filter((d: any) => d.status !== 'submitted' && d.status !== 'pending')
              .slice(0, 5);
            setActiveDeliverables(active);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} notification:`, error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-[#e5e7eb] shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const totalItems = pendingNotifications.length + activeDeliverables.length;

  if (totalItems === 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <h4 className="text-sm font-bold text-emerald-900">All Caught Up!</h4>
        </div>
        <p className="text-xs text-emerald-700 leading-relaxed">
          You have no pending assignments or active deliverables. Great work!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-blue-50 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#111318] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-primary">assignment</span>
            My Deliverables
          </h4>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
            {totalItems}
          </span>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {/* Pending Notifications */}
        {pendingNotifications.map((notification) => (
          <div
            key={`notif-${notification.id}`}
            className="p-4 border-b border-[#e5e7eb] bg-amber-50/50 hover:bg-amber-50 transition-colors"
          >
            <div className="flex gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base">notifications_active</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded uppercase">
                    Pending
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#111318] leading-tight">
                  {notification.deliverable?.title || notification.title}
                </p>
                <p className="text-[10px] text-[#616f89] mt-0.5">
                  From {notification.from_user?.name || "Team Member"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(notification.id, 'accept')}
                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">check</span>
                Accept
              </button>
              <button
                onClick={() => handleAction(notification.id, 'decline')}
                className="flex-1 py-1.5 px-3 border border-red-300 text-red-600 hover:bg-red-50 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">close</span>
                Decline
              </button>
            </div>
          </div>
        ))}

        {/* Active Deliverables */}
        {activeDeliverables.map((deliverable) => {
          const dueInfo = formatDueDate(deliverable.dueDate);
          return (
            <Link
              key={`del-${deliverable.id}`}
              href={`/student/projects/${deliverable.projectId}`}
              className="block p-4 border-b border-[#e5e7eb] last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  deliverable.status === 'in-progress' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <span className="material-symbols-outlined text-base">
                    {deliverable.status === 'in-progress' ? 'play_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#111318] leading-tight truncate">
                    {deliverable.title}
                  </p>
                  {dueInfo && (
                    <p className={`text-[10px] font-bold mt-1 ${dueInfo.color}`}>
                      {dueInfo.text}
                    </p>
                  )}
                </div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase ${
                  deliverable.status === 'in-progress'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {deliverable.status === 'in-progress' ? 'Started' : 'New'}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
