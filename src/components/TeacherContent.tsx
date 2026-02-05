"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tasksCache } from '@/lib/tasksCache';

type ClassRow = {
  id: string;
  name: string;
  code: string;
  join_code_expires_at?: string;
  created_at?: string;
  term?: string | null;
  location?: string | null;
  meeting_days?: string[] | null;
  start_time?: string | null;
  end_time?: string | null;
  auto_generate_code?: boolean | null;
};

export function TeacherContent() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [term, setTerm] = useState('Spring 2026');
  const [location, setLocation] = useState('');
  const [meetingDays, setMeetingDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:15');
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
  const [previewCode, setPreviewCode] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const url = '/api/classes';
  const fetchClasses = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await tasksCache.fetch<{ classes: ClassRow[] }>(url);
      if (data && (data as any).classes) setClasses((data as any).classes || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = tasksCache.subscribe<{ classes: ClassRow[] }>(url, (data) => {
      if (data && (data as any).classes) setClasses((data as any).classes || []);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClasses();
    return () => unsubscribe();
  }, []);

  const generateCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 })
      .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
      .join('');
  };

  const resetForm = () => {
    setCourseName('');
    setTerm('Spring 2026');
    setLocation('');
    setMeetingDays(['Mon', 'Wed', 'Fri']);
    setStartTime('10:00');
    setEndTime('11:15');
    setAutoGenerateCode(true);
    setPreviewCode(generateCode());
  };

  const handleCreate = async () => {
    if (!courseName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: courseName.trim(),
        term,
        location,
        meetingDays,
        startTime,
        endTime,
        autoGenerateCode,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to create class');
      setCreating(false);
      return;
    }
    resetForm();
    setShowCreate(false);
    // Optionally optimistic update cache if API returns created class
    try {
      const j = await res.json();
      const created = (j && (j.class || j.created || j.newClass)) as ClassRow | undefined;
      if (created) {
        tasksCache.mutate<{ classes: ClassRow[] }>(url, (prev) => {
          const cur = (prev && (prev as any).classes) || [];
          return { classes: [...cur, created] } as any;
        });
      } else {
        await fetchClasses();
      }
    } catch {
      await fetchClasses();
    }
    setCreating(false);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (e) {
      console.error('Clipboard copy failed', e);
    }
  };

  useEffect(() => {
    setPreviewCode(generateCode());
  }, []);

  useEffect(() => {
    if (searchParams?.get('new') === '1' || searchParams?.get('new') === 'true') {
      setShowCreate(true);
      router.replace('/teacher/classes');
    }
  }, [searchParams, router]);

  const toggleDay = (day: string) => {
    setMeetingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const formatTime = (value?: string | null) => {
    if (!value) return '';
    const [hour, minute] = value.split(':');
    if (hour === undefined || minute === undefined) return value;
    const date = new Date();
    date.setHours(Number(hour), Number(minute), 0, 0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatMeetingDays = (days?: string[] | null) => {
    if (!days || days.length === 0) return 'Days TBD';
    const map: Record<string, string> = {
      Mon: 'M',
      Tue: 'T',
      Wed: 'W',
      Thu: 'Th',
      Fri: 'F',
      Sat: 'S',
      Sun: 'Su',
    };
    return days.map((d) => map[d] || d).join(' ');
  };

  const filteredClasses = useMemo(() => classes, [classes]);
  const totalClasses = filteredClasses.length;
  const expiringSoon = filteredClasses.filter((cls) => {
    if (!cls.join_code_expires_at) return false;
    const expires = new Date(cls.join_code_expires_at).getTime();
    const inSevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return expires < inSevenDays;
  }).length;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-[#e5e7eb]">
            <div className="p-6 border-b border-[#eef2f7] flex justify-between items-center">
              <h2 className="text-2xl font-black text-[#111318]">Create New Class</h2>
              <button
                className="text-[#616f89] hover:text-primary transition-colors"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              className="p-6 space-y-5 overflow-y-auto max-h-[80vh]"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#111318] mb-2">Course Name</label>
                <input
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., BUSFIN 4265 - Financial Institutions"
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-[#111318] mb-2">Term / Semester</label>
                  <select
                    className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
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
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
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
                      { key: 'Mon', label: 'M' },
                      { key: 'Tue', label: 'T' },
                      { key: 'Wed', label: 'W' },
                      { key: 'Thu', label: 'Th' },
                      { key: 'Fri', label: 'F' },
                      { key: 'Sat', label: 'S' },
                      { key: 'Sun', label: 'Su' },
                    ].map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleDay(day.key)}
                        className={`flex items-center justify-center w-9 h-9 text-xs font-bold border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                          meetingDays.includes(day.key)
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-200 text-[#111318]'
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
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#111318] mb-2">End Time</label>
                    <input
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-background-light rounded-xl border border-[#eef2f7] mt-2">
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
                      checked={autoGenerateCode}
                      className="sr-only peer"
                      type="checkbox"
                      onChange={(e) => setAutoGenerateCode(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="mt-4 flex items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-lg py-3">
                  <span className="text-2xl font-black tracking-widest text-primary">
                    {autoGenerateCode ? previewCode : 'CUSTOM'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eef2f7]">
                <button
                  className="px-6 py-2.5 text-sm font-bold text-[#616f89] hover:text-[#111318] border border-gray-200 rounded-lg transition-colors"
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2.5 text-sm font-bold text-white bg-primary hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-60"
                  type="submit"
                  disabled={creating || !courseName.trim()}
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">Your Classes</h2>
          <p className="text-[#616f89] mt-1 font-medium">Manage sections, schedules, and join codes from one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-[#475569]">Total Classes</p>
          <p className="text-2xl font-black text-[#111318] mt-2">{totalClasses}</p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-[#475569]">Codes Expiring Soon</p>
          <p className="text-2xl font-black text-[#111318] mt-2">{expiringSoon}</p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-[#475569]">Upcoming Meeting</p>
          <p className="text-sm font-bold text-[#111318] mt-2">Mon 10:00 AM</p>
          <p className="text-xs text-[#475569]">Based on your default schedule</p>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e5e7eb] p-6 animate-pulse h-44" />
            ))
          ) : filteredClasses.length === 0 ? (
            <div className="border-2 border-dashed border-[#e5e7eb] rounded-xl p-8 text-center text-[#616f89]">
              No classes yet. Create one to get a join code.
            </div>
          ) : (
            filteredClasses.map((cls) => (
              <Link
                key={cls.id}
                href={`/teacher/classes/${cls.id}`}
                className="bg-white rounded-xl border border-[#e5e7eb] p-6 hover:shadow-md transition-shadow block"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#111318] mb-1">{cls.name}</h3>
                    <p className="text-xs text-[#475569]">
                      Created {cls.created_at ? new Date(cls.created_at).toLocaleDateString() : 'recently'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#475569]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {cls.location || 'Room TBD'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {formatMeetingDays(cls.meeting_days)}
                        {cls.start_time || cls.end_time
                          ? ` ${formatTime(cls.start_time)}–${formatTime(cls.end_time)}`
                          : ' Time TBD'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">calendar_today</span>
                        {cls.term || 'Term TBD'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyCode(cls.code);
                      }}
                      className="text-primary text-sm font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">content_copy</span>
                      {cls.code}
                    </button>
                    <span className="text-xs text-[#475569]">
                      Code expires {cls.join_code_expires_at ? new Date(cls.join_code_expires_at).toLocaleDateString() : 'soon'}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
            <h3 className="text-sm font-bold mb-3 text-[#111318]">How join codes work</h3>
            <ul className="text-sm text-[#616f89] space-y-2">
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-base text-primary">edit</span>
                <span>Create a class to generate a code.</span>
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-base text-primary">send</span>
                <span>Share the code with students.</span>
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-base text-primary">event</span>
                <span>Codes expire after 14 days.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
            <h3 className="text-sm font-bold mb-3 text-[#111318]">Quick Actions</h3>
            <button
              className="w-full px-4 py-2.5 text-sm font-bold text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
              onClick={() => setShowCreate(true)}
            >
              Create another class
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
