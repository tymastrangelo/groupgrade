'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function RolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[#616f89] dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!role) return;
    setSaving(true);
    setError(null);
    const res = await fetch('/api/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to set role');
      setSaving(false);
      return;
    }
    router.push(role === 'teacher' ? '/teacher' : '/student');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      <header className="flex items-center justify-between border-b border-[#dbdfe6] dark:border-[#2d3748] px-6 md:px-10 py-3 bg-white dark:bg-background-dark">
        <div className="flex items-center gap-3 text-[#111318] dark:text-white">
          <div className="size-6 text-primary">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <h2 className="text-lg font-bold">GroupGrade</h2>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#1c2433] rounded-xl shadow-sm border border-[#dbdfe6] dark:border-[#2d3748] p-8 w-full max-w-md">
          <h1 className="text-xl font-bold mb-4">Select Your Role</h1>
          <p className="text-sm text-[#616f89] dark:text-gray-400 mb-6">Choose how you’ll use GroupGrade.</p>

          <div className="space-y-3">
            <label className={`flex items-center gap-3 p-3 rounded-lg border ${role==='teacher' ? 'border-primary bg-primary/5' : 'border-[#dbdfe6] dark:border-[#2d3748]'} cursor-pointer hover:bg-primary/10 transition`}>
              <input type="radio" name="role" className="sr-only" checked={role==='teacher'} onChange={() => setRole('teacher')} />
              <span className="material-symbols-outlined text-primary">school</span>
              <div>
                <p className="font-semibold">Teacher</p>
                <p className="text-xs text-[#616f89] dark:text-gray-400">Create classes, projects, groups and tasks.</p>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-lg border ${role==='student' ? 'border-primary bg-primary/5' : 'border-[#dbdfe6] dark:border-[#2d3748]'} cursor-pointer hover:bg-primary/10 transition`}>
              <input type="radio" name="role" className="sr-only" checked={role==='student'} onChange={() => setRole('student')} />
              <span className="material-symbols-outlined text-primary">person</span>
              <div>
                <p className="font-semibold">Student</p>
                <p className="text-xs text-[#616f89] dark:text-gray-400">Join classes, view tasks, submit work.</p>
              </div>
            </label>
          </div>

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

          <div className="mt-6 flex justify-end">
            <button
              disabled={!role || saving}
              onClick={handleSubmit}
              className="rounded-lg h-11 px-6 bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-[#616f89] dark:text-gray-500 text-xs">
        © 2026 GroupGrade Accountability Platform. All rights reserved.
      </footer>
    </div>
  );
}
