'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { tasksCache } from '@/lib/tasksCache';
import { JoinClassModal } from '@/components/JoinClassModal';

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
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classDetails, setClassDetails] = useState<{ [key: string]: { memberCount: number; professorName: string } }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

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

  const handleJoined = async () => {
    setJoinSuccess('Successfully joined the class');
    setError(null);
    await fetchClasses();
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
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-[#111318]">Join a New Class</h2>
                <p className="text-sm text-[#616f89]">Enter your 6-character join code.</p>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">Students only</span>
            </div>
            {joinSuccess && (
              <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-100">{joinSuccess}</div>
            )}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</div>
            )}
            <div>
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563eb] text-white font-semibold hover:bg-[#1d4ed8] transition-colors"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Enter Join Code
              </button>
            </div>
          </div>

          {/* Classes List */}
          {loading ? (
            <div className="text-sm text-[#616f89]">Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
              <p className="text-sm text-[#616f89]">You&apos;re not enrolled in any classes yet.</p>
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
      {showJoinModal && (
        <JoinClassModal
          open={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onJoined={handleJoined}
        />
      )}
    </DashboardLayout>
  );
}
