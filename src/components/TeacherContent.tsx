"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

type ClassRow = {
  id: string;
  name: string;
  code: string;
  join_code_expires_at?: string;
  created_at?: string;
};

export function TeacherContent() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchClasses = async () => {
    setError(null);
    const res = await fetch('/api/classes');
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to load classes');
      setLoading(false);
      return;
    }
    const j = await res.json();
    setClasses(j.classes || []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClasses();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to create class');
      setCreating(false);
      return;
    }
    setNewName('');
    await fetchClasses();
    setCreating(false);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (e) {
      console.error('Clipboard copy failed', e);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-12 gap-8">
      <div className="col-span-12 xl:col-span-9 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-[#111318] dark:text-white tracking-tight">Your Classes</h2>
            <p className="text-[#616f89] mt-1 font-medium">Create a class and share the join code with students.</p>
          </div>
          <div className="flex gap-2">
            <input
              className="bg-white dark:bg-[#1a202c] border border-[#e5e7eb] dark:border-[#2d3748] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Class name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Create
            </button>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] p-6 animate-pulse h-48" />
            ))
          ) : classes.length === 0 ? (
            <div className="col-span-2 border-2 border-dashed border-[#e5e7eb] dark:border-[#2d3748] rounded-xl p-6 text-center text-[#616f89]">
              No classes yet. Create one to get a join code.
            </div>
          ) : (
            classes.map(cls => (
              <Link
                key={cls.id}
                href={`/teacher/classes/${cls.id}`}
                className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] p-6 hover:shadow-md transition-shadow block"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-[#111318] dark:text-white mb-1">{cls.name}</h3>
                    <p className="text-xs text-[#616f89]">Created {cls.created_at ? new Date(cls.created_at).toLocaleDateString() : ''}</p>
                  </div>
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
                </div>
                <div className="flex items-center justify-between text-sm text-[#616f89]">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">schedule</span>Code expires {cls.join_code_expires_at ? new Date(cls.join_code_expires_at).toLocaleDateString() : 'soon'}</span>
                  <span className="flex items-center gap-1 text-primary font-bold">Share with students</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="col-span-12 xl:col-span-3 flex flex-col gap-6">
        <div className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] p-6">
          <h3 className="text-sm font-bold mb-3 text-[#111318] dark:text-white">How join codes work</h3>
          <ul className="text-sm text-[#616f89] space-y-2">
            <li className="flex gap-2"><span className="material-symbols-outlined text-base text-primary">edit</span><span>Create a class to generate a code.</span></li>
            <li className="flex gap-2"><span className="material-symbols-outlined text-base text-primary">send</span><span>Share the code with students.</span></li>
            <li className="flex gap-2"><span className="material-symbols-outlined text-base text-primary">event</span><span>Codes expire after 14 days.</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
