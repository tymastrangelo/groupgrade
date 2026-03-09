'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

type GroupEngagement = {
  groupId: string;
  groupName: string;
  projectId: string;
  projectName: string;
  classId: string;
  className: string;
  classCode: string;
  avgEngagement: number;
  atRiskStudents: number;
  totalStudents: number;
  riskLevel: 'healthy' | 'watch' | 'needs-attention';
  riskColor: string;
};

type StudentEngagement = {
  userId: string;
  userName: string;
  userEmail: string;
  groupId: string;
  engagementScore: number;
  riskLevel: string;
  deliverablesPercentage: number;
  meetingsAttended: number;
  totalMeetings: number;
  daysIdle: number;
  lastActive: string | null;
  reasons: string;
};

export default function GroupAnalyticsView() {
  const [groups, setGroups] = useState<GroupEngagement[]>([]);
  const [students, setStudents] = useState<StudentEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<'all' | 'needs-attention' | 'watch' | 'healthy'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchEngagement = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/teacher/engagement');
        if (res.ok) {
          const data = await res.json();
          setGroups(data.groups || []);
          setStudents(data.students || []);
        }
      } catch (err) {
        console.error('Failed to fetch engagement data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();
  }, []);

  const filteredGroups = useMemo(() => {
    let filtered = groups;

    if (riskFilter !== 'all') {
      filtered = filtered.filter(g => g.riskLevel === riskFilter);
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter(g => g.classId === classFilter);
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter(g => g.projectId === projectFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g => 
        g.groupName.toLowerCase().includes(query) ||
        g.className.toLowerCase().includes(query) ||
        g.classCode.toLowerCase().includes(query) ||
        g.projectName.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const riskOrder = { 'needs-attention': 0, 'watch': 1, 'healthy': 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });
  }, [groups, riskFilter, classFilter, projectFilter, searchQuery]);

  const stats = useMemo(() => {
    const needsAttention = groups.filter(g => g.riskLevel === 'needs-attention').length;
    const watch = groups.filter(g => g.riskLevel === 'watch').length;
    const avgEngagement = groups.length > 0
      ? Math.round(groups.reduce((sum, g) => sum + g.avgEngagement, 0) / groups.length)
      : 0;

    return { needsAttention, watch, avgEngagement, total: groups.length };
  }, [groups]);

  const uniqueClasses = useMemo(() => {
    const classes = new Map();
    groups.forEach(g => classes.set(g.classId, { id: g.classId, name: g.className, code: g.classCode }));
    return Array.from(classes.values());
  }, [groups]);

  const uniqueProjects = useMemo(() => {
    const projects = new Map();
    groups.forEach(g => projects.set(g.projectId, { id: g.projectId, name: g.projectName }));
    return Array.from(projects.values());
  }, [groups]);

  const getRiskBadge = (level: string) => {
    if (level === 'healthy') return { icon: '🟢', text: 'Healthy', color: 'text-green-600', bg: 'bg-green-50' };
    if (level === 'watch') return { icon: '🟠', text: 'Watch', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { icon: '🔴', text: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const getGroupStudents = (groupId: string) => {
    return students.filter(s => s.groupId === groupId);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">Group Analytics</h2>
        <p className="text-[#475569] mt-1 font-medium">Detailed student breakdown and recent contribution timelines for active project management.</p>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setRiskFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
            riskFilter === 'all' ? 'bg-primary text-white' : 'bg-white border border-[#e5e7eb] text-[#111318] hover:bg-[#f9fafb]'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setRiskFilter('needs-attention')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
            riskFilter === 'needs-attention' ? 'bg-red-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#111318] hover:bg-[#f9fafb]'
          }`}
        >
          Needs Attention
        </button>
        <button
          onClick={() => setRiskFilter('watch')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
            riskFilter === 'watch' ? 'bg-orange-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#111318] hover:bg-[#f9fafb]'
          }`}
        >
          Watch
        </button>
        <button
          onClick={() => setRiskFilter('healthy')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
            riskFilter === 'healthy' ? 'bg-green-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#111318] hover:bg-[#f9fafb]'
          }`}
        >
          Healthy
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-medium bg-white"
        >
          <option value="all">Class: All</option>
          {uniqueClasses.map(c => (
            <option key={c.id} value={c.id}>{c.code}</option>
          ))}
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-medium bg-white"
        >
          <option value="all">Project: All</option>
          {uniqueProjects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-medium bg-white">
          <option>Group: All</option>
        </select>

        <input
          type="text"
          placeholder="Search groups, classes, or projects"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm"
        />
      </div>

      {/* Groups Table */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f8fafc] border-b border-[#e5e7eb]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Risk</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Class</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Group</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">At-Risk Students</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Avg Engagement</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#64748b]">Loading groups...</td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#64748b]">No groups found</td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  const risk = getRiskBadge(group.riskLevel);
                  const isExpanded = expandedGroup === group.groupId;
                  const groupStudents = getGroupStudents(group.groupId);

                  return (
                    <>
                      <tr key={group.groupId} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${risk.bg} ${risk.color}`}>
                            {risk.icon}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#111318]">{group.classCode}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-[#475569]">{group.projectName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#111318]">{group.groupName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            group.atRiskStudents > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {group.atRiskStudents}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className={`h-full ${group.riskLevel === 'healthy' ? 'bg-green-500' : group.riskLevel === 'watch' ? 'bg-orange-500' : 'bg-red-500'}`}
                                style={{ width: `${group.avgEngagement}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-[#111318]">{group.avgEngagement}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/teacher/projects/${group.projectId}?groupId=${group.groupId}`}
                              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              View Group
                            </Link>
                            <button
                              onClick={() => setExpandedGroup(isExpanded ? null : group.groupId)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-[#64748b]">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Student Breakdown */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-[#f8fafc]">
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Student Breakdown</p>
                              <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#64748b]">Risk</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#64748b]">Student Name</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#64748b]">Score</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#64748b]">Deliverables %</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#64748b]">Meetings %</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#64748b]">Last Activity</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#64748b]">Reason for Alert</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#64748b]">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#e5e7eb]">
                                    {groupStudents.map((student) => {
                                      const studentRisk = getRiskBadge(student.riskLevel);
                                      const meetingsPercentage = student.totalMeetings > 0 
                                        ? Math.round((student.meetingsAttended / student.totalMeetings) * 100)
                                        : 0;
                                      
                                      const lastActiveText = student.lastActive
                                        ? (() => {
                                            const date = new Date(student.lastActive);
                                            const now = new Date();
                                            const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                                            if (days === 0) return 'Today';
                                            if (days === 1) return 'Yesterday';
                                            return `${days}d ago`;
                                          })()
                                        : 'Never';

                                      return (
                                        <tr key={student.userId} className="hover:bg-gray-50">
                                          <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${studentRisk.bg} ${studentRisk.color}`}>
                                              {studentRisk.icon}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-[#111318]">{student.userName}</p>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm font-bold text-[#111318]">{student.engagementScore}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className={`text-sm font-semibold ${
                                              student.deliverablesPercentage >= 70 ? 'text-green-600' :
                                              student.deliverablesPercentage >= 50 ? 'text-orange-600' : 'text-red-600'
                                            }`}>
                                              {student.deliverablesPercentage}%
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className={`text-sm font-semibold ${
                                              meetingsPercentage >= 70 ? 'text-green-600' :
                                              meetingsPercentage >= 50 ? 'text-orange-600' : 'text-red-600'
                                            }`}>
                                              {meetingsPercentage}%
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-xs text-[#64748b]">{lastActiveText}</span>
                                          </td>
                                          <td className="px-4 py-3 max-w-xs">
                                            <p className="text-xs text-[#64748b] italic truncate">{student.reasons || 'Consistent engagement'}</p>
                                          </td>
                                          <td className="px-4 py-3">
                                            <button className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded hover:bg-gray-900 transition-colors">
                                              ACTIVITY
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-[#64748b] mb-2">Needs Attention</p>
          <p className="text-3xl font-black text-[#dc2626]">{stats.needsAttention}</p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-[#64748b] mb-2">Watch</p>
          <p className="text-3xl font-black text-[#f97316]">{stats.watch}</p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-[#64748b] mb-2">Average Engagement</p>
          <p className="text-3xl font-black text-primary">{stats.avgEngagement}%</p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-[#64748b] mb-2">Total Groups</p>
          <p className="text-3xl font-black text-[#111318]">{stats.total}</p>
        </div>
      </div>

      <p className="text-xs text-[#94a3b8] mt-4 text-center">
        Showing 1 to 10 of {stats.total} groups
      </p>
    </div>
  );
}
