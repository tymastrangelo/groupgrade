'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

interface SkillRating {
  name: string;
  icon: string;
  category: string;
  value: number;
}

const SKILLS: Omit<SkillRating, 'value'>[] = [
  { name: 'Research', icon: 'search', category: 'Sources & Data' },
  { name: 'Writing & Editing', icon: 'edit_note', category: 'Reports & Citations' },
  { name: 'Visual Design', icon: 'palette', category: 'Slides & UI' },
  { name: 'Technical / Implementation', icon: 'code', category: 'Tools & Logic' },
];

export default function SurveyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [skills, setSkills] = useState<SkillRating[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultSkills = SKILLS.map(s => ({ ...s, value: 3 }));

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Prefill existing ratings when retaking
  useEffect(() => {
    const loadExisting = async () => {
      try {
        // Check role first; teachers shouldn't take survey
        const meRes = await fetch('/api/me');
        if (meRes.status === 401) {
          router.push('/auth/signin');
          return;
        }
        const me = await meRes.json();
        const role = me?.user?.normalizedRole || me?.user?.role;
        if (!role) {
          router.push('/role');
          return;
        }
        if (role === 'teacher' || role === 'professor') {
          router.push('/teacher');
          return;
        }

        const res = await fetch('/api/survey');
        if (res.status === 404) {
          setSkills(defaultSkills);
          return;
        }
        if (!res.ok) {
          setSkills(defaultSkills);
          return;
        }
        const data = await res.json();
        const r = data?.ratings;
        if (!r) {
          setSkills(defaultSkills);
          return;
        }
        const map: Record<string, number> = {
          'Research': Number(r.research_rating ?? 3),
          'Writing & Editing': Number(r.writing_rating ?? 3),
          'Visual Design': Number(r.design_rating ?? 3),
          'Technical / Implementation': Number(r.technical_rating ?? 3),
        };
        setSkills(SKILLS.map(s => ({ ...s, value: Math.min(5, Math.max(1, map[s.name] || 3)) })));
      } catch {
        setSkills(defaultSkills);
      }
    };
    if (status === 'authenticated') {
      loadExisting();
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[#616f89] dark:text-gray-400">Loading survey...</p>
        </div>
      </div>
    );
  }

  const completedCount = skills ? skills.filter(skill => skill.value > 0).length : 0;
  const progressPercent = skills ? Math.round((completedCount / skills.length) * 100) : 0;

  const handleSkillChange = (index: number, newValue: number) => {
    if (!skills) return;
    const updated = [...skills];
    updated[index].value = newValue;
    setSkills(updated);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!skills) throw new Error('Survey not ready');
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: skills.map(skill => ({
            name: skill.name,
            rating: skill.value,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save survey');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Removed Skip/Back actions per retake context

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      {/* Navigation Bar */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#dbdfe6] dark:border-[#2d3748] px-6 md:px-10 py-3 bg-white dark:bg-background-dark sticky top-0 z-50">
        <div className="flex items-center gap-4 text-[#111318] dark:text-white">
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
              <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">GroupGrade</h2>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-3 rounded-lg h-10 px-3 bg-[#f0f2f4] dark:bg-[#2d3748] text-[#111318] dark:text-white hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <span className="material-symbols-outlined text-xl">account_circle</span>
            {session?.user?.image && (
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 border-2 border-primary shadow-sm"
                style={{ backgroundImage: `url('${session.user.image}')` }}
              ></div>
            )}
          </button>

          {/* Dropdown */}
          <div
            className={`absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-[#dbdfe6] dark:border-[#2d3748] bg-white dark:bg-[#1c2433] shadow-xl transition-all ${menuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'} `}
            role="menu"
          >
            <div className="py-2">
              <button
                onClick={() => { setMenuOpen(false); router.push('/survey'); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#111318] dark:text-white hover:bg-[#f6f6f8] dark:hover:bg-[#2d3748] transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-primary">refresh</span>
                Retake Survey
              </button>
              <button
                onClick={async () => { setMenuOpen(false); await signOut({ callbackUrl: '/' }); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#111318] dark:text-white hover:bg-[#f6f6f8] dark:hover:bg-[#2d3748] transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[#e11d48]">logout</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center py-8 px-4 sm:px-10">
        <div className="w-full max-w-[800px] flex flex-col gap-6">
          {/* Progress Header */}
          <div className="bg-white dark:bg-[#1c2433] rounded-xl p-6 shadow-sm border border-[#dbdfe6] dark:border-[#2d3748]">
            <div className="flex flex-col gap-3">
              <div className="flex gap-6 justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Tell us your strengths</h1>
                  <p className="text-[#616f89] dark:text-gray-400 text-sm mt-1">Rate your skills to help your team distribute tasks fairly.</p>
                </div>
                <p className="text-primary text-lg font-bold">{skills ? `${progressPercent}%` : '...'}</p>
              </div>
              <div className="rounded-full bg-[#dbdfe6] dark:bg-[#2d3748] h-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${skills ? progressPercent : 0}%` }}
                ></div>
              </div>
              <p className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                {!skills ? 'Loading previous ratings…' : (progressPercent === 100 ? 'All skills rated!' : 'Almost there! Just a few more skills.')}
              </p>
            </div>
          </div>

          {/* Survey Card */}
          <div className="bg-white dark:bg-[#1c2433] rounded-xl shadow-sm border border-[#dbdfe6] dark:border-[#2d3748] overflow-hidden">
            <div className="p-6 flex flex-col gap-8">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-200">
                  {error}
                </div>
              )}

              {/* Skills */}
              {skills ? skills.map((skill, index) => (
                <div key={index} className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">{skill.icon}</span>
                      <p className="text-[#111318] dark:text-white text-base font-semibold">{skill.name}</p>
                    </div>
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">{skill.category}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="relative flex w-full items-center gap-4">
                      <div className="flex h-1.5 flex-1 rounded-full bg-[#dbdfe6] dark:bg-[#2d3748] relative cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const percent = (e.clientX - rect.left) / rect.width;
                          const newValue = Math.max(1, Math.min(5, Math.round(percent * 5)));
                          handleSkillChange(index, newValue);
                        }}
                      >
                        <div className="h-full w-full rounded-full bg-primary" style={{ width: `${(skill.value / 5) * 100}%` }}></div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={skill.value}
                          onChange={(e) => handleSkillChange(index, parseInt(e.target.value))}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0 z-10"
                        />
                        <div
                          className="absolute -top-2 size-5 rounded-full bg-primary border-4 border-white dark:border-[#1c2433] shadow-md pointer-events-none"
                          style={{ left: `${(skill.value / 5) * 100}%`, transform: 'translateX(-50%)' }}
                        ></div>
                      </div>
                      <span className="text-primary font-bold w-6 text-center text-sm">{skill.value}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#616f89] dark:text-gray-500 font-medium px-1">
                      <span>Novice</span>
                      <span>Intermediate</span>
                      <span>Expert</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-[#616f89] dark:text-gray-400 text-sm">Loading survey…</div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#dbdfe6] dark:border-[#2d3748] bg-gray-50 dark:bg-[#1a202c] p-6 flex justify-end items-center">
              <button
                onClick={handleSave}
                disabled={isLoading || !skills}
                className="rounded-lg h-11 px-8 bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {isLoading ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>

          {/* Help Tip */}
          <div className="flex items-center gap-3 px-2 py-4 border-t border-dashed border-[#dbdfe6] dark:border-[#2d3748]">
            <span className="material-symbols-outlined text-primary">info</span>
            <p className="text-sm text-[#616f89] dark:text-gray-400">
              This data is only visible to your project teammates to help organize group roles.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-[#616f89] dark:text-gray-500 text-xs">
        © 2024 GroupGrade Accountability Platform. All rights reserved.
      </footer>
    </div>
  );
}
