'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

type StudentEngagement = {
  userId: string;
  userName: string;
  userEmail: string;
  classId: string;
  className: string;
  classCode: string;
  projectId: string;
  projectName: string;
  groupId: string;
  groupName: string;
  engagementScore: number;
  riskLevel: 'healthy' | 'watch' | 'needs-attention';
  riskColor: string;
  deliverablesCompleted: number;
  totalDeliverables: number;
  deliverablesPercentage: number;
  meetingsAttended: number;
  totalMeetings: number;
  missedMeetings: number;
  daysIdle: number;
  lastActive: string | null;
  reasons: string;
  autoFlags: string[];
};

export default function TeacherStudentsView() {
  const [students, setStudents] = useState<StudentEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<'all' | 'needs-attention' | 'watch' | 'healthy'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'risk' | 'name' | 'engagement'>('risk');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchEngagement = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/teacher/engagement');
        
        if (res.ok) {
          const data = await res.json();
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

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students;

    if (riskFilter !== 'all') {
      filtered = filtered.filter(s => s.riskLevel === riskFilter);
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter(s => s.classId === classFilter);
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter(s => s.projectId === projectFilter);
    }

    if (groupFilter !== 'all') {
      filtered = filtered.filter(s => s.groupId === groupFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.userName.toLowerCase().includes(query) ||
        s.className.toLowerCase().includes(query) ||
        s.classCode.toLowerCase().includes(query) ||
        s.projectName.toLowerCase().includes(query) ||
        s.groupName.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'risk') {
        const riskOrder = { 'needs-attention': 0, 'watch': 1, 'healthy': 2 };
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      } else if (sortBy === 'name') {
        return a.userName.localeCompare(b.userName);
      } else {
        return a.engagementScore - b.engagementScore;
      }
    });

    return sorted;
  }, [students, riskFilter, classFilter, projectFilter, groupFilter, sortBy, searchQuery]);

  const stats = useMemo(() => {
    const needsAttention = students.filter(s => s.riskLevel === 'needs-attention').length;
    const watch = students.filter(s => s.riskLevel === 'watch').length;
    const healthy = students.filter(s => s.riskLevel === 'healthy').length;
    const avgEngagement = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.engagementScore, 0) / students.length)
      : 0;

    return { needsAttention, watch, healthy, avgEngagement, total: students.length };
  }, [students]);

  const uniqueClasses = useMemo(() => {
    const classes = new Map();
    students.forEach(s => classes.set(s.classId, { id: s.classId, name: s.className, code: s.classCode }));
    return Array.from(classes.values());
  }, [students]);

  const uniqueProjects = useMemo(() => {
    const projects = new Map();
    students.forEach(s => projects.set(s.projectId, { id: s.projectId, name: s.projectName }));
    return Array.from(projects.values());
  }, [students]);

  const uniqueGroups = useMemo(() => {
    const groups = new Map();
    students.forEach(s => groups.set(s.groupId, { id: s.groupId, name: s.groupName }));
    return Array.from(groups.values());
  }, [students]);

  const getRiskBadge = (level: string) => {
    if (level === 'healthy') return { icon: '🟢', text: 'Healthy', color: 'text-green-600', bg: 'bg-green-50' };
    if (level === 'watch') return { icon: '🟠', text: 'Watch', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { icon: '🔴', text: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-50' };
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">Students</h2>
        <p className="text-[#475569] mt-1 font-medium">Track individual participation, risk levels, and engagement markers across all project groups.</p>
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
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${
            riskFilter === 'needs-attention' ? 'bg-red-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#111318] hover:bg-[#f9fafb]'
          }`}
        >
          🔴 Needs Attention
        </button>
        <button
          onClick={() => setRiskFilter('watch')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${
            riskFilter === 'watch' ? 'bg-orange-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#111318] hover:bg-[#f9fafb]'
          }`}
        >
          🟠 Watch
        </button>
        <button
          onClick={() => setRiskFilter('healthy')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${
            riskFilter === 'healthy' ? 'bg-green-600 text-white' : 'bg-white border border-[#e5e7eb] text-[#111318] hover:bg-[#f9fafb]'
          }`}
        >
          🟢 Healthy
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-medium bg-white"
        >
          <option value="all">Class: All Classes</option>
          {uniqueClasses.map(c => (
            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
          ))}
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-medium bg-white"
        >
          <option value="all">Project: All Projects</option>
          {uniqueProjects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-medium bg-white"
        >
          <option value="all">Group: All Groups</option>
          {uniqueGroups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search students, classes, projects, or group n"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[300px] px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f8fafc] border-b border-[#e5e7eb]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Risk</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Class</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Group</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Engagement</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Reason</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#64748b]">Loading students...</td>
                </tr>
              ) : filteredAndSortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#64748b]">No students found</td>
                </tr>
              ) : (
                filteredAndSortedStudents.map((student) => {
                  const risk = getRiskBadge(student.riskLevel);
                  return (
                    <tr key={`${student.userId}-${student.groupId}`} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${risk.bg} ${risk.color}`}>
                          {risk.icon} {risk.text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[#111318]">{student.userName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#475569]">{student.classCode}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#475569]">{student.projectName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#475569]">{student.groupName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            student.engagementScore === 100 ? 'text-green-600' :
                            student.engagementScore >= 75 ? 'text-orange-600' : 
                            'text-red-600'
                          }`}>{student.engagementScore}/100</span>
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                student.engagementScore === 100 ? 'bg-green-500' :
                                student.engagementScore >= 75 ? 'bg-orange-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${student.engagementScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-xs text-[#64748b] italic">{student.reasons || 'Healthy engagement across markers'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/teacher/projects/${student.projectId}?groupId=${student.groupId}`}
                          className="inline-block px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          View Project
                        </Link>
                      </td>
                    </tr>
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
          <p className="text-3xl font-black text-primary">{stats.avgEngagement}<span className="text-lg">/100</span></p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-[#64748b] mb-2">Total Students</p>
          <p className="text-3xl font-black text-[#111318]">{stats.total}</p>
        </div>
      </div>

      <p className="text-xs text-[#94a3b8] mt-4 text-center">
        Showing 1 to {filteredAndSortedStudents.length} of {stats.total} students
      </p>
    </div>
  );
}
