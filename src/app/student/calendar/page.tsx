'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { tasksCache } from '@/lib/tasksCache';
import { format } from 'date-fns';

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

type CalendarEvent = {
  id: string;
  date: string; // ISO
  title: string;
  kind: 'project' | 'deliverable' | 'task';
  course: string;
  projectId: string;
  tone: 'primary' | 'yellow' | 'green' | 'purple' | 'cyan';
};

type ViewMode = 'month' | 'week';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toneStyles(tone: string) {
  switch (tone) {
    case 'yellow':
      return 'bg-yellow-500/10 text-yellow-600';
    case 'green':
      return 'bg-green-500/10 text-green-600';
    case 'purple':
      return 'bg-purple-500/10 text-purple-600';
    case 'cyan':
      return 'bg-cyan-500/10 text-cyan-600';
    default:
      return 'bg-primary/10 text-primary';
  }
}

function daysInViewMonth(anchor: Date) {
  const start = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const cells = [] as Date[];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  return cells;
}

function daysInViewWeek(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function isoDate(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function StudentCalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [viewDeliverableId, setViewDeliverableId] = useState<string | null>(null);
  const [viewedDeliverable, setViewedDeliverable] = useState<any>(null);
  const [viewTaskId, setViewTaskId] = useState<string | null>(null);
  const [viewedTask, setViewedTask] = useState<any>(null);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const classesRes = await tasksCache.fetch<{ classes: any[] }>('/api/classes');
        const classes = (classesRes as any)?.classes || [];

        const eventsAccumulator: CalendarEvent[] = [];

        // Get current user's email for deliverable filtering
        const meRes = await tasksCache.fetch<any>('/api/me');
        const userEmail = meRes?.user?.email;

        await Promise.all(
          classes.map(async (cls: any) => {
            try {
              const classDetail = await tasksCache.fetch<any>(`/api/classes/${cls.id}`);
              const projects = (classDetail as any)?.projects || [];

              await Promise.all(
                projects.map(async (p: any) => {
                  if (p.due_date) {
                    eventsAccumulator.push({
                      id: `project-${p.id}`,
                      date: p.due_date,
                      title: p.name,
                      kind: 'project',
                      course: cls.name,
                      projectId: p.id,
                      tone: 'primary',
                    });
                  }

                  // Fetch deliverables assigned to the current user for this project
                  try {
                    const deliverables = await tasksCache.fetch<any>(`/api/deliverables?projectId=${p.id}`);
                    // API returns array directly
                    const deliverablesList = Array.isArray(deliverables) ? deliverables : [];
                    console.log(`[Calendar] Project ${p.name} (${p.id}):`, {
                      totalDeliverables: deliverablesList.length,
                      userEmail,
                      deliverables: deliverablesList.map((d: any) => ({
                        id: d.id,
                        title: d.title,
                        assignedEmail: d.assignedTo?.email,
                        dueDate: d.dueDate,
                        matches: d.assignedTo?.email === userEmail && !!d.dueDate
                      }))
                    });
                    deliverablesList.forEach((d: any) => {
                      // Only show deliverables assigned to the current user
                      if (d.assignedTo?.email === userEmail && d.dueDate) {
                        console.log(`[Calendar] Adding deliverable: ${d.title} on ${d.dueDate}`);
                        eventsAccumulator.push({
                          id: `deliverable-${d.id}`,
                          date: d.dueDate,
                          title: d.title,
                          kind: 'deliverable',
                          course: cls.name,
                          projectId: p.id,
                          tone: 'purple',
                        });
                      }
                    });
                  } catch (err) {
                    console.error(`Failed to fetch deliverables for project ${p.id}:`, err);
                  }
                })
              );
            } catch {
              // Ignore individual class failures to keep rest loading
            }
          })
        );

        eventsAccumulator.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(eventsAccumulator);

        // Fetch personal tasks
        try {
          const tasksRes = await tasksCache.fetch<any>('/api/user/tasks');
          const tasksList = tasksRes?.tasks || [];
          console.log('[Calendar] Personal tasks fetched:', { taskCount: tasksList.length, tasks: tasksList });
          tasksList.forEach((t: any) => {
            if (t.dueDate) {
              console.log(`[Calendar] Adding task: ${t.title} on ${t.dueDate}`);
              eventsAccumulator.push({
                id: `task-${t.id}`,
                date: t.dueDate,
                title: t.title,
                kind: 'task',
                course: 'Personal',
                projectId: t.projectId || '',
                tone: 'cyan',
              });
            } else {
              console.log(`[Calendar] Skipping task ${t.title} - no due date`);
            }
          });
          // Re-sort after adding tasks
          eventsAccumulator.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setEvents(eventsAccumulator);
        } catch (err) {
          console.error('Failed to fetch personal tasks:', err);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const days = useMemo(() => (viewMode === 'month' ? daysInViewMonth(viewDate) : daysInViewWeek(viewDate)), [viewDate, viewMode]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    days.forEach((d) => {
      map.set(isoDate(d), []);
    });
    events.forEach((ev) => {
      const dayKey = isoDate(new Date(ev.date));
      if (map.has(dayKey)) {
        map.get(dayKey)!.push(ev);
      }
    });
    return map;
  }, [events, days]);

  const upcomingSections = useMemo(() => {
    const formatDue = (date: string) => format(new Date(date), 'MMM d, h:mm a');

    if (viewMode === 'month') {
      const monthStart = startOfMonth(viewDate);
      const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      const inMonth = events.filter((ev) => {
        const t = new Date(ev.date);
        return t >= monthStart && t < nextMonthStart;
      });
      return [
        {
          title: 'This Month',
          items: inMonth.map((ev) => ({
            ...ev,
            due: formatDue(ev.date),
          })),
        },
      ];
    }

    const weekStart = startOfWeek(viewDate);
    const thisWeekEnd = addDays(weekStart, 7).getTime();
    const nextWeekEnd = addDays(weekStart, 14).getTime();

    const upcoming = events.filter((ev) => new Date(ev.date) >= weekStart);

    const thisWeek = upcoming.filter((ev) => {
      const t = new Date(ev.date).getTime();
      return t < thisWeekEnd;
    });
    const nextWeek = upcoming.filter((ev) => {
      const t = new Date(ev.date).getTime();
      return t >= thisWeekEnd && t < nextWeekEnd;
    });

    return [
      {
        title: 'This Week',
        items: thisWeek.map((ev) => ({
          ...ev,
          due: formatDue(ev.date),
        })),
      },
      {
        title: 'Next Week',
        items: nextWeek.map((ev) => ({
          ...ev,
          due: formatDue(ev.date),
        })),
      },
    ];
  }, [events, viewMode, viewDate]);

  const monthLabel = useMemo(() => format(viewDate, 'MMMM yyyy'), [viewDate]);

  const changeMonth = (delta: number) => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  const changeWeek = (delta: number) => {
    setViewDate((d) => addDays(d, delta * 7));
  };

  const handleEventClick = async (event: CalendarEvent) => {
    if (event.kind === 'project') {
      router.push(`/student/projects/${event.projectId}`);
    } else if (event.kind === 'deliverable') {
      // Fetch deliverable details
      const deliverableId = event.id.replace('deliverable-', '');
      try {
        const response = await fetch(`/api/deliverables?projectId=${event.projectId}`);
        const deliverables = await response.json();
        const deliverable = Array.isArray(deliverables) 
          ? deliverables.find((d: any) => d.id === deliverableId)
          : null;
        if (deliverable) {
          setViewedDeliverable(deliverable);
          setViewDeliverableId(deliverableId);
        }
      } catch (err) {
        console.error('Failed to fetch deliverable:', err);
      }
    } else if (event.kind === 'task') {
      // Fetch task details
      const taskId = event.id.replace('task-', '');
      try {
        const response = await fetch(`/api/user/tasks/${taskId}`);
        if (response.ok) {
          const data = await response.json();
          setViewedTask(data.task || data);
          setViewTaskId(taskId);
        }
      } catch (err) {
        console.error('Failed to fetch task:', err);
      }
    }
  };

  const closeDeliverableView = () => {
    setViewDeliverableId(null);
    setViewedDeliverable(null);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Calendar">
      <div className="w-full bg-[#f6f6f8] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-[#8d5e5e]">
              <span className="font-semibold text-[#111318]">My Schedule</span>
              <span>•</span>
              <span>{format(viewDate, 'PPP')}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                  viewMode === 'week' ? 'bg-primary text-white border-primary' : 'border-[#e5e7eb] text-[#111318]'
                }`}
                aria-pressed={viewMode === 'week'}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                  viewMode === 'month' ? 'bg-primary text-white border-primary' : 'border-[#e5e7eb] text-[#111318]'
                }`}
                aria-pressed={viewMode === 'month'}
              >
                Month
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#f5f0f0] rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#f5f0f0]">
              <h2 className="text-2xl font-bold text-[#111318]">{monthLabel}</h2>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 hover:bg-[#f5f0f0] rounded-lg"
                  onClick={() => (viewMode === 'month' ? changeMonth(-1) : changeWeek(-1))}
                  aria-label="Previous period"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  className="px-4 py-2 text-sm font-bold bg-[#f5f0f0] rounded-lg"
                  onClick={() => setViewDate(new Date())}
                >
                  Today
                </button>
                <button
                  className="p-2 hover:bg-[#f5f0f0] rounded-lg"
                  onClick={() => (viewMode === 'month' ? changeMonth(1) : changeWeek(1))}
                  aria-label="Next period"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 bg-[#f5f0f0] gap-[1px]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  className="bg-white p-3 text-center text-xs font-bold text-[#8d5e5e] uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
              {days.map((d) => {
                const key = isoDate(d);
                const isMuted = d.getMonth() !== viewDate.getMonth() && viewMode === 'month';
                const isToday = isSameDay(d, today);
                const dayEvents = eventsByDay.get(key) || [];
                return (
                  <div
                    key={key}
                    className={`bg-white min-h-[120px] p-2 ${isMuted ? 'text-[#8d5e5e]/50' : ''} ${
                      isToday ? 'ring-2 ring-primary ring-inset' : ''
                    }`}
                  >
                    <span className={isToday ? 'text-sm font-bold text-primary' : 'text-sm font-medium text-[#111318]'}>
                      {d.getDate()}
                    </span>
                    <div className="mt-1 flex flex-col gap-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => handleEventClick(ev)}
                          className={`flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] rounded font-bold cursor-pointer hover:opacity-80 transition-opacity text-left ${toneStyles(ev.tone)}`}
                          title={`${ev.title} • ${ev.course}`}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          <span className="truncate">{ev.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-[#8d5e5e]">+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <section className="bg-white border border-[#f5f0f0] rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#111318]">All Upcoming Items</h3>
              <div className="flex gap-2">
                <button className="text-sm text-[#8d5e5e] hover:text-primary px-3 py-1 rounded-full border border-[#f5f0f0]">Sort by Date</button>
                <button className="text-sm text-[#8d5e5e] hover:text-primary px-3 py-1 rounded-full border border-[#f5f0f0]">Filter Course</button>
              </div>
            </div>

            <div className="space-y-8">
              {upcomingSections.map((section) => (
                <div key={section.title}>
                  <h4 className="text-sm font-bold text-[#8d5e5e] uppercase tracking-widest mb-4 px-1">{section.title}</h4>
                  {section.items.length === 0 ? (
                    <p className="text-sm text-[#8d5e5e] px-1">Nothing scheduled.</p>
                  ) : (
                    <div className="space-y-3">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleEventClick(item)}
                          className={`flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left w-full ${
                            item.tone === 'yellow'
                              ? 'border-yellow-500'
                              : item.tone === 'green'
                                ? 'border-green-500'
                                : item.tone === 'purple'
                                  ? 'border-purple-500'
                                  : 'border-primary'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-[#111318] truncate">{item.title}</h5>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${toneStyles(item.tone)}`}>
                                {item.kind === 'project' ? 'PROJECT' : 'DELIVERABLE'}
                              </span>
                            </div>
                            <p className="text-sm text-[#8d5e5e] truncate">{item.course}</p>
                          </div>
                          <div className="text-right min-w-[140px]">
                            <p className="text-sm font-bold text-primary">{item.due}</p>
                            <p className="text-[10px] text-[#8d5e5e]">{format(new Date(item.date), 'EEE')}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</div>}
          {loading && <div className="text-sm text-[#8d5e5e]">Loading calendar...</div>}
        </div>
      </div>

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
                <p className="text-sm text-[#616f89]">
                  {viewedDeliverable.status === 'not-started' ? 'New' : 
                   viewedDeliverable.status === 'in-progress' ? 'Started' : 'Submitted'}
                </p>
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
            <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end">
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

      {/* Task View Modal */}
      {viewTaskId && viewedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#e5e7eb]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#111318]">Task Details</h2>
                <button
                  onClick={() => {
                    setViewTaskId(null);
                    setViewedTask(null);
                  }}
                  className="text-[#657386] hover:text-[#111318] transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#111318] mb-2">Title</label>
                  <p className="text-sm text-[#111318]">{viewedTask.title}</p>
                </div>

                {viewedTask.dueDate && (
                  <div>
                    <label className="block text-sm font-bold text-[#111318] mb-2">Due Date</label>
                    <p className="text-sm text-[#616f89]">{format(new Date(viewedTask.dueDate), 'MMM d, yyyy')}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-[#111318] mb-2">Status</label>
                  <p className="text-sm text-[#616f89] capitalize">{(viewedTask.status || 'todo').replace('_', ' ')}</p>
                </div>

                {viewedTask.projectName && (
                  <div>
                    <label className="block text-sm font-bold text-[#111318] mb-2">Project</label>
                    <p className="text-sm text-[#616f89]">{viewedTask.projectName}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end">
              <button
                onClick={() => {
                  setViewTaskId(null);
                  setViewedTask(null);
                }}
                className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
