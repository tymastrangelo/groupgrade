'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';

type CalendarEvent = {
  id: string;
  date: string; // ISO
  title: string;
  kind: 'project' | 'milestone';
  course: string;
  projectId: string;
  tone: 'primary' | 'blue' | 'yellow' | 'green';
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
    case 'blue':
      return 'bg-[#0056b3]/10 text-[#0056b3]';
    case 'yellow':
      return 'bg-yellow-500/10 text-yellow-600';
    case 'green':
      return 'bg-green-500/10 text-green-600';
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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

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
        const classesRes = await fetch('/api/classes');
        if (!classesRes.ok) {
          const j = await classesRes.json().catch(() => ({}));
          throw new Error(j.error || 'Failed to load classes');
        }
        const { classes } = await classesRes.json();

        const eventsAccumulator: CalendarEvent[] = [];

        await Promise.all(
          (classes || []).map(async (cls: any) => {
            const classDetailRes = await fetch(`/api/classes/${cls.id}`);
            if (!classDetailRes.ok) return;
            const classDetail = await classDetailRes.json();
            const projects = classDetail.projects || [];

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

                try {
                  const msRes = await fetch(`/api/projects/${p.id}/milestones`);
                  if (!msRes.ok) return;
                  const msJson = await msRes.json();
                  const milestones = msJson.milestones || [];
                  milestones.forEach((m: any) => {
                    if (!m.due_date) return;
                    eventsAccumulator.push({
                      id: `milestone-${m.id}`,
                      date: m.due_date,
                      title: m.name,
                      kind: 'milestone',
                      course: cls.name,
                      projectId: p.id,
                      tone: 'blue',
                    });
                  });
                } catch (err) {
                  // milestones optional; ignore
                }
              })
            );
          })
        );

        eventsAccumulator.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(eventsAccumulator);
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
                        <div
                          key={ev.id}
                          className={`flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] rounded font-bold ${toneStyles(ev.tone)}`}
                          title={`${ev.title} • ${ev.course}`}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          <span className="truncate">{ev.title}</span>
                        </div>
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
                        <div
                          key={item.id}
                          className={`flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-shadow ${
                            item.tone === 'yellow'
                              ? 'border-yellow-500'
                              : item.tone === 'green'
                                ? 'border-green-500'
                                : 'border-primary'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-[#111318] truncate">{item.title}</h5>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${toneStyles(item.tone)}`}>
                                {item.kind === 'project' ? 'PROJECT' : 'MILESTONE'}
                              </span>
                            </div>
                            <p className="text-sm text-[#8d5e5e] truncate">{item.course}</p>
                          </div>
                          <div className="text-right min-w-[140px]">
                            <p className="text-sm font-bold text-primary">{item.due}</p>
                            <p className="text-[10px] text-[#8d5e5e]">{format(new Date(item.date), 'EEE')}</p>
                          </div>
                        </div>
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
    </DashboardLayout>
  );
}
