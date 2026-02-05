'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Activity {
  id: string;
  actionType: string;
  entityTitle: string;
  createdAt: string;
  groupName: string;
  projectName: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
}

export function TeamActivityWidget() {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const getActivityMessage = (activity: Activity) => {
    const actionMap: Record<string, { action: string; entity: string }> = {
      deliverable_created: { action: "created", entity: "deliverable" },
      deliverable_submitted: { action: "submitted", entity: "deliverable" },
      deliverable_reassigned: { action: "reassigned", entity: "deliverable" },
      deliverable_deleted: { action: "deleted", entity: "deliverable" },
      meeting_created: { action: "scheduled", entity: "meeting" },
      link_created: { action: "added", entity: "collaboration link" },
    };
    const info = actionMap[activity.actionType] || { action: "updated", entity: "item" };
    return { action: info.action, entity: info.entity };
  };

  const formatActivityTime = (createdAt: string) => {
    const now = new Date();
    const then = new Date(createdAt);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        // Fetch activity from all groups the user belongs to
        const res = await fetch('/api/user/activity?limit=10');
        if (!res.ok) throw new Error('Failed to fetch activity');
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            return bTime - aTime;
          });
          const uniqueByUser: Activity[] = [];
          const seenUsers = new Set<string>();
          for (const activity of sorted) {
            const userId = activity.user?.id;
            if (!userId || seenUsers.has(userId)) continue;
            seenUsers.add(userId);
            uniqueByUser.push(activity);
            if (uniqueByUser.length >= 4) break;
          }
          setActivities(uniqueByUser);
        } else {
          setActivities([]);
        }
      } catch (e) {
        console.error('Failed to fetch team activity:', e);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.email) {
      fetchActivities();
    }
  }, [session?.user?.email]);

  return (
    <div className="bg-white rounded-2xl border border-[#f0f2f4] shadow-sm p-6">
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        Team Activity
        <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
      </h3>
      <div className="space-y-6">
        {loading ? (
          <p className="text-xs text-[#657386]">Loading activity...</p>
        ) : activities.length === 0 ? (
          <p className="text-xs text-[#657386]">No recent activity</p>
        ) : (
          activities.map((activity) => {
            const message = getActivityMessage(activity);
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.user.name || 'User')}&background=E5E7EB&color=111827`;
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="relative">
                  <div
                    className="size-10 rounded-full bg-cover border-2 border-white"
                    style={{
                      backgroundImage: `url("${activity.user.avatar_url || defaultAvatar}")`,
                    }}
                  ></div>
                  <div className="absolute bottom-0 right-0 size-3 border-2 border-white rounded-full bg-green-500"></div>
                </div>
                <div>
                  <p className="text-sm font-bold">{activity.user.name}</p>
                  <p className="text-xs text-[#657386]">
                    {message.action}{' '}
                    <span className="text-primary font-medium">{activity.entityTitle}</span>
                  </p>
                  <p className="text-[10px] text-[#a0aec0] mt-1">{formatActivityTime(activity.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <button className="w-full mt-8 py-2 rounded-lg border border-[#f0f2f4] text-xs font-bold hover:bg-[#fafafa] transition-colors">
        View Full Team Overview
      </button>
    </div>
  );
}
