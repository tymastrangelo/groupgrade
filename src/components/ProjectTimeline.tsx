'use client';

import { useState } from 'react';
import { tasksCache } from '@/lib/tasksCache';

export type Milestone = {
  id: string;
  project_id: string;
  name: string;
  due_date?: string | null;
  requirements?: string | null;
  order_index: number;
  created_at?: string;
  updated_at?: string;
};

type ProjectTimelineProps = {
  projectId: string;
  milestones: Milestone[];
  onUpdate?: () => void;
  editable?: boolean;
};

function pad(n: number): string { return n.toString().padStart(2, '0'); }
function toLocalInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
function fromLocalInput(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return d.toISOString();
}
function formatDateTime(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isPast(dateStr?: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function ProjectTimeline({ projectId, milestones, onUpdate, editable = false }: ProjectTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; due_date: string; requirements: string }>({
    name: '',
    due_date: '',
    requirements: '',
  });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = (milestone: Milestone) => {
    setEditingId(milestone.id);
    setEditForm({
      name: milestone.name,
      due_date: toLocalInput(milestone.due_date),
      requirements: milestone.requirements || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', due_date: '', requirements: '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          due_date: fromLocalInput(editForm.due_date),
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      cancelEdit();
      tasksCache.invalidate(`/api/projects/${projectId}/milestones`);
      onUpdate?.();
    } catch (e) {
      console.error('Failed to save milestone:', e);
    } finally {
      setSaving(false);
    }
  };

  const deleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      tasksCache.invalidate(`/api/projects/${projectId}/milestones`);
      onUpdate?.();
    } catch (e) {
      console.error('Failed to delete milestone:', e);
    }
  };

  const startAdd = () => {
    setAdding(true);
    setEditForm({ name: '', due_date: '', requirements: '' });
  };

  const saveAdd = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          due_date: fromLocalInput(editForm.due_date),
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setAdding(false);
      setEditForm({ name: '', due_date: '', requirements: '' });
      tasksCache.invalidate(`/api/projects/${projectId}/milestones`);
      onUpdate?.();
    } catch (e) {
      console.error('Failed to create milestone:', e);
    } finally {
      setSaving(false);
    }
  };

  const cancelAdd = () => {
    setAdding(false);
    setEditForm({ name: '', due_date: '', requirements: '' });
  };

  if (!editable && milestones.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
        <p className="text-sm text-[#616f89]">No milestones defined yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Modal for adding first milestone */}
      {adding && milestones.length === 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={cancelAdd}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111318]">Create First Milestone</h3>
              <button onClick={cancelAdd} className="text-[#616f89] hover:text-[#111318]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-[#111318] block mb-1">
                  Milestone Name
                </label>
                <input
                  className="w-full bg-[#f0f2f4] border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Project Proposal"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111318] block mb-1">
                  Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-[#f0f2f4] border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111318] block mb-1">
                  Requirements
                </label>
                <textarea
                  className="w-full bg-[#f0f2f4] border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="What should be delivered for this milestone?"
                  rows={4}
                  value={editForm.requirements}
                  onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelAdd}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#111318] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAdd}
                disabled={saving || !editForm.name.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Add Milestone button when milestones exist */}
      {milestones.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#111318]">Project Timeline</h3>
          {editable && !adding && (
            <button
              onClick={startAdd}
              data-add-milestone
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Add Milestone
            </button>
          )}
        </div>
      )}

      {/* Hidden trigger button for when there are no milestones */}
      {editable && !adding && milestones.length === 0 && (
        <button
          onClick={startAdd}
          data-add-milestone
          className="hidden"
        >
          Hidden trigger
        </button>
      )}

      {/* Only render the timeline container when there are milestones or adding */}
      {(milestones.length > 0 || adding) && (
        <div className="relative flex gap-6 overflow-x-auto pb-6 pt-6">
        {milestones.map((milestone, idx) => {
          const isEditing = editingId === milestone.id;
          const past = isPast(milestone.due_date);

          return (
            <div
              key={milestone.id}
              className={`flex-shrink-0 w-80 border-2 rounded-xl p-4 pt-8 relative ${
                past ? 'bg-[#f9fafb] border-[#e5e7eb]' : 'bg-white border-primary'
              }`}
            >
              <div
                className={`absolute -top-4 left-4 size-10 rounded-full ${
                  past ? 'bg-[#9ca3af]' : 'bg-primary'
                } border-4 border-white flex items-center justify-center text-white shadow-md z-10`}
              >
                <span className="text-sm font-bold">{idx + 1}</span>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <input
                    className="text-base font-bold bg-[#f0f2f4] border border-[#e5e7eb] rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Milestone Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <div>
                    <label className="text-[10px] font-bold text-[#616f89] uppercase tracking-wider block mb-1">
                      Due Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full text-xs bg-[#f0f2f4] border border-[#e5e7eb] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#616f89] uppercase tracking-wider block mb-1">
                      Requirements
                    </label>
                    <textarea
                      className="w-full text-xs bg-[#f0f2f4] border border-[#e5e7eb] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder="What should be delivered?"
                      rows={2}
                      value={editForm.requirements}
                      onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] text-[#111318] text-xs font-medium hover:bg-[#f9fafb]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-base font-bold ${past ? 'text-[#9ca3af]' : 'text-[#111318]'} overflow-hidden text-ellipsis`} style={{wordBreak: 'break-word'}}>
                      {milestone.name}
                    </h4>
                    {editable && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(milestone)}
                          className="text-[#616f89] hover:text-primary"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => deleteMilestone(milestone.id)}
                          className="text-[#616f89] hover:text-red-600"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {milestone.due_date && (
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="material-symbols-outlined text-sm text-[#616f89]">event</span>
                      <span className={past ? 'text-[#9ca3af]' : 'text-[#616f89]'}>
                        {formatDateTime(milestone.due_date)}
                      </span>
                    </div>
                  )}
                  {past && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#9ca3af] font-semibold">Past</span>}
                  {milestone.requirements && (
                    <p className={`text-xs leading-relaxed ${past ? 'text-[#9ca3af]' : 'text-[#616f89]'}`} style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>
                      {milestone.requirements}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {adding && (
          <div className="flex-shrink-0 w-80 border-2 border-dashed border-primary rounded-xl p-4 pt-8 relative bg-[#f9fafb]">
            <div className="absolute -top-4 left-4 size-10 rounded-full bg-[#f0f2f4] border-4 border-white flex items-center justify-center text-[#616f89] shadow-md z-10">
              <span className="text-sm font-bold">{milestones.length + 1}</span>
            </div>
            <div className="space-y-3">
              <input
                className="text-base font-bold bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Milestone Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <div>
                <label className="text-[10px] font-bold text-[#616f89] uppercase tracking-wider block mb-1">
                  Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full text-xs bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#616f89] uppercase tracking-wider block mb-1">
                  Requirements
                </label>
                <textarea
                  className="w-full text-xs bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="What should be delivered?"
                  rows={2}
                  value={editForm.requirements}
                  onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveAdd}
                  disabled={saving || !editForm.name.trim()}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={cancelAdd}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] text-[#111318] text-xs font-medium hover:bg-[#f9fafb]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
