'use client';

import { useState, useEffect, useRef } from 'react';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'info';
  created_at: string;
  from_user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  deliverable?: {
    id: string;
    title: string;
    group_id: string;
    project_id: string;
  };
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
    <div className={`${size} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-[#e5e7eb] text-xs`}>
      {letter}
    </div>
  );
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingCount = notifications.filter(n => n.status === 'pending' && n.type === 'deliverable_assignment').length;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = async (notificationId: string, action: 'accept' | 'decline') => {
    setActionLoading(notificationId);
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        // Refresh notifications
        await fetchNotifications();
        // Optionally reload page to update deliverables
        if (action === 'accept') {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} notification:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getNotificationIcon = (type: string, status: string) => {
    if (type === 'deliverable_assignment' && status === 'pending') {
      return { icon: 'assignment_ind', color: 'text-amber-600', bg: 'bg-amber-50' };
    }
    if (type === 'assignment_declined') {
      return { icon: 'cancel', color: 'text-red-500', bg: 'bg-red-50' };
    }
    if (status === 'accepted') {
      return { icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    }
    return { icon: 'notifications', color: 'text-primary', bg: 'bg-primary/10' };
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[#616f89] hover:bg-[#f3f4f6] rounded-full relative transition-colors"
      >
        <span className="material-symbols-outlined">notifications</span>
        {(unreadCount > 0 || pendingCount > 0) && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{unreadCount || pendingCount}</span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 max-h-[480px] bg-white rounded-xl border border-[#e5e7eb] shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111318]">Notifications</h3>
              {pendingCount > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {pendingCount} pending
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-sm text-[#616f89]">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-[#e5e7eb] mb-2">notifications_off</span>
                <p className="text-sm text-[#616f89]">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e5e7eb]">
                {notifications.map((notification) => {
                  const iconConfig = getNotificationIcon(notification.type, notification.status);
                  const isPending = notification.type === 'deliverable_assignment' && notification.status === 'pending';

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-[#f9fafb] transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        {/* Icon or Avatar */}
                        <div className={`shrink-0 h-10 w-10 rounded-full ${iconConfig.bg} flex items-center justify-center`}>
                          {notification.from_user ? (
                            <Avatar
                              name={notification.from_user.name}
                              src={notification.from_user.avatar_url}
                              size="h-10 w-10"
                            />
                          ) : (
                            <span className={`material-symbols-outlined ${iconConfig.color}`}>
                              {iconConfig.icon}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-[#111318] leading-tight">
                              {notification.title}
                            </p>
                            <span className="text-[10px] text-[#616f89] whitespace-nowrap">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-[#616f89] mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Action buttons for pending assignments */}
                          {isPending && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(notification.id, 'accept');
                                }}
                                disabled={actionLoading === notification.id}
                                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                {actionLoading === notification.id ? (
                                  <span className="animate-spin">...</span>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined text-sm">check</span>
                                    Accept
                                  </>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(notification.id, 'decline');
                                }}
                                disabled={actionLoading === notification.id}
                                className="flex-1 py-1.5 px-3 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                                Decline
                              </button>
                            </div>
                          )}

                          {/* Status badge for non-pending */}
                          {!isPending && notification.status !== 'info' && (
                            <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              notification.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : notification.status === 'declined'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {notification.status}
                            </span>
                          )}
                        </div>

                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[#e5e7eb] bg-[#f9fafb]">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Could navigate to a full notifications page
                }}
                className="w-full text-center text-xs font-medium text-primary hover:text-blue-700 py-1"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
