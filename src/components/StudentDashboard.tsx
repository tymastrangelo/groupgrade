'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  myGroupId?: string;
  myGroupName?: string;
  myGroupMembers?: { id: string; name: string; email: string; avatar_url?: string | null; last_active?: string | null }[];
};

type Deliverable = {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  assignedTo?: { id: string; name: string; email: string };
  groupId: string;
  projectId: string;
  projectName?: string;
  className?: string;
  groupName?: string;
};

type GroupData = {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  className: string;
  members: { 
    id: string; 
    name: string; 
    email: string; 
    avatar_url?: string | null; 
    last_active?: string | null;
    deliverableCompletion?: number;
    meetingCompletion?: number;
    recentActivity?: string;
  }[];
};

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
              myGroupId: myGroup?.id,
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

  const fetchDeliverables = async () => {
    try {
      const userEmail = session?.user?.email;
      if (!userEmail) return;

      const allDeliverables: Deliverable[] = [];
      
      for (const project of projects) {
        const res = await fetch(`/api/deliverables?projectId=${project.id}`);
        if (res.ok) {
          const data = await res.json();
          const deliverables = Array.isArray(data) ? data : [];
          
          const userDeliverables = deliverables
            .filter((d: any) => d.assignedTo?.email === userEmail && d.status !== 'submitted')
            .map((d: any) => ({
              id: d.id,
              title: d.title,
              description: d.description,
              status: d.status,
              dueDate: d.dueDate,
              assignedTo: d.assignedTo,
              groupId: d.groupId,
              projectId: project.id,
              projectName: project.name,
              className: project.className,
              groupName: project.myGroupName,
            }));
          
          allDeliverables.push(...userDeliverables);
        }
      }
      
      setDeliverables(allDeliverables);
    } catch (err) {
      console.error('Error fetching deliverables:', err);
    }
  };

  const fetchGroups = async () => {
    try {
      const groupsData: GroupData[] = [];
      
      for (const project of projects) {
        if (project.myGroupId) {
          const res = await fetch(`/api/groups/${project.myGroupId}/members-activity`);
          if (res.ok) {
            const data = await res.json();
            
            // Create a map of email -> last_active from the API response
            const activityMap: Record<string, string | null> = {};
            data.members?.forEach((member: any) => {
              if (member.email) {
                activityMap[member.email] = member.last_active;
              }
            });
            
            // Merge fresh last_active data with existing member data
            const updatedMembers = (project.myGroupMembers || []).map(member => ({
              ...member,
              last_active: activityMap[member.email] ?? member.last_active,
            }));
            
            groupsData.push({
              id: project.myGroupId,
              name: project.myGroupName || 'My Group',
              projectId: project.id,
              projectName: project.name,
              className: project.className,
              members: updatedMembers,
            });
          }
        }
      }
      
      setGroups(groupsData);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      fetchDeliverables();
      fetchGroups();
    }
  }, [projects.length]);

  // Refresh member activity status periodically
  useEffect(() => {
    if (groups.length === 0) return;

    const refreshMemberActivity = async () => {
      try {
        const updatedGroups = await Promise.all(
          groups.map(async (group) => {
            const res = await fetch(`/api/groups/${group.id}/members-activity`);
            if (res.ok) {
              const data = await res.json();
              const activityMap: Record<string, string | null> = {};
              data.members?.forEach((member: any) => {
                if (member.email) {
                  activityMap[member.email] = member.last_active;
                }
              });
              
              // Update last_active for each member
              const updatedMembers = group.members.map(member => ({
                ...member,
                last_active: activityMap[member.email] ?? member.last_active,
              }));
              
              return { ...group, members: updatedMembers };
            }
            return group;
          })
        );
        
        setGroups(updatedGroups);
      } catch (err) {
        console.error('Failed to refresh member activity:', err);
      }
    };

    // Refresh every 30 seconds to show real-time activity
    const interval = setInterval(refreshMemberActivity, 30 * 1000);

    return () => clearInterval(interval);
  }, [groups.length]);

  // Helper functions for date calculations
  const getDaysUntilDue = (dueDate?: string | null): number => {
    if (!dueDate) return 999;
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusInfo = (dueDate?: string | null) => {
    if (!dueDate) return { text: 'No due date', color: 'bg-gray-100 text-gray-600', isOverdue: false };
    
    const daysUntil = getDaysUntilDue(dueDate);
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (daysUntil < 0) {
      return { text: 'OVERDUE', color: 'bg-red-500 text-white', isOverdue: true };
    } else if (diffHours < 24 && diffHours > 0) {
      return { text: `Due in ${diffHours} hours`, color: 'bg-orange-500 text-white', isOverdue: false };
    } else if (daysUntil === 0) {
      return { text: 'Due today', color: 'bg-orange-500 text-white', isOverdue: false };
    } else if (daysUntil === 1) {
      return { text: 'Due tomorrow', color: 'bg-orange-500 text-white', isOverdue: false };
    } else if (daysUntil <= 7) {
      return { text: `Due in ${daysUntil} days`, color: 'bg-orange-500 text-white', isOverdue: false };
    } else {
      return { text: `Due in ${daysUntil} days`, color: 'bg-green-500 text-white', isOverdue: false };
    }
  };

  const formatDueDate = (dueDate?: string | null): string => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const getActivityStatusText = (lastActive?: string | null): { text: string; color: string } => {
    if (!lastActive) return { text: 'Never', color: 'text-gray-400' };
    
    const now = new Date();
    const last = new Date(lastActive);
    const diffMs = now.getTime() - last.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (minutes < 5) return { text: 'Active Now', color: 'text-green-600' };
    if (minutes < 60) return { text: `${minutes}m ago`, color: 'text-gray-600' };
    if (hours < 24) return { text: `${hours}h ago`, color: 'text-gray-600' };
    if (days === 1) return { text: '1d ago', color: 'text-gray-500' };
    return { text: `${days}d ago`, color: 'text-gray-500' };
  };

  // Sort projects: overdue first (longest overdue first), then upcoming (closest first)
  const sortedProjects = [...projects].sort((a, b) => {
    const aDays = getDaysUntilDue(a.due_date);
    const bDays = getDaysUntilDue(b.due_date);
    
    const aOverdue = aDays < 0;
    const bOverdue = bDays < 0;
    
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aOverdue && bOverdue) return aDays - bDays; // Most overdue first
    return aDays - bDays; // Closest due date first
  });

  // Sort deliverables: overdue first (longest overdue first), then upcoming (closest first)
  const sortedDeliverables = [...deliverables].sort((a, b) => {
    const aDays = getDaysUntilDue(a.dueDate);
    const bDays = getDaysUntilDue(b.dueDate);
    
    const aOverdue = aDays < 0;
    const bOverdue = bDays < 0;
    
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aOverdue && bOverdue) return aDays - bDays;
    return aDays - bDays;
  });

  // Filter deliverables based on search and filters
  const filteredDeliverables = sortedDeliverables.filter(d => {
    const matchesSearch = searchQuery === '' || 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.className?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = classFilter === 'all' || d.className === classFilter;
    const matchesProject = projectFilter === 'all' || d.projectName === projectFilter;
    const matchesGroup = groupFilter === 'all' || d.groupName === groupFilter;
    
    return matchesSearch && matchesClass && matchesProject && matchesGroup;
  });

  const handleSubmitDeliverable = async (deliverableId: string) => {
    router.push(`/student/projects/${deliverables.find(d => d.id === deliverableId)?.projectId}`);
  };

  // Count projects due this week
  const projectsDueThisWeek = projects.filter(p => {
    const days = getDaysUntilDue(p.due_date);
    return days >= 0 && days <= 7;
  }).length;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      
      {/* Content only - no sidebar or header, those come from DashboardLayout */}
      <div className="w-full bg-[#f6f6f8] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Page Heading - NO Submit Work Button */}
        <div>
          <h1 className="text-[#111318] text-4xl font-black tracking-tight mb-1">Welcome back, {firstName}</h1>
          <p className="text-[#657386]">
            You have <span className="text-primary font-bold">{projectsDueThisWeek}</span> {projectsDueThisWeek === 1 ? 'project' : 'projects'} due this week
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Projects and Deliverables */}
          <div className="lg:col-span-2 space-y-8">
            {/* Projects Section - Horizontal Scroll with 3 cards */}
            {!loading && sortedProjects.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#111318]">Your Projects</h2>
                  <Link href="/student/projects" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                    View All Projects
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {sortedProjects.slice(0, 3).map((project) => {
                    const status = getStatusInfo(project.due_date);
                    return (
                      <Link
                        key={project.id}
                        href={`/student/projects/${project.id}`}
                        className={`bg-white rounded-xl p-5 hover:shadow-lg transition-all flex-shrink-0 w-[320px] flex flex-col gap-3 group ${
                          status.isOverdue ? 'border-2 border-red-500' : 'border border-[#e5e7eb]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          {status.isOverdue && (
                            <span className="material-symbols-outlined text-red-500 text-xl">warning</span>
                          )}
                          <span className={`ml-auto text-xs px-3 py-1 rounded-full font-bold ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                          <h3 className="text-lg font-bold text-[#111318] group-hover:text-primary transition-colors">{project.name}</h3>
                          <div className="text-sm text-[#616f89] space-y-1">
                            <div>{project.className}</div>
                            {project.myGroupName && <div>{project.myGroupName}</div>}
                          </div>
                        </div>
                        {project.due_date && (
                          <div className="text-sm text-[#616f89] text-right">
                            {formatDueDate(project.due_date)}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Deliverables Section - Vertical List */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-[#111318]">Your Deliverables</h2>
              
              {/* Search and Filters */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89]">search</span>
                  <input
                    type="text"
                    placeholder="Search deliverable..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Classes</option>
                    {Array.from(new Set(deliverables.map(d => d.className))).map(className => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Projects</option>
                    {Array.from(new Set(deliverables.map(d => d.projectName))).map(projectName => (
                      <option key={projectName} value={projectName}>{projectName}</option>
                    ))}
                  </select>
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Groups</option>
                    {Array.from(new Set(deliverables.map(d => d.groupName))).map(groupName => (
                      <option key={groupName} value={groupName}>{groupName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Deliverable Cards */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredDeliverables.length === 0 ? (
                  <div className="text-center py-8 text-[#616f89]">
                    <span className="material-symbols-outlined text-6xl mb-4">task_alt</span>
                    <p>No deliverables found</p>
                  </div>
                ) : (
                  filteredDeliverables.map((deliverable) => {
                    const status = getStatusInfo(deliverable.dueDate);
                    return (
                      <div
                        key={deliverable.id}
                        className="bg-white border border-[#e5e7eb] rounded-lg p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex gap-2 flex-wrap mb-3">
                          {deliverable.className && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                              {deliverable.className}
                            </span>
                          )}
                          {deliverable.projectName && (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                              {deliverable.projectName}
                            </span>
                          )}
                          {deliverable.groupName && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                              {deliverable.groupName}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-[#111318] mb-2">{deliverable.title}</h3>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm px-3 py-1 rounded-full font-bold ${status.color}`}>
                            {status.text}
                          </span>
                          <button
                            onClick={() => handleSubmitDeliverable(deliverable.id)}
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Team Activity with Detailed Table */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#111318] uppercase tracking-wide">Team Activity</h2>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            {groups.map((group) => (
              <div key={group.id} className="bg-white border border-[#e5e7eb] rounded-xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#111318] mb-1">{group.name}</h3>
                    <p className="text-sm text-[#616f89] uppercase tracking-wide">{group.className} • {group.projectName}</p>
                  </div>
                  <Link
                    href={`/student/projects/${group.projectId}`}
                    className="text-sm text-red-500 font-semibold hover:underline flex items-center gap-1"
                  >
                    View Group
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
                
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-2 pb-3 border-b border-[#e5e7eb] mb-4">
                  <div className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Team</div>
                  <div className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Last Active</div>
                  <div className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Activity Log</div>
                  <div className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider text-right">Deliv.</div>
                  <div className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider text-right">Meet.</div>
                </div>
                
                {/* Table Rows */}
                <div className="space-y-4">
                  {group.members.map((member, index) => {
                    const activityStatus = getActivityStatusText(member.last_active);
                    const isCurrentUser = member.email === session?.user?.email;
                    
                    // Color coding for names
                    const nameColors = ['text-red-600', 'text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600'];
                    const nameColor = nameColors[index % nameColors.length];
                    
                    // Mock data for completion percentages (you can replace with real data)
                    const delivCompletion = member.deliverableCompletion || (isCurrentUser ? 100 : Math.floor(Math.random() * 50) + 50);
                    const meetCompletion = member.meetingCompletion || (isCurrentUser ? 100 : Math.floor(Math.random() * 50) + 50);
                    
                    // Mock recent activity
                    const activities = ['Modified Dash...', 'Edited Q5', 'Shared Research', 'Drafted intro', 'Updated slides'];
                    const recentActivity = member.recentActivity || activities[index % activities.length];
                    
                    return (
                      <div key={member.id} className="grid grid-cols-5 gap-2 items-center">
                        <div className={`text-sm font-bold ${nameColor} truncate`}>
                          {member.name.length > 12 ? `${member.name.substring(0, 10)}...` : member.name}
                        </div>
                        <div className={`text-sm ${activityStatus.color}`}>
                          {activityStatus.text}
                        </div>
                        <div className="text-sm text-gray-500 italic truncate">
                          {recentActivity}
                        </div>
                        <div className={`text-sm font-bold text-right ${
                          delivCompletion === 100 ? 'text-green-600' : 
                          delivCompletion >= 75 ? 'text-orange-500' : 
                          'text-red-500'
                        }`}>
                          {delivCompletion}%
                        </div>
                        <div className={`text-sm font-bold text-right ${
                          meetCompletion === 100 ? 'text-green-600' : 
                          meetCompletion >= 75 ? 'text-orange-500' : 
                          'text-red-500'
                        }`}>
                          {meetCompletion}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

    </>
  );
}
