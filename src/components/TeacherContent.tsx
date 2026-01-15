export function TeacherContent() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full grid grid-cols-12 gap-8">
      <div className="col-span-12 xl:col-span-9 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-[#111318] dark:text-white tracking-tight">Your Classes</h2>
            <p className="text-[#616f89] mt-1 font-medium">Manage active courses and monitor group accountability.</p>
          </div>
          <div className="flex gap-2">
            <button className="bg-[#f0f2f4] dark:bg-[#2d3748] px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>Fall 2023</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex lg:hidden items-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span>
              <span>New</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-blue-50 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">Software Engineering</span>
              <button className="text-[#616f89] hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
            <h3 className="text-xl font-bold text-[#111318] dark:text-white mb-1">CS402: Systems Design</h3>
            <p className="text-[#616f89] text-sm mb-6">Fall 2023 • Section A</p>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-1.5 text-[#616f89] font-medium">
                <span className="material-symbols-outlined text-base">group</span>
                <span>12 Groups</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#616f89] font-medium">
                <span className="material-symbols-outlined text-base">person</span>
                <span>48 Students</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#f0f2f4] dark:border-[#2d3748]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-[#616f89]">Course Progress</span>
                <span className="text-xs font-bold text-primary">65%</span>
              </div>
              <div className="w-full bg-[#f0f2f4] dark:bg-[#2d3748] h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "65%" }}></div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-md uppercase tracking-wider">Humanities</span>
              <button className="text-[#616f89] hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
            <h3 className="text-xl font-bold text-[#111318] dark:text-white mb-1">PSY101: Intro to Psychology</h3>
            <p className="text-[#616f89] text-sm mb-6">Fall 2023 • Online</p>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-1.5 text-[#616f89] font-medium">
                <span className="material-symbols-outlined text-base">group</span>
                <span>24 Groups</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#616f89] font-medium">
                <span className="material-symbols-outlined text-base">person</span>
                <span>120 Students</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#f0f2f4] dark:border-[#2d3748]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-[#616f89]">Course Progress</span>
                <span className="text-xs font-bold text-primary">40%</span>
              </div>
              <div className="w-full bg-[#f0f2f4] dark:bg-[#2d3748] h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "40%" }}></div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-md uppercase tracking-wider">Data Science</span>
              <button className="text-[#616f89] hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
            <h3 className="text-xl font-bold text-[#111318] dark:text-white mb-1">DS500: Advanced Analytics</h3>
            <p className="text-[#616f89] text-sm mb-6">Spring 2024 • Section B</p>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-1.5 text-[#616f89] font-medium">
                <span className="material-symbols-outlined text-base">group</span>
                <span>8 Groups</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#616f89] font-medium">
                <span className="material-symbols-outlined text-base">person</span>
                <span>32 Students</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#f0f2f4] dark:border-[#2d3748]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-[#616f89]">Course Progress</span>
                <span className="text-xs font-bold text-primary">5%</span>
              </div>
              <div className="w-full bg-[#f0f2f4] dark:bg-[#2d3748] h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "5%" }}></div>
              </div>
            </div>
          </div>
          <button className="border-2 border-dashed border-[#e5e7eb] dark:border-[#2d3748] rounded-xl p-6 flex flex-col items-center justify-center min-h-[220px] hover:bg-white dark:hover:bg-[#1a202c] hover:border-primary transition-all group">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-2xl">add</span>
            </div>
            <span className="text-base font-bold text-[#111318] dark:text-white">Create New Class</span>
            <span className="text-sm text-[#616f89] mt-1 text-center font-medium">Setup groups and milestones</span>
          </button>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#111318] dark:text-white">Upcoming Deadlines</h3>
            <a className="text-primary text-sm font-bold hover:underline" href="#">View Calendar</a>
          </div>
          <div className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] overflow-hidden">
            <div className="divide-y divide-[#f0f2f4] dark:divide-[#2d3748]">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-orange-600 uppercase">Nov</span>
                    <span className="text-lg font-black text-orange-600 leading-none">12</span>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-[#111318] dark:text-white">Project Milestone 3: Implementation Plan</h4>
                    <p className="text-xs text-[#616f89] font-medium">CS402: Systems Design • 12/12 groups pending</p>
                  </div>
                </div>
                <button className="px-4 py-1.5 text-xs font-bold border border-[#e5e7eb] dark:border-[#2d3748] rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors">Details</button>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Nov</span>
                    <span className="text-lg font-black text-blue-600 leading-none">15</span>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-[#111318] dark:text-white">Peer Evaluation Cycle 3</h4>
                    <p className="text-xs text-[#616f89] font-medium">PSY101: Intro to Psychology • 120/120 students</p>
                  </div>
                </div>
                <button className="px-4 py-1.5 text-xs font-bold border border-[#e5e7eb] dark:border-[#2d3748] rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors">Details</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-12 xl:col-span-3 flex flex-col gap-6">
        <div className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] overflow-hidden">
          <div className="bg-red-50/50 dark:bg-red-900/10 p-5 border-b border-[#e5e7eb] dark:border-[#2d3748]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 text-xl font-bold">report</span>
              <h3 className="font-bold text-red-600 text-sm">At-Risk Groups</h3>
            </div>
            <p className="text-xs text-[#616f89] mt-1 font-medium">Groups requiring immediate attention.</p>
          </div>
          <div className="p-2 space-y-1">
            <div className="p-4 hover:bg-background-light dark:hover:bg-background-dark rounded-lg flex flex-col gap-2 cursor-pointer transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#111318] dark:text-white">Team Delta</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-bold uppercase">Critical</span>
              </div>
              <p className="text-xs text-[#616f89] font-medium leading-relaxed">Low engagement: 3 members haven't logged in for 7 days.</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-bold text-[#616f89] uppercase tracking-wider">CS402</span>
                <button className="text-primary text-xs font-bold">Nudge Team</button>
              </div>
            </div>
            <div className="p-4 hover:bg-background-light dark:hover:bg-background-dark rounded-lg flex flex-col gap-2 cursor-pointer transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#111318] dark:text-white">The Web Wizards</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded font-bold uppercase">Warning</span>
              </div>
              <p className="text-xs text-[#616f89] font-medium leading-relaxed">Fairness alert: Large discrepancy in peer ratings.</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-bold text-[#616f89] uppercase tracking-wider">DS500</span>
                <button className="text-primary text-xs font-bold">View Data</button>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-[#f0f2f4] dark:border-[#2d3748]">
            <button className="w-full py-2 text-xs font-bold text-[#616f89] hover:text-[#111318] dark:hover:text-white transition-colors">
              Review All Group Scores
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] p-6">
          <h3 className="text-sm font-bold mb-5 text-[#111318] dark:text-white">Semester Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#616f89]">Total Students</span>
              <span className="text-base font-bold">200</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#616f89]">Total Groups</span>
              <span className="text-base font-bold">44</span>
            </div>
            <div className="pt-4 border-t border-[#f0f2f4] dark:border-[#2d3748]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#616f89]">Overall Participation</span>
                <span className="text-xs font-bold text-green-600">92%</span>
              </div>
              <div className="w-full bg-[#f0f2f4] dark:bg-[#2d3748] h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: "92%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
