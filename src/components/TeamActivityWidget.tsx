'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { tasksCache } from '@/lib/tasksCache';

interface Activity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  actionType: string;
  entityTitle: string;
  createdAt: string;
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
        // Fetch user's classes and projects
        const classesRes = await tasksCache.fetch<{ classes: any[] }>('/api/classes');
        const classes = (classesRes as any)?.classes || [];

        const allActivities: Activity[] = [];

        // Fetch activity from each project
        await Promise.all(
          classes.map(async (cls: any) => {
            try {
              const classDetail = await tasksCache.fetch<any>(`/api/classes/${cls.id}`);
              const projects = (classDetail as any)?.projects || [];

              await Promise.all(
                projects.map(async (p: any) => {
                  try {
                    // Get groups for this project to fetch their activity
                    const groups = p.groups || [];
                    await Promise.all(
                      groups.map(async (g: any) => {
                        try {
                          const activityRes = await tasksCache.fetch<any>(
                            `/api/activity?groupId=${g.id}&projectId=${p.id}&limit=10`
                          );
                          const activityList = Array.isArray(activityRes) ? activityRes : activityRes?.activities || [];
                          allActivities.push(...activityList);
                        } catch (err) {
                          console.error(`Failed to fetch activity for group ${g.id}:`, err);
                        }
                      })
                    );
                  } catch (err) {
                    console.error(`Failed to fetch activity for project ${p.id}:`, err);
                  }
                })
              );
            } catch (err) {
              console.error(`Failed to fetch project details for class ${cls.id}:`, err);
            }
          })
        );

        // Sort by date and take latest 4
        allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActivities(allActivities.slice(0, 4));
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
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.userName || 'User')}&background=E5E7EB&color=111827`;
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="relative">
                  <div
                    className="size-10 rounded-full bg-cover border-2 border-white"
                    style={{
                      backgroundImage: `url("${activity.userAvatar || defaultAvatar}")`,
                    }}
                  ></div>
                  <div className="absolute bottom-0 right-0 size-3 border-2 border-white rounded-full bg-green-500"></div>
                </div>
                <div>
                  <p className="text-sm font-bold">{activity.userName}</p>
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
