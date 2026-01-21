'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { TeacherContent } from './TeacherContent';
import { StudentContent } from './StudentContent';
import StudentDashboard from './StudentDashboard';
import { AvatarSelector } from './AvatarSelector';

export default function Dashboard({
  initialRole,
  overrideHeaderLabel,
  children,
}: {
  initialRole?: 'teacher' | 'student';
  overrideHeaderLabel?: string;
  children?: ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<'teacher' | 'student'>(initialRole ?? 'teacher');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to join class');
      }
      
      setJoinCode('');
      setShowJoinGroupModal(false);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join class');
    } finally {
      setJoining(false);
    }
  };

  const isTeacher = userRole === 'teacher';
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);
  
  // Get user name from session, fallback to default
  const userName = session?.user?.name || 'User';
  const userAvatar = session?.user?.image || null;
  const displayName = isTeacher ? `Dr. ${userName}` : userName;
  const userTitle = isTeacher ? 'Senior Professor' : 'Student';

  const teacherDashboardHref = '/teacher';
  const teacherCoursesHref = '/teacher/classes';
  const teacherProjectsHref = '/teacher/projects';
  const teacherStudentsHref = '/teacher/students';
  const teacherAnalyticsHref = '/teacher/analytics';
  const studentDashboardHref = '/student';
  const studentCalendarHref = '/student/calendar';
  const studentChatHref = '/student/chat';

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      <style dangerouslySetInnerHTML={{ __html: `
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
          font-family: 'Lexend', sans-serif;
        }
      `}} />

      <div className="bg-background-light text-[#111318] min-h-screen flex">
        {/* Join Group Modal */}
        {showJoinGroupModal && !isTeacher && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
              <div className="p-6 border-b border-[#e5e7eb]">
                <h2 className="text-xl font-bold text-[#111318]">Join a Class</h2>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[#111318]">Enter Class Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC123"
                    className="px-4 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-[#111318]"
                    maxLength={6}
                  />
                </div>
                {joinError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{joinError}</div>}
                <p className="text-xs text-[#616f89]">Ask your professor for the class code.</p>
              </div>
              <div className="p-6 border-t border-[#e5e7eb] flex gap-3">
                <button
                  onClick={() => {
                    setShowJoinGroupModal(false);
                    setJoinCode('');
                    setJoinError(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#111318] font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinGroup}
                  disabled={joining || !joinCode.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {joining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Sidebar - consistent teacher styling */}
        <aside className="w-64 border-r border-[#e5e7eb] bg-white hidden lg:flex flex-col fixed h-full z-20 overflow-y-auto">
          <div className="p-6 flex flex-col h-full">
            {/* Branding */}
            <div className="flex items-center gap-3 mb-8">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-xl">account_balance</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-[#111318] text-base font-bold leading-tight">GroupGrade</h1>
                <p className="text-[#616f89] text-xs font-normal">Academic Portal</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 grow">
              {isTeacher ? (
                <>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname === teacherDashboardHref ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href={teacherDashboardHref}
                  >
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="text-sm font-medium">Dashboard</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname?.startsWith(teacherCoursesHref) ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href={teacherCoursesHref}
                  >
                    <span className="material-symbols-outlined text-sm">book</span>
                    <span className="text-sm font-medium">Courses</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname?.startsWith(teacherProjectsHref) ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href={teacherProjectsHref}
                  >
                    <span className="material-symbols-outlined text-sm">assignment</span>
                    <span className="text-sm font-medium">Projects</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname?.startsWith(teacherStudentsHref) ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href={teacherStudentsHref}
                  >
                    <span className="material-symbols-outlined text-sm">groups</span>
                    <span className="text-sm font-medium">Students</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname?.startsWith(teacherAnalyticsHref) ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href={teacherAnalyticsHref}
                  >
                    <span className="material-symbols-outlined text-sm">bar_chart</span>
                    <span className="text-sm font-medium">Analytics</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname === studentDashboardHref || pathname === studentDashboardHref + '/' ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href={studentDashboardHref}
                  >
                    <span className="material-symbols-outlined">home</span>
                    <span className="text-sm font-medium">Home</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname?.startsWith('/student/projects') ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href="/student/projects"
                  >
                    <span className="material-symbols-outlined text-sm">assignment</span>
                    <span className="text-sm font-medium">Projects</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname?.startsWith('/student/classes') ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href="/student/classes"
                  >
                    <span className="material-symbols-outlined text-sm">book</span>
                    <span className="text-sm font-medium">Classes</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname?.startsWith(studentCalendarHref) ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href={studentCalendarHref}
                  >
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    <span className="text-sm font-medium">Calendar</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname?.startsWith(studentChatHref) ? 'bg-primary/10 text-primary' : 'text-[#616f89] hover:bg-background-light'}`}
                    href={studentChatHref}
                  >
                    <span className="material-symbols-outlined text-sm">group</span>
                    <span className="text-sm font-medium">Team Chat</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Sidebar Footer */}
            <div className="mt-auto pt-6 border-t border-[#e5e7eb] flex flex-col gap-1">
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] hover:bg-background-light transition-colors" href="#">
                <span className="material-symbols-outlined text-sm">settings</span>
                <span className="text-sm font-medium">Settings</span>
              </a>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#616f89] hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span className="text-sm font-medium">Logout</span>
              </button>
              {isTeacher && (
                <button className="w-full bg-primary hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all mt-4">
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Create Class</span>
                </button>
              )}
              {!isTeacher && (
                <button 
                  onClick={() => setShowJoinGroupModal(true)}
                  className="w-full bg-primary hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all mt-4"
                >
                  <span className="material-symbols-outlined text-sm">group_add</span>
                  <span>Join a Class</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 flex flex-col overflow-y-auto">
          {/* Header - consistent teacher styling */}
          <header className="h-16 border-b border-[#e5e7eb] bg-white px-8 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Link
                href={isTeacher ? teacherDashboardHref : studentDashboardHref}
                className="text-[#616f89] text-sm font-medium hover:text-primary"
              >
                Dashboard
              </Link>
              <span className="text-[#616f89] text-sm">/</span>
              <span className="text-[#111318] text-sm font-medium">
                {overrideHeaderLabel ?? (isTeacher ? 'Your Classes' : 'Student Dashboard')}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative hidden md:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-lg">search</span>
                <input className="bg-[#f3f4f6] border-none rounded-lg pl-10 pr-4 py-1.5 text-sm w-72 focus:ring-1 focus:ring-primary text-[#111318]" placeholder={isTeacher ? 'Search courses...' : 'Search tasks...'} type="text"/>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-2 text-[#616f89] hover:bg-background-light rounded-full relative">
                  <span className="material-symbols-outlined">notifications</span>
                  {isTeacher && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                {isTeacher ? (
                  <div className="flex items-center gap-3 pl-4 border-l border-[#e5e7eb] relative" ref={menuRef}>
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-[#111318]">{displayName}</span>
                      <span className="text-[10px] text-[#616f89]">{userTitle}</span>
                    </div>
                    <button
                      onClick={() => setMenuOpen(o => !o)}
                      className="w-9 h-9 rounded-full bg-primary/20 overflow-hidden ring-0 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-transform active:scale-95"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                    >
                      {userAvatar ? (
                        <img alt={`Profile picture of ${displayName}`} className="w-full h-full object-cover" src={userAvatar}/>
                      ) : (
                        <div className="w-full h-full bg-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>

                    {/* Dropdown */}
                    <div
                      className={`absolute right-0 top-12 w-56 origin-top-right rounded-lg border border-[#e5e7eb] bg-white shadow-xl transition-all ${menuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                      role="menu"
                    >
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setShowAvatarSelector(true);
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#111318] hover:bg-background-light[#2d3748] transition-colors"
                          role="menuitem"
                        >
                          <span className="material-symbols-outlined text-primary">face</span>
                          Edit Avatar
                        </button>
                        <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#111318] hover:bg-background-light[#2d3748] transition-colors" role="menuitem">
                          <span className="material-symbols-outlined text-[#e11d48]">logout</span>
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pl-4 border-l border-[#e5e7eb] relative" ref={menuRef}>
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-[#111318]">{displayName}</span>
                      <span className="text-[10px] text-[#616f89]">{userTitle}</span>
                    </div>
                    <button
                      onClick={() => setMenuOpen(o => !o)}
                      className="w-9 h-9 rounded-full bg-primary/20 overflow-hidden ring-0 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-transform active:scale-95"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                    >
                      {userAvatar ? (
                        <img alt={`Profile picture of ${displayName}`} className="w-full h-full object-cover" src={userAvatar}/>
                      ) : (
                        <div className="w-full h-full bg-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>

                    {/* Dropdown */}
                    <div
                      className={`absolute right-0 top-12 w-56 origin-top-right rounded-lg border border-[#e5e7eb] bg-white shadow-xl transition-all ${menuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                      role="menu"
                    >
                      <div className="py-2">
                        <a href="/survey" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#111318] hover:bg-background-light transition-colors" role="menuitem">
                          <span className="material-symbols-outlined text-primary">refresh</span>
                          Retake Survey
                        </a>
                        <button
                          onClick={() => {
                            setShowAvatarSelector(true);
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#111318] hover:bg-background-light[#2d3748] transition-colors"
                          role="menuitem"
                        >
                          <span className="material-symbols-outlined text-primary">face</span>
                          Edit Avatar
                        </button>
                        <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#111318] hover:bg-background-light[#2d3748] transition-colors" role="menuitem">
                          <span className="material-symbols-outlined text-[#e11d48]">logout</span>
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          {children ?? (isTeacher ? <TeacherContent /> : <StudentDashboard />)}
        </main>
      </div>

      {/* Demo Role Switcher - Bottom Right */}
      {initialRole == null && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg p-3 border border-[#e5e7eb]">
          <div className="flex gap-2">
            <button
              onClick={() => setUserRole('teacher')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                userRole === 'teacher'
                  ? 'bg-primary text-white'
                  : 'bg-[#f3f4f6] text-[#616f89]'
              }`}
            >
              Teacher
            </button>
            <button
              onClick={() => setUserRole('student')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                userRole === 'student'
                  ? 'bg-primary text-white'
                  : 'bg-[#f3f4f6] text-[#616f89]'
              }`}
            >
              Student
            </button>
          </div>
        </div>
      )}

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <AvatarSelector
          currentAvatar={userAvatar}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </>
  );
}
