'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface Project {
  id: string;
  name: string;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (task: any) => void;
  projectId?: string;
  projects?: Project[];
  isPersonal?: boolean; // If true, creates a personal task without requiring a project
}

export function AddTaskModal({ isOpen, onClose, onTaskCreated, projectId, projects = [], isPersonal = false }: AddTaskModalProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setError(null);
      if (projectId) {
        setSelectedProjectId(projectId);
      } else if (projects.length > 0) {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [isOpen, projectId, projects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    // For non-personal tasks, project is required
    if (!isPersonal && !selectedProjectId) {
      setError('Project is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      const body: any = {
        title: title.trim(),
        dueDate: dueDate || null,
      };

      if (isPersonal) {
        // Personal tasks go to /api/user/tasks
        endpoint = '/api/user/tasks';
        body.status = 'todo';
      } else {
        // Project tasks go to /api/projects/{projectId}/tasks
        endpoint = `/api/projects/${selectedProjectId}/tasks`;
        body.description = description.trim() || null;
        body.priority = priority;
        body.due_date = dueDate || null;
        body.assigneeId = session?.user?.id || null;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to create task');
      }
      const data = await res.json().catch(() => null);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      
      // Handle different response formats
      const task = data?.task || data?.created || data?.newTask || data;
      if (task) {
        onTaskCreated?.(task);
      } else {
        onTaskCreated?.(null);
      }
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h2 className="text-lg font-bold text-[#111318]">Add New Task</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[#616f89] hover:text-[#111318] text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#111318] mb-2">
              Task Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>

          {/* Project Selection (only if not personal and no projectId provided) */}
          {!isPersonal && !projectId && projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Project <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description (only for project tasks) */}
          {!isPersonal && (
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add task details (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                disabled={loading}
              />
            </div>
          )}

          {/* Priority (only for project tasks) */}
          {!isPersonal && (
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          )}

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-[#111318] mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#e5e7eb]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#111318] font-medium text-sm hover:bg-[#f9fafb] transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
