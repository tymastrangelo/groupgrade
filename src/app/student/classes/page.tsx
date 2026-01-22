'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tasksCache } from '@/lib/tasksCache';

type ClassRow = {
  id: string;
  name: string;
  code: string;
  join_code_expires_at?: string;
  created_at?: string;
  professor_id?: string;
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString();
}

export default function StudentClasses() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classDetails, setClassDetails] = useState<{ [key: string]: { memberCount: number; professorName: string } }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);

  const fetchClasses = async () => {
    try {
      const j = await tasksCache.fetch<{ classes: ClassRow[] }>("/api/classes");
      const classesResp = (j && (j as any).classes) || [];
      setClasses(classesResp);

      const details: { [key: string]: { memberCount: number; professorName: string } } = {};
      for (const cls of classesResp) {
        try {
          const detailData = await tasksCache.fetch<{ members: any[] }>(`/api/classes/${cls.id}`);
          const members = (detailData && (detailData as any).members) || [];
          const professor = members.find((m: any) => m.classRole === 'professor');
          details[cls.id] = {
            memberCount: members.length,
            professorName: professor?.name || 'Unknown Professor',
          };
        } catch (err) {
          details[cls.id] = { memberCount: 0, professorName: 'Unknown Professor' };
        }
      }
      setClassDetails(details);
    } catch (err: any) {
      setError(err.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = tasksCache.subscribe<{ classes: ClassRow[] }>("/api/classes", (data) => {
      if (data && (data as any).classes) setClasses((data as any).classes || []);
    });
    fetchClasses();
    return () => unsubscribe();
  }, []);

  const handleSearchClass = async () => {
    if (!searchCode.trim()) return;
    setSearching(true);
    
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: searchCode.trim() }),
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to join class');
      }
      
      setSearchCode('');
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || 'Failed to join class');
    } finally {
      setSearching(false);
    }
  };

  return (
    <DashboardLayout initialRole="student" overrideHeaderLabel="Classes">
      <div className="w-full bg-[#f6f6f8] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-black text-[#111318] tracking-tight">Classes</h1>
            <p className="text-sm text-[#616f89] mt-1">View all your classes and join new ones</p>
          </div>

          {/* Search/Join Class Section */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
            <h2 className="text-lg font-bold text-[#111318] mb-4">Join a New Class</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchClass()}
                placeholder="Enter class code (e.g., ABC123)"
                maxLength={6}
                className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-[#111318]"
              />
              <button
                onClick={handleSearchClass}
                disabled={searching || !searchCode.trim()}
                className="px-6 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {searching ? 'Joining...' : 'Join'}
              </button>
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</div>}
            <p className="text-xs text-[#616f89] mt-3">Ask your professor for the class code to enroll.</p>
          </div>

          {/* Classes List */}
          {loading ? (
            <div className="text-sm text-[#616f89]">Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
              <p className="text-sm text-[#616f89]">You're not enrolled in any classes yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/student/classes/${cls.id}`}
                  className="bg-white border border-[#e5e7eb] rounded-xl p-5 hover:border-primary transition-colors flex flex-col gap-4 group"
                >
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold text-[#111318] group-hover:text-primary transition-colors">{cls.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-[#616f89]">
                      <span className="material-symbols-outlined text-sm">school</span>
                      <span>
                        {classDetails[cls.id]?.professorName ? `Professor ${classDetails[cls.id]?.professorName?.split(' ').pop()}` : 'Loading...'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-[#616f89] pt-2 border-t border-[#e5e7eb]">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">group</span>
                      <span>{classDetails[cls.id]?.memberCount || 0} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      <span>Joined {formatDate(cls.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
