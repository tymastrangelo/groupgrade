"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type ClassData = {
  id: string;
  name: string;
  code: string;
  join_code_expires_at?: string | null;
  created_at?: string | null;
};

type Member = {
  id: string;
  name: string;
  email: string;
  userRole: string | null;
  classRole: string;
  avatar_url?: string | null;
  joined_at?: string | null;
};

type Note = {
  id: string;
  content: string;
  created_at?: string | null;
  author_name?: string | null;
};

type Project = {
  id: string;
  name: string;
  due_date?: string | null;
  rubric?: string | null;
  groups?: { id: string; name: string; members: { id: string; name: string; email: string; avatar_url?: string | null }[] }[];
};

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString();
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  const letter = (name || '?').charAt(0).toUpperCase();
  if (src) {
    return <img src={src} alt={name} className="h-10 w-10 rounded-full object-cover border border-[#e5e7eb]" />;
  }
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-[#e5e7eb]">
      {letter}
    </div>
  );
}

export function StudentClassDetail({ classId }: { classId: string }) {
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const professors = members.filter((m) => m.classRole === 'professor').length;
    const students = members.filter((m) => m.classRole === 'student').length;
    return { total: members.length, professors, students };
  }, [members]);

  const fetchData = async () => {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/classes/${classId}`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to load class');
      setLoading(false);
      return;
    }
    const j = await res.json();
    setClassData(j.class);
    setMembers(j.members || []);
    setNotes(j.notes || []);
    setProjects(j.projects || []);
    setViewerId(j.viewer_id || null);
    setLoading(false);
  };

  useEffect(() => {
    if (!classId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [classId]);

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-6">
        <div className="h-48 bg-white rounded-xl border border-[#e5e7eb] animate-pulse" />
        <div className="h-64 bg-white rounded-xl border border-[#e5e7eb] animate-pulse" />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto w-full">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 text-[#e11d48]">
          {error || 'Class not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[#616f89]">Class</p>
            <h1 className="text-3xl font-black text-[#111318] tracking-tight">{classData.name}</h1>
            <p className="text-xs text-[#616f89] mt-1">Joined {formatDate(classData.created_at)}</p>
          </div>
          <span className="text-[11px] px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
            <p className="text-xs text-[#616f89]">Total members</p>
            <p className="text-2xl font-bold text-[#111318]">{stats.total}</p>
          </div>
          <div className="p-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
            <p className="text-xs text-[#616f89]">Students</p>
            <p className="text-2xl font-bold text-[#111318]">{stats.students}</p>
          </div>
          <div className="p-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
            <p className="text-xs text-[#616f89]">Professors</p>
            <p className="text-2xl font-bold text-[#111318]">{stats.professors}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#111318]">Announcements</h3>
            <p className="text-sm text-[#616f89]">Posted by your professor.</p>
          </div>
          <span className="text-xs text-[#616f89]">{notes.length} items</span>
        </div>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-sm text-[#616f89]">No announcements yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="p-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-sm text-[#111318]">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-xs text-[#4b5563]">{note.author_name || 'Professor'}</p>
                  <p className="text-[10px] text-[#9ca3af]">{formatDate(note.created_at)}</p>
                </div>
                <p className="mt-1 leading-snug">{note.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#111318]">Projects</h3>
            <p className="text-sm text-[#616f89]">See your teams once your professor groups the class.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {projects.length === 0 ? (
            <p className="text-sm text-[#616f89]">No projects yet.</p>
          ) : (
            projects.map((p) => {
              let parsed: any = {};
              try {
                parsed = p.rubric ? JSON.parse(p.rubric) : {};
              } catch {}
              const myGroup = (p.groups || []).find((g) => g.members.some((m) => m.id === viewerId));
              return (
                <Link
                  key={p.id}
                  href={`/student/projects/${p.id}`}
                  className="p-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] flex flex-col gap-2 hover:shadow-md transition-shadow"
                  aria-label={`View project ${p.name}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-[#111318]">{p.name}</p>
                      {p.due_date && <p className="text-xs text-[#616f89]">Due {formatDate(p.due_date)}</p>}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                          {parsed.assignment_mode === 'students_self_assign' ? 'Students assign' : 'Teacher assigns'}
                        </span>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700/30">
                          {parsed.grouping_strategy === 'random_from_survey' ? 'Random (survey)' : 'Manual groups'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-[#616f89]">{p.groups?.length || 0} groups</span>
                  </div>

                  {p.groups && p.groups.length > 0 ? (
                    myGroup ? (
                      <div className="border border-[#e5e7eb] rounded-lg p-3 bg-white">
                        <p className="text-sm font-semibold text-[#111318]">Your group: {myGroup.name}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {myGroup.members.map((m) => (
                            <span key={m.id} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${m.id === viewerId ? 'bg-primary text-white border-primary' : 'bg-[#f3f4f6] text-[#111318] border-[#e5e7eb]'}`}>
                              <Avatar name={m.name} src={(m as any).avatar_url} />
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#616f89]">Groups are set; you are not assigned yet.</p>
                    )
                  ) : (
                    <p className="text-sm text-[#616f89]">Groups not created yet.</p>
                  )}
                  <div className="flex items-center justify-end gap-1 text-sm font-bold text-primary mt-1">
                    <span>View details</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#111318]">Members</h3>
            <p className="text-sm text-[#616f89]">Professor and student roster.</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">{stats.total} total</span>
        </div>
        {members.length === 0 ? (
          <div className="text-sm text-[#616f89]">No members yet.</div>
        ) : (
          <div className="divide-y divide-[#e5e7eb]">
            {members.map((m) => (
              <div key={`${m.id}-${m.classRole}`} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} src={m.avatar_url} />
                  <div>
                    <p className="text-sm font-semibold text-[#111318]">
                      {m.classRole === 'professor' ? `Professor ${m.name.split(' ').pop()}` : m.name}
                    </p>
                    <p className="text-xs text-[#616f89]">{m.email}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${
                  m.classRole === 'professor'
                    ? 'bg-purple-100 text-purple-700/30'
                    : 'bg-blue-100 text-blue-700/30'
                }`}>
                  {m.classRole === 'professor' ? 'Instructor' : 'Student'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
