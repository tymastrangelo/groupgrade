"use client";

import { useEffect, useMemo, useState } from 'react';

type ClassRow = {
  id: string;
  name: string;
};

type FormState = {
  classId: string;
  name: string;
  dueDate: string;
  description: string;
  rubricText: string;
  assignmentMode: 'teacher_assigns' | 'students_self_assign';
  groupingStrategy: 'manual' | 'random_from_survey';
  expectations: string;
  deliverableInput: string;
};

type ProjectRow = {
  id: string;
  name: string;
  due_date: string | null;
  rubric: string | null;
};

export function TeacherProjectCreate() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deliverables, setDeliverables] = useState<string[]>(['Final project report (PDF)', 'Peer review form']);
  const [form, setForm] = useState<FormState>({
    classId: '',
    name: '',
    dueDate: '',
    description: '',
    rubricText: 'Criteria 1: Research Depth (40%)\nCriteria 2: Visual Presentation (30%)\nCriteria 3: Group Peer Evaluation (30%)',
    assignmentMode: 'teacher_assigns',
    groupingStrategy: 'manual',
    expectations: '',
    deliverableInput: '',
  });

  const fetchClasses = async () => {
    setError(null);
    setLoading(true);
    const res = await fetch('/api/classes');
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to load classes');
      setLoading(false);
      return;
    }
    const j = await res.json();
    const rows = (j.classes || []) as ClassRow[];
    setClasses(rows);
    setForm((prev) => ({ ...prev, classId: prev.classId || rows[0]?.id || '' }));
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const onChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addDeliverable = () => {
    if (!form.deliverableInput.trim()) return;
    setDeliverables((prev) => [...prev, form.deliverableInput.trim()]);
    setForm((prev) => ({ ...prev, deliverableInput: '' }));
  };

  const removeDeliverable = (index: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  };

  const canSubmit = useMemo(() => {
    return !!form.classId && !!form.name.trim();
  }, [form.classId, form.name]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/classes/${form.classId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          due_date: form.dueDate || null,
          assignment_mode: form.assignmentMode,
          grouping_strategy: form.groupingStrategy,
          description: form.description.trim() || undefined,
          rubric_text: form.rubricText.trim() || undefined,
          expectations: form.expectations.trim() || undefined,
          deliverables,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to create project');
      }

      setSuccess('Project created');
      setForm((prev) => ({
        ...prev,
        name: '',
        dueDate: '',
        description: '',
        rubricText: '',
        expectations: '',
        deliverableInput: '',
      }));
      setDeliverables(['Final project report (PDF)', 'Peer review form']);
      fetchProjects(form.classId);
    } catch (e: any) {
      setError(e.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const fetchProjects = async (classId: string) => {
    if (!classId) return;
    setProjectsLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/projects`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to load projects');
      }
      const j = await res.json();
      setProjects(j.projects || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    if (!form.classId) return;
    fetchProjects(form.classId);
  }, [form.classId]);

  const confirmDelete = async () => {
    if (!deleteTarget || !form.classId) return;
    setDeleteBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${form.classId}/projects/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to delete project');
      }
      setDeleteTarget(null);
      fetchProjects(form.classId);
    } catch (e: any) {
      setError(e.message || 'Failed to delete project');
    } finally {
      setDeleteBusy(false);
    }
  };

  const parseRubric = (rubric?: string | null) => {
    if (!rubric) return {} as Record<string, any>;
    try {
      return JSON.parse(rubric);
    } catch {
      return {} as Record<string, any>;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="bg-white dark:bg-background-dark rounded-xl shadow-2xl border border-[#e5e7eb] dark:border-[#2d3748] overflow-hidden">
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-[#111318] dark:text-white text-2xl font-bold leading-tight tracking-tight">Create New Project</h2>
          <p className="text-[#616f89] dark:text-gray-400 text-sm mt-1">Set the foundations for transparent group collaboration and fair grading.</p>
        </div>

        <div className="px-8 pb-6">
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          {success && <div className="mb-3 text-sm text-green-600">{success}</div>}
        </div>

        <div className="px-8 pb-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-[#111318] dark:text-white mb-2">Class</label>
                <select
                  className="h-12 rounded-lg border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-[#111318] dark:text-white px-4 focus:ring-2 focus:ring-primary focus:border-primary"
                  value={form.classId}
                  onChange={(e) => onChange('classId', e.target.value)}
                  disabled={loading}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  {classes.length === 0 && <option value="">No classes available</option>}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-[#111318] dark:text-white mb-2">Project Name</label>
                <input
                  className="h-12 rounded-lg border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-[#111318] dark:text-white px-4 focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Senior Capstone Phase 1"
                  value={form.name}
                  onChange={(e) => onChange('name', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-[#111318] dark:text-white mb-2">Due Date</label>
                <input
                  type="date"
                  className="h-12 rounded-lg border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-[#111318] dark:text-white px-4 focus:ring-2 focus:ring-primary focus:border-primary"
                  value={form.dueDate}
                  onChange={(e) => onChange('dueDate', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-[#111318] dark:text-white mb-2">Assignment Mode</label>
                  <select
                    className="h-12 rounded-lg border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-[#111318] dark:text-white px-4 focus:ring-2 focus:ring-primary focus:border-primary"
                    value={form.assignmentMode}
                    onChange={(e) => onChange('assignmentMode', e.target.value as FormState['assignmentMode'])}
                  >
                    <option value="teacher_assigns">Teacher assigns tasks</option>
                    <option value="students_self_assign">Students self-assign</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-[#111318] dark:text-white mb-2">Grouping Strategy</label>
                  <select
                    className="h-12 rounded-lg border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-[#111318] dark:text-white px-4 focus:ring-2 focus:ring-primary focus:border-primary"
                    value={form.groupingStrategy}
                    onChange={(e) => onChange('groupingStrategy', e.target.value as FormState['groupingStrategy'])}
                  >
                    <option value="manual">Manual grouping</option>
                    <option value="random_from_survey">Random using survey strengths</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-[#111318] dark:text-white mb-2">Description</label>
              <textarea
                className="rounded-lg border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-[#111318] dark:text-white px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                rows={3}
                placeholder="Explain the project goals and expectations..."
                value={form.description}
                onChange={(e) => onChange('description', e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-[#111318] dark:text-white">Grading Rubric</label>
                <span className="text-xs text-[#616f89] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Students will see this criteria
                </span>
              </div>
              <textarea
                className="rounded-lg border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-[#111318] dark:text-white px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary font-mono leading-relaxed"
                rows={4}
                placeholder="Criteria 1: ..."
                value={form.rubricText}
                onChange={(e) => onChange('rubricText', e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-[#111318] dark:text-white mb-2">Expectations / Notes</label>
              <textarea
                className="rounded-lg border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-[#111318] dark:text-white px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                rows={3}
                placeholder="Anything else students should know"
                value={form.expectations}
                onChange={(e) => onChange('expectations', e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-[#111318] dark:text-white mb-2">Deliverables</label>
              <div className="space-y-3 mb-3">
                {deliverables.map((d, idx) => (
                  <div key={`${d}-${idx}`} className="flex items-center justify-between p-3 bg-background-light dark:bg-gray-800/50 rounded-lg border border-[#dbdfe6] dark:border-gray-700">
                    <span className="text-sm">{d}</span>
                    <button type="button" className="text-red-500 hover:text-red-600" onClick={() => removeDeliverable(idx)}>
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                ))}
                {deliverables.length === 0 && <p className="text-sm text-[#616f89]">No deliverables yet.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 h-11 rounded-lg border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-[#111318] dark:text-white px-4 focus:ring-primary focus:border-primary"
                  placeholder="Add a deliverable..."
                  value={form.deliverableInput}
                  onChange={(e) => onChange('deliverableInput', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDeliverable();
                    }
                  }}
                />
                <button type="button" onClick={addDeliverable} className="bg-primary/10 text-primary hover:bg-primary/20 rounded-lg px-4 flex items-center transition-colors">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 border-t border-[#dbdfe6] dark:border-gray-700 flex justify-end gap-4 bg-gray-50 dark:bg-gray-900/50">
          <button
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-[#616f89] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            type="button"
            onClick={() => {
              setForm((prev) => ({ ...prev, name: '', dueDate: '', description: '', rubricText: '', expectations: '', deliverableInput: '' }));
              setDeliverables(['Final project report (PDF)', 'Peer review form']);
              setSuccess(null);
              setError(null);
            }}
          >
            Reset
          </button>
          <button
            className="px-8 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-blue-700 shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-60"
            type="button"
            disabled={!canSubmit || saving || loading}
            onClick={handleSubmit}
          >
            <span className="material-symbols-outlined text-lg">check_circle</span>
            {saving ? 'Saving...' : 'Create Project'}
          </button>
        </div>

        <div className="px-8 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#111318] dark:text-white">Projects for this class</h3>
              <p className="text-sm text-[#616f89]">Review existing projects and manage them here.</p>
            </div>
            <button
              className="text-sm text-primary font-bold"
              onClick={() => form.classId && fetchProjects(form.classId)}
              disabled={projectsLoading}
            >
              {projectsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {projectsLoading ? (
            <p className="text-sm text-[#616f89]">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-[#616f89]">No projects yet for this class.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => {
                const parsed = parseRubric(p.rubric);
                return (
                  <div key={p.id} className="rounded-xl border border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <a href={`/teacher/projects/${p.id}`} className="text-base font-semibold text-[#111318] dark:text-white hover:text-primary">
                          {p.name}
                        </a>
                        {p.due_date && <p className="text-xs text-[#616f89]">Due {p.due_date}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                            {parsed.assignment_mode === 'students_self_assign' ? 'Students assign' : 'Teacher assigns'}
                          </span>
                          <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                            {parsed.grouping_strategy === 'random_from_survey' ? 'Random (survey)' : 'Manual groups'}
                          </span>
                        </div>
                      </div>
                      <button
                        className="p-2 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                        onClick={() => setDeleteTarget(p)}
                        title="Delete project"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>

                    {parsed.description && <p className="text-sm text-[#111318] dark:text-gray-200 leading-snug">{parsed.description}</p>}
                    {Array.isArray(parsed.deliverables) && parsed.deliverables.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-semibold text-[#616f89]">Deliverables</p>
                        <ul className="list-disc list-inside text-sm text-[#111318] dark:text-gray-200 space-y-1">
                          {parsed.deliverables.map((d: string, idx: number) => (
                            <li key={`${p.id}-deliv-${idx}`}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <a href={`/teacher/projects/${p.id}`} className="text-sm font-bold text-primary hover:underline">
                      View project details
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-[#dbdfe6] dark:border-gray-700 p-6 flex flex-col gap-4">
            <div>
              <h4 className="text-lg font-bold text-[#111318] dark:text-white">Delete project?</h4>
              <p className="text-sm text-[#616f89]">This will remove {deleteTarget.name} and any groups under it.</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg text-sm font-bold border border-[#dbdfe6] dark:border-gray-700 text-[#111318] dark:text-white"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500 text-white disabled:opacity-60"
                onClick={confirmDelete}
                disabled={deleteBusy}
              >
                {deleteBusy ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
