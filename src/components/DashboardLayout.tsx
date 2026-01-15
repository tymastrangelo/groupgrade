'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { TeacherContent } from './TeacherContent';
import { StudentContent } from './StudentContent';

export default function Dashboard() {
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<'teacher' | 'student'>('teacher');

  const handleSignOut = () => {
    // For demo mode, just redirect to signin page
    window.location.href = '/auth/signin';
  };

  const isTeacher = userRole === 'teacher';
  
  // Get user name from session, fallback to default
  const userName = session?.user?.name || 'User';
  const displayName = isTeacher ? `Dr. ${userName}` : userName;
  const userTitle = isTeacher ? 'Senior Professor' : 'Senior Student';

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

      <div className="bg-[#f6f6f8] dark:bg-[#101622] text-[#111318] dark:text-white min-h-screen flex">
        {/* Sidebar - consistent teacher styling */}
        <aside className="w-64 border-r border-[#e5e7eb] dark:border-[#2d3748] bg-white dark:bg-[#1a202c] hidden lg:flex flex-col fixed h-full z-20 overflow-y-auto">
          <div className="p-6 flex flex-col h-full">
            {/* Branding */}
            <div className="flex items-center gap-3 mb-8">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-xl">account_balance</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-[#111318] dark:text-white text-base font-bold leading-tight">GroupGrade</h1>
                <p className="text-[#616f89] text-xs font-normal">Academic Portal</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 grow">
              {isTeacher ? (
                <>
                  <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary" href="#">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="text-sm font-medium">Dashboard</span>
                  </a>
                  <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] hover:bg-background-light dark:hover:bg-background-dark transition-colors" href="#">
                    <span className="material-symbols-outlined text-sm">book</span>
                    <span className="text-sm font-medium">Courses</span>
                  </a>
                  <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] hover:bg-background-light dark:hover:bg-background-dark transition-colors" href="#">
                    <span className="material-symbols-outlined text-sm">groups</span>
                    <span className="text-sm font-medium">Students</span>
                  </a>
                  <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] hover:bg-background-light dark:hover:bg-background-dark transition-colors" href="#">
                    <span className="material-symbols-outlined text-sm">bar_chart</span>
                    <span className="text-sm font-medium">Analytics</span>
                  </a>
                </>
              ) : (
                <>
                  <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary" href="#">
                    <span className="material-symbols-outlined">home</span>
                    <span className="text-sm font-medium">Home</span>
                  </a>
                  <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] hover:bg-background-light dark:hover:bg-background-dark transition-colors" href="#">
                    <span className="material-symbols-outlined text-sm">assignment</span>
                    <span className="text-sm font-medium">Projects</span>
                  </a>
                  <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] hover:bg-background-light dark:hover:bg-background-dark transition-colors" href="#">
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    <span className="text-sm font-medium">Calendar</span>
                  </a>
                  <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] hover:bg-background-light dark:hover:bg-background-dark transition-colors" href="#">
                    <span className="material-symbols-outlined text-sm">school</span>
                    <span className="text-sm font-medium">Grades</span>
                  </a>
                  <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] hover:bg-background-light dark:hover:bg-background-dark transition-colors" href="#">
                    <span className="material-symbols-outlined text-sm">group</span>
                    <span className="text-sm font-medium">Team Chat</span>
                  </a>
                </>
              )}
            </nav>

            {/* Sidebar Footer */}
            <div className="mt-auto pt-6 border-t border-[#e5e7eb] dark:border-[#2d3748] flex flex-col gap-1">
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] hover:bg-background-light dark:hover:bg-background-dark transition-colors" href="#">
                <span className="material-symbols-outlined text-sm">settings</span>
                <span className="text-sm font-medium">Settings</span>
              </a>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#616f89] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span className="text-sm font-medium">Sign Out</span>
              </button>
              {isTeacher && (
                <button className="w-full bg-primary hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all mt-4">
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Create Class</span>
                </button>
              )}
              {!isTeacher && (
                <button className="w-full bg-primary hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all mt-4">
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  <span>Submit Work</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 flex flex-col overflow-y-auto">
          {/* Header - consistent teacher styling */}
          <header className="h-16 border-b border-[#e5e7eb] dark:border-[#2d3748] bg-white dark:bg-[#1a202c] px-8 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="text-[#616f89] text-sm font-medium">Dashboard</span>
              <span className="text-[#616f89] text-sm">/</span>
              <span className="text-[#111318] dark:text-white text-sm font-medium">
                {isTeacher ? 'Your Classes' : 'Student Dashboard'}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative hidden md:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-lg">search</span>
                <input className="bg-[#f3f4f6] dark:bg-background-dark border-none rounded-lg pl-10 pr-4 py-1.5 text-sm w-72 focus:ring-1 focus:ring-primary text-[#111318] dark:text-white" placeholder={isTeacher ? 'Search courses...' : 'Search tasks...'} type="text"/>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-2 text-[#616f89] hover:bg-background-light dark:hover:bg-background-dark rounded-full relative">
                  <span className="material-symbols-outlined">notifications</span>
                  {isTeacher && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a202c]"></span>}
                </button>
                {isTeacher ? (
                  <div className="flex items-center gap-3 pl-4 border-l border-[#e5e7eb] dark:border-[#2d3748]">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-[#111318] dark:text-white">{displayName}</span>
                      <span className="text-[10px] text-[#616f89]">{userTitle}</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-primary/20 bg-cover bg-center overflow-hidden">
                      <img alt={`Profile picture of ${displayName}`} className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAG_72JB6xGkHKNSnnuFARXYvidpQLP1_Sk1hlSY2d2dls78fBSJW8N2YUjpNEc0IGoTozEy1eQ3OBILcT5XlH97kWTqmqL3NRjrgXB2uSBOERFqRGD6TKQaupvJE_uEKN7yo5UF3bf2-ZKKdCCzUVMbalYjW40LIvE-I-2daAE2MgbGe593mHvF_C6_WQ-iNiGIpr33LZB-fDNKl4_H-DP484eevYAA41fBQ3hja2J_nC9RnhkrbITXBarIxK8zOVfHk7eSyHR3Qc"/>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pl-4 border-l border-[#e5e7eb] dark:border-[#2d3748]">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-[#111318] dark:text-white">{displayName}</span>
                      <span className="text-[10px] text-[#616f89]">{userTitle}</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-primary/20 bg-cover bg-center overflow-hidden">
                      <img alt={`Profile picture of ${displayName}`} className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUGqezVimvcF7moM5CnrGWw-KMHrGSfQbIV-cHEgDhlHZRoK4xnWY6f4ff-BR7E2dZ8dTaH55ZOtG_6xae40_BKI1xoguID-lUJ-CMliNt4dE0ZvRnfStOMgmKNysIC-waGuT9SydPMrZLFBs-scQcWMzrSX71Oy1GsktPwXEK2u0BbCre-28diaIsx15d29GcZJoV0Ck_7EzZYAAPWaOfv1frkwlk_Ea2z7JtRN06T4DtPCtm9R8Ad7DlFrxktlpUNJZL0xe5oyg"/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          {isTeacher ? <TeacherContent /> : <StudentContent userName={userName.split(' ')[0]} />}
        </main>
      </div>

      {/* Demo Role Switcher - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-[#1a202c] rounded-lg shadow-lg p-3 border border-[#e5e7eb] dark:border-[#2d3748]">
        <div className="flex gap-2">
          <button
            onClick={() => setUserRole('teacher')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              userRole === 'teacher'
                ? 'bg-primary text-white'
                : 'bg-[#f3f4f6] dark:bg-background-dark text-[#616f89]'
            }`}
          >
            Teacher
          </button>
          <button
            onClick={() => setUserRole('student')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              userRole === 'student'
                ? 'bg-primary text-white'
                : 'bg-[#f3f4f6] dark:bg-background-dark text-[#616f89]'
            }`}
          >
            Student
          </button>
        </div>
      </div>
    </>
  );
}
