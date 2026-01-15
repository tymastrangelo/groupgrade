export function StudentContent({ userName = 'Alex' }: { userName?: string }) {
  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-8">
      {/* Page Heading */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[#111318] dark:text-white text-4xl font-black tracking-tight">Welcome back, {userName}</h1>
        <div className="flex items-center gap-2 text-[#616f89] dark:text-gray-400 font-normal">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          <span>Monday, October 23rd, 2023</span>
        </div>
      </div>
      {/* Main Layout Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Active Projects & Tasks */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          {/* Projects Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#111318] dark:text-white text-xl font-bold tracking-tight">Active Projects</h2>
              <button className="text-primary text-sm font-semibold hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Card 1 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-transparent hover:border-primary/20 transition-all">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <p className="text-[#111318] dark:text-white text-lg font-bold">Senior Capstone</p>
                      <p className="text-[#616f89] dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Engineering Dept</p>
                    </div>
                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded">ON TRACK</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end text-xs mb-1">
                      <span className="text-[#616f89] dark:text-gray-400">Project Progress</span>
                      <span className="text-primary font-bold">65%</span>
                    </div>
                    <div className="w-full bg-[#f0f2f4] dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: "65%" }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex -space-x-2">
                      <div className="size-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200"></div>
                      <div className="size-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-300"></div>
                      <div className="size-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-400"></div>
                    </div>
                    <p className="text-[#616f89] dark:text-gray-400 text-xs font-medium italic">Due in 12 days</p>
                  </div>
                </div>
              </div>
              {/* Project Card 2 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-transparent hover:border-primary/20 transition-all">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <p className="text-[#111318] dark:text-white text-lg font-bold">Marketing Strategy</p>
                      <p className="text-[#616f89] dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Business School</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] font-bold px-2 py-1 rounded">REVIEW NEEDED</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end text-xs mb-1">
                      <span className="text-[#616f89] dark:text-gray-400">Project Progress</span>
                      <span className="text-primary font-bold">32%</span>
                    </div>
                    <div className="w-full bg-[#f0f2f4] dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: "32%" }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex -space-x-2">
                      <div className="size-6 rounded-full border-2 border-white dark:border-gray-800 bg-blue-200"></div>
                      <div className="size-6 rounded-full border-2 border-white dark:border-gray-800 bg-red-200"></div>
                    </div>
                    <p className="text-[#616f89] dark:text-gray-400 text-xs font-medium italic">Due in 5 days</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Tasks Section */}
          <section>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-[#f0f2f4] dark:border-gray-700">
              <div className="px-6 py-5 border-b border-[#f0f2f4] dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-[#111318] dark:text-white text-xl font-bold tracking-tight">Your Tasks</h2>
                <div className="flex bg-[#f0f2f4] dark:bg-gray-700 p-1 rounded-lg">
                  <button className="px-3 py-1.5 text-xs font-bold rounded-md bg-white dark:bg-gray-600 shadow-sm text-primary">All</button>
                  <button className="px-3 py-1.5 text-xs font-medium text-[#616f89] dark:text-gray-400">Pending</button>
                  <button className="px-3 py-1.5 text-xs font-medium text-[#616f89] dark:text-gray-400">Done</button>
                </div>
              </div>
              <div className="flex flex-col divide-y divide-[#f0f2f4] dark:divide-gray-700">
                {/* Task 1 */}
                <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="size-5 rounded border-2 border-primary/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"></div>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold text-[#111318] dark:text-white group-hover:text-primary transition-colors">Draft Introduction Chapter</p>
                      <p className="text-xs text-[#616f89] dark:text-gray-400">Senior Capstone • High Priority</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <p className="text-xs font-medium text-[#111318] dark:text-white">Oct 25</p>
                      <p className="text-[10px] text-red-500 font-bold uppercase">2 Days Left</p>
                    </div>
                    <span className="material-symbols-outlined text-[#616f89] dark:text-gray-500 cursor-pointer hover:text-primary">more_vert</span>
                  </div>
                </div>
                {/* Task 2 */}
                <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="size-5 rounded border-2 border-primary/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"></div>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold text-[#111318] dark:text-white group-hover:text-primary transition-colors">Gather Survey Responses</p>
                      <p className="text-xs text-[#616f89] dark:text-gray-400">Marketing Strategy • Mid Priority</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <p className="text-xs font-medium text-[#111318] dark:text-white">Oct 28</p>
                      <p className="text-[10px] text-[#616f89] dark:text-gray-400 font-bold uppercase">5 Days Left</p>
                    </div>
                    <span className="material-symbols-outlined text-[#616f89] dark:text-gray-500 cursor-pointer hover:text-primary">more_vert</span>
                  </div>
                </div>
                {/* Task 3 (Completed Example) */}
                <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="size-5 rounded bg-primary flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold text-[#111318] dark:text-white line-through">Create Reference List</p>
                      <p className="text-xs text-[#616f89] dark:text-gray-400">Senior Capstone • Done</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end text-right">
                      <p className="text-xs font-medium text-green-600">Completed</p>
                    </div>
                    <span className="material-symbols-outlined text-[#616f89] dark:text-gray-500 cursor-pointer hover:text-primary">more_vert</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 text-center">
                <button className="text-primary text-sm font-bold flex items-center justify-center gap-2 mx-auto hover:gap-3 transition-all">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Add New Task
                </button>
              </div>
            </div>
          </section>
        </div>
        {/* Right Column: Team Widget & Activity */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          {/* Team Widget */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-[#f0f2f4] dark:border-gray-700">
            <h3 className="text-[#111318] dark:text-white text-lg font-bold mb-4">Team Transparency</h3>
            <div className="flex flex-col gap-5">
              {/* Teammate 1 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="size-10 rounded-full bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCkvnOb_j3LSLYQwHDbuN-43H2CWLJaEr1GW6347y4tbQOtZCo8lBKRKbWq6K19wwk5PnSN3AlaSBqjQ6Rd0AKbpQgWZJCJpAEbM_n7QHGesLMSWca_mSr5t75-QjwAI8oDdDvX-j5PVJxFNl1WyBkZl3oKT9D3kpHuwwEldOln1hCVT7-39MQFI6-1Jw6ngdZUAecF-TDnAH2jm1IrHcyeT3dsMy6SPs4DB2VhSAGSJ07cYxjD1XwXPJOIGKggNJll2vP1v4OfzCI")' }}></div>
                    <div className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-[#111318] dark:text-white">Sarah Miller</p>
                    <p className="text-[11px] text-[#616f89] dark:text-gray-400">Active now</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#616f89] hover:text-primary cursor-pointer">chat_bubble_outline</span>
                </div>
              </div>
              {/* Teammate 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="size-10 rounded-full bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCfjTN7qKiuftYLw4fPS9YJRD3xGl3OOH6Nj7kZEv7LzmW4UW5ljvSfRdg0m8e9Ag-kcvdArxsfZ_ZGaqW27zWZAa4h8jKAfSZLAG4_DslklbI7yQryrsIaRQoEIHczzvDGJ8s884vo2IJ2D9_wVdmVaNBmYhiZcct7fiLNMc-37WsYxjxPoVeAqV1vAMCc8yhcOKHJOpvBiQW08ZGTB09ntgy4tFDHLcDwDFH3usiJ1_KvZ8OPzxq2yHCfsyW4RWFjyur2UPl1LSI")' }}></div>
                    <div className="absolute bottom-0 right-0 size-3 rounded-full bg-gray-400 border-2 border-white dark:border-gray-800"></div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-[#111318] dark:text-white">James Chen</p>
                    <p className="text-[11px] text-[#616f89] dark:text-gray-400">Away 20m ago</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#616f89] hover:text-primary cursor-pointer">chat_bubble_outline</span>
                </div>
              </div>
              {/* Teammate 3 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="size-10 rounded-full bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBbhSLLyMcrtATYQ9O6ArDhEAfmtEL5ZgavuuOOm4s7MAOaQh5pTH7LlQ8ANXtCRcM3MGYW3IdlyrTPbkzkLeZ1ECrVVqiLToe7JN_kQRqlcOWq79_MVQqJrmey6-p-HZnsrKeI_4U70fYPQiZ2VkqvZbQDCdtsD5PtXhaixaUiL1fZgPAw06mbVQKBUtM-fbrU1C37hrjUj8IkdMVHd5Ms4Z1Tgr80Do7Hsg-Wv0k8Vk-31cHD4Bezh-tdliSx4OakVbSxIdL4BcU")' }}></div>
                    <div className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-[#111318] dark:text-white">Emily Watson</p>
                    <p className="text-[11px] text-[#616f89] dark:text-gray-400">Editing Doc...</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#616f89] hover:text-primary cursor-pointer">chat_bubble_outline</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-[#f0f2f4] dark:border-gray-700">
              <h4 className="text-xs font-bold text-[#616f89] dark:text-gray-400 uppercase tracking-widest mb-3">Recent Activity</h4>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px]">history_edu</span>
                  <p className="text-xs text-[#111318] dark:text-gray-200"><span className="font-bold">Sarah</span> updated <span className="text-primary font-medium">Research_Draft_V2.docx</span></p>
                </div>
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                  <p className="text-xs text-[#111318] dark:text-gray-200"><span className="font-bold">James</span> completed <span className="font-medium text-green-600">Initial Data Entry</span></p>
                </div>
              </div>
            </div>
          </div>
          {/* Accountability Insight */}
          <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-6 border border-primary/20">
            <div className="flex items-center gap-2 mb-3 text-primary">
              <span className="material-symbols-outlined">analytics</span>
              <h3 className="text-sm font-bold">Accountability Insight</h3>
            </div>
            <p className="text-xs text-[#616f89] dark:text-gray-400 leading-relaxed">
              Your team is <span className="text-primary font-bold">15% ahead</span> of the average completion rate for Capstone projects this semester. Keep up the momentum!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
