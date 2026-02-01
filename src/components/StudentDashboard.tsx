'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TasksWidget } from './TasksWidget';
import { TeamActivityWidget } from './TeamActivityWidget';
import DeliverableFileUpload from './DeliverableFileUpload';
import { tasksCache } from '@/lib/tasksCache';

type ClassRow = {
  id: string;
  name: string;
  code: string;
  join_code_expires_at?: string;
  created_at?: string;
};

type StudentProject = {
  id: string;
  name: string;
  classId: string;
  className: string;
  due_date?: string | null;
  assignment_mode?: string;
  grouping_strategy?: string;
  groupsCount: number;
  myGroupName?: string;
  myGroupMembers?: { id: string; name: string; avatar_url?: string | null }[];
};

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSubmitWorkModal, setShowSubmitWorkModal] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<any | null>(null);
  const [pendingDeliverables, setPendingDeliverables] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userName = session?.user?.name || 'User';
  const firstName = userName.split(' ')[0] || userName;

  const fetchClasses = async () => {
    try {
      const data = await tasksCache.fetch<{ classes: ClassRow[] }>("/api/classes");
      if (data && (data as any).classes) setClasses((data as any).classes || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const classesResp = await tasksCache.fetch<{ classes: ClassRow[] }>("/api/classes");
      const classesData = (classesResp && (classesResp as any).classes) || [];
      const results = await Promise.all(
        classesData.map(async (cls: ClassRow) => {
          const j = await tasksCache.fetch<{ viewer_id: string; projects: any[] }>(`/api/classes/${cls.id}`);
          const viewerId = (j as any)?.viewer_id;
          return (((j as any)?.projects) || []).map((p: any) => {
            const myGroup = (p.groups || []).find((g: any) => g.members.some((m: any) => m.id === viewerId));
            return {
              id: p.id,
              name: p.name,
              classId: cls.id,
              className: cls.name,
              due_date: p.due_date,
              groupsCount: p.groups?.length || 0,
              myGroupName: myGroup?.name,
              myGroupMembers: myGroup?.members || [],
            } as StudentProject;
          });
        })
      );
      setProjects(results.flat());
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchProjects();
  }, []);

  const handleJoinClass = async () => {
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
      setShowJoinModal(false);
      await fetchClasses();
      await fetchProjects();
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join class');
    } finally {
      setJoining(false);
    }
  };

  const fetchPendingDeliverables = async () => {
    try {
      const userEmail = session?.user?.email;
      if (!userEmail) return;

      const allDeliverables: any[] = [];
      
      // Fetch deliverables for each project
      for (const project of projects) {
        const res = await fetch(`/api/deliverables?projectId=${project.id}`);
        if (res.ok) {
          const data = await res.json();
          const deliverables = Array.isArray(data) ? data : [];
          
          // Filter for deliverables assigned to current user that are not submitted
          const userDeliverables = deliverables.filter((d: any) => 
            d.assignedTo?.email === userEmail && 
            d.status !== 'submitted'
          ).map((d: any) => ({
            ...d,
            projectName: project.name,
            projectId: project.id,
          }));
          
          allDeliverables.push(...userDeliverables);
        }
      }
      
      setPendingDeliverables(allDeliverables);
    } catch (err) {
      console.error('Error fetching pending deliverables:', err);
    }
  };

  const handleSubmitWorkClick = async () => {
    await fetchPendingDeliverables();
    setShowSubmitWorkModal(true);
  };

  const handleSubmitDeliverable = async (deliverableId: string) => {
    try {
      const res = await fetch(`/api/deliverables/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'submitted',
          submittedAt: new Date().toISOString()
        }),
      });

      if (res.ok) {
        // Refresh the pending deliverables list
        await fetchPendingDeliverables();
        setSelectedDeliverable(null);
      }
    } catch (err) {
      console.error('Error submitting deliverable:', err);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      
      {/* Content only - no sidebar or header, those come from DashboardLayout */}
      <div className="w-full bg-[#f6f6f8] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Page Heading with Submit Work Button */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[#111318] text-4xl font-black tracking-tight mb-1">Welcome back, {firstName}</h1>
            <p className="text-[#657386]">
              {(() => {
                const oneWeekFromNow = new Date();
                oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
                const upcomingProjects = projects.filter(p => {
                  if (!p.due_date) return false;
                  const dueDate = new Date(p.due_date);
                  return dueDate <= oneWeekFromNow && dueDate >= new Date();
                });
                return upcomingProjects.length > 0 ? (
                  <>
                    You have <span className="text-primary font-bold">{upcomingProjects.length}</span> {upcomingProjects.length === 1 ? 'project' : 'projects'} due within the week
                  </>
                ) : (
                  'No upcoming deadlines this week'
                );
              })()}
            </p>
          </div>
          <button 
            onClick={handleSubmitWorkClick}
            className="bg-primary text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all"
          >
            <span className="material-symbols-outlined">upload_file</span>
            Submit Work
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Projects and Tasks */}
          <div className="lg:col-span-8 space-y-8">
            {/* Projects Section */}
            {!loading && projects.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#111318]">Your Projects</h2>
                  {projects.length > 2 && (
                    <Link href="/student/projects" className="text-sm text-primary font-semibold hover:underline">
                      See More
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.slice(0, 2).map((project) => (
                    <Link
                      key={project.id}
                      href={`/student/projects/${project.id}`}
                      className="bg-white border border-[#e5e7eb] rounded-xl p-5 hover:border-primary transition-colors flex flex-col gap-3 group"
                    >
                      <div className="flex flex-col gap-2">
                        <h3 className="text-base font-bold text-[#111318] group-hover:text-primary transition-colors">{project.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-[#616f89]">
                          <span className="material-symbols-outlined text-sm">school</span>
                          <span>{project.className}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-auto">
                        {project.myGroupName && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                            In {project.myGroupName}
                          </span>
                        )}
                        <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100/50 text-[#616f89] font-semibold">
                          {project.groupsCount} {project.groupsCount === 1 ? 'group' : 'groups'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            <TasksWidget 
              usePersonalTasks={true}
              projects={projects.map(p => ({ id: p.id, name: p.name }))}
            />
          </div>

          {/* Right Column: Team Activity and Stats */}
          <div className="lg:col-span-4 space-y-8">
            <TeamActivityWidget />
          </div>
        </div>
        </div>
      </div>

      {/* Submit Work Modal */}
      {showSubmitWorkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h2 className="text-lg font-bold text-[#111318]">
                {selectedDeliverable ? 'Submit Work' : 'Choose Deliverable'}
              </h2>
              <button
                onClick={() => {
                  setShowSubmitWorkModal(false);
                  setSelectedDeliverable(null);
                }}
                className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              {selectedDeliverable ? (
                <div>
                  <div className="mb-4 pb-4 border-b border-[#e5e7eb]">
                    <h3 className="font-medium text-[#111318] mb-1">{selectedDeliverable.title}</h3>
                    <p className="text-sm text-[#616f89]">
                      Project: {selectedDeliverable.projectName}
                    </p>
                    {selectedDeliverable.dueDate && (
                      <p className="text-xs text-[#616f89] mt-1">
                        Due: {new Date(selectedDeliverable.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Attach Files <span className="text-xs text-[#616f89]">(optional)</span>
                      </label>
                      <DeliverableFileUpload 
                        deliverableId={selectedDeliverable.id}
                        onFilesUploaded={(files) => {
                          console.log('Files uploaded:', files);
                        }}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Submission Link <span className="text-xs text-[#616f89]">(optional)</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-[#616f89] mt-1">Link to your Google Drive, Dropbox, GitHub, etc.</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Notes <span className="text-xs text-[#616f89]">(optional)</span>
                      </label>
                      <textarea
                        placeholder="Add any additional notes about your submission..."
                        rows={4}
                        className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                  </div>
                </div>
              ) : pendingDeliverables.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-6xl text-[#616f89] mb-4">task_alt</span>
                  <p className="text-[#616f89]">You have no pending deliverables to submit!</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-[#616f89] mb-4">
                    Select a deliverable to submit:
                  </p>
                  <div className="space-y-2">
                    {pendingDeliverables.map((deliverable) => (
                      <button
                        key={deliverable.id}
                        onClick={() => setSelectedDeliverable(deliverable)}
                        className="w-full text-left p-4 border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-[#111318]">{deliverable.title}</h4>
                            <p className="text-sm text-[#616f89] mt-1">{deliverable.projectName}</p>
                            {deliverable.dueDate && (
                              <p className="text-xs text-[#616f89] mt-1">
                                Due: {new Date(deliverable.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <span className="material-symbols-outlined text-primary">
                            chevron_right
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {selectedDeliverable && (
              <div className="px-6 py-4 border-t border-[#e5e7eb] flex gap-3">
                <button
                  onClick={() => setSelectedDeliverable(null)}
                  className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111318] hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => handleSubmitDeliverable(selectedDeliverable.id)}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
