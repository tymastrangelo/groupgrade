'use client';

import { useEffect, useState } from 'react';
import { AddTaskModal, type Project } from './AddTaskModal';
import { tasksCache } from '@/lib/tasksCache';

type TaskStatus = 'todo' | 'in_progress' | 'submitted' | 'done';

interface Task {
  id: string;
  title: string;
  projectName: string;
  projectId: string;
  dueDate?: string | null;
  assignee?: { id: string; name: string; email: string; avatar_url?: string | null } | null;
  status: TaskStatus;
}

const FILTERS: Array<'active' | 'all' | 'completed'> = ['active', 'all', 'completed'];

type TasksWidgetProps = {
  projectId?: string;
  title?: string;
  showAddNewButton?: boolean;
  refreshSignal?: number;
  projects?: Project[];
  usePersonalTasks?: boolean; // Use personal tasks API (/api/user/tasks) instead of project tasks
};

export function TasksWidget({ projectId, title = 'Your Tasks', showAddNewButton = true, refreshSignal, projects = [], usePersonalTasks = false }: TasksWidgetProps) {
  const [activeFilter, setActiveFilter] = useState<'active' | 'all' | 'completed'>('active');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [viewTaskId, setViewTaskId] = useState<string | null>(null);

  const viewedTask = viewTaskId ? tasks.find((t) => t.id === viewTaskId) : null;

  useEffect(() => {
    // Use personal tasks API if specified, otherwise use project-specific or all project tasks
    const url = usePersonalTasks
      ? '/api/user/tasks'
      : projectId
      ? `/api/projects/${projectId}/tasks`
      : '/api/tasks';
    
    // Subscribe to cache updates
    const unsub = tasksCache.subscribe<typeof tasks>(url, (data) => {
      setTasks(data || []);
      setLoading(false);
      setError(null);
    });

    // Fetch with cache (SWr-like: stale-while-revalidate)
    tasksCache
      .fetch<typeof tasks>(url)
      .then((data) => {
        if (data) setTasks(data as any);
      })
      .catch((e) => setError((e as Error).message || 'Failed to load tasks'))
      .finally(() => setLoading(false));

    return () => {
      unsub?.();
    };
  }, [projectId, usePersonalTasks, refreshSignal, taskRefreshKey]);

  const handleTaskToggle = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      const endpoint = usePersonalTasks
        ? `/api/user/tasks/${task.id}`
        : `/api/projects/${task.projectId}/tasks/${task.id}`;
      
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const url = usePersonalTasks
          ? '/api/user/tasks'
          : projectId
          ? `/api/projects/${projectId}/tasks`
          : '/api/tasks';
        tasksCache.mutate(url, (prev: Task[] | undefined): Task[] => {
          const cur: Task[] = prev || tasks;
          return cur.map<Task>((t) => (t.id === task.id ? { ...t, status: newStatus as TaskStatus } : t));
        });
      } else {
        console.error('Failed to update task');
      }
    } catch (e) {
      console.error('Failed to update task:', e);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    
    const task = tasks.find((t) => t.id === deleteTaskId);
    if (!task) return;

    try {
      const endpoint = usePersonalTasks
        ? `/api/user/tasks/${task.id}`
        : `/api/projects/${task.projectId}/tasks/${task.id}`;
      
      const res = await fetch(endpoint, {
        method: 'DELETE',
      });
      if (res.ok) {
        const url = usePersonalTasks
          ? '/api/user/tasks'
          : projectId
          ? `/api/projects/${projectId}/tasks`
          : '/api/tasks';
        tasksCache.mutate(url, (prev: Task[] | undefined): Task[] => {
          const cur: Task[] = prev || tasks;
          return cur.filter((t) => t.id !== deleteTaskId);
        });
        setDeleteTaskId(null);
      } else {
        console.error('Failed to delete task');
      }
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  // Separate completed and incomplete tasks based on filter
  let displayTasks: Task[] = [];
  
  if (activeFilter === 'active') {
    displayTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'submitted');
  } else if (activeFilter === 'completed') {
    displayTasks = tasks.filter((t) => t.status === 'done' || t.status === 'submitted');
  } else {
    // 'all' - show active first, then completed
    const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'submitted');
    const completedTasks = tasks.filter((t) => t.status === 'done' || t.status === 'submitted');
    displayTasks = [...activeTasks, ...completedTasks];
  }

  const formatDue = (value?: string | null) => {
    if (!value) return 'No due date';
    // Extract date part (YYYY-MM-DD) from ISO string to avoid timezone issues
    const dateString = value.split('T')[0];
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-2xl border border-[#f0f2f4] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[#f0f2f4] flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="flex items-center gap-1 bg-[#f0f2f4] p-1 rounded-lg">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                activeFilter === filter
                  ? 'bg-white shadow-sm'
                  : 'text-[#657386] hover:text-[#121417]'
              }`}
            >
              {filter === 'active'
                ? 'Active'
                : filter.charAt(0).toUpperCase() + filter.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-[#657386]">Loading tasks...</div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : displayTasks.length === 0 ? (
        <div className="p-6 text-sm text-[#657386]">No tasks to show.</div>
      ) : (
        <div className="divide-y divide-[#f0f2f4]">
          {displayTasks.map((task) => {
            const isComplete = task.status === 'done' || task.status === 'submitted';
            return (
              <div
                key={task.id}
                onClick={() => setViewTaskId(task.id)}
                className={`p-4 flex items-center gap-4 transition-colors group cursor-pointer ${
                  isComplete ? 'bg-[#f9fafb]' : 'hover:bg-[#fafafa]'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTaskToggle(task);
                  }}
                  type="button"
                  className="flex-shrink-0 transition-all hover:scale-110"
                >
                  {isComplete ? (
                    <div className="size-5 rounded bg-primary border-2 border-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[14px]">check</span>
                    </div>
                  ) : (
                    <div className="size-5 rounded border-2 border-[#f0f2f4] flex items-center justify-center group-hover:border-primary"></div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate transition-all ${
                      isComplete ? 'text-[#a0aec0] line-through' : ''
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className={`text-[11px] truncate transition-all ${
                    isComplete ? 'text-[#d1d5db]' : 'text-[#657386]'
                  }`}>
                    {task.projectName}
                  </p>
                </div>
                <div className={`flex items-center gap-3 shrink-0 transition-all ${isComplete ? 'opacity-50' : ''}`}>
                  {!usePersonalTasks && (task.assignee ? (
                    <div className="flex items-center gap-1 text-xs text-[#657386]">
                      <div
                        className="size-6 rounded-full border-2 border-white bg-cover bg-center"
                        style={{
                          backgroundImage: `url("${
                            task.assignee.avatar_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee.name || 'User')}&background=E5E7EB&color=111827`
                          }")`,
                        }}
                      ></div>
                      <span className={`font-medium ${isComplete ? 'text-[#a0aec0]' : ''}`}>
                        {task.assignee.name || 'Member'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#a0aec0]">Unassigned</span>
                  ))}
                  <span className={`text-xs font-medium ${isComplete ? 'text-[#a0aec0]' : 'text-[#657386]'}`}>
                    {formatDue(task.dueDate)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTaskId(task.id);
                    }}
                    type="button"
                    className="text-[#a0aec0] hover:text-red-600 transition-colors ml-2"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddNewButton && (
        <div className="px-6 py-4 border-t border-[#f0f2f4] flex justify-end">
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-sm text-primary font-semibold hover:underline"
          >
            Add new task
          </button>
          <AddTaskModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onTaskCreated={(newTask) => {
              const currentUrl = usePersonalTasks
                ? '/api/user/tasks'
                : projectId
                ? `/api/projects/${projectId}/tasks`
                : '/api/tasks';
              // Update current list cache immediately
              tasksCache.mutate(currentUrl, (prev: Task[] | undefined) => {
                const cur = prev || tasks;
                return newTask ? [...cur, newTask as Task] : cur;
              });
              // Also update the per-project cache for the task's project
              if (!usePersonalTasks) {
                const pid = (newTask && (newTask.projectId || newTask.project_id)) as string | undefined;
                if (pid) {
                  const projUrl = `/api/projects/${pid}/tasks`;
                  tasksCache.mutate(projUrl, (prev: Task[] | undefined) => {
                    const cur = prev || [];
                    // Avoid duplicate if already in list
                    if (newTask && !cur.find((t) => t.id === newTask.id)) {
                      return [...cur, newTask as Task];
                    }
                    return cur;
                  });
                }
              }
            }}
            projectId={projectId}
            projects={projects}
            isPersonal={usePersonalTasks}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-[#111318] mb-2">Delete Task?</h3>
            <p className="text-sm text-[#616f89] mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTaskId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#111318] font-medium text-sm hover:bg-[#f9fafb] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Task Modal */}
      {viewedTask && (
        <ViewEditTaskModal
          task={viewedTask}
          isOpen={!!viewTaskId}
          onClose={() => setViewTaskId(null)}
          onUpdate={(updatedTask) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
            );
            setViewTaskId(null);
          }}
          onDelete={(taskId) => {
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            setViewTaskId(null);
          }}
        />
      )}
    </div>
  );
}

interface ViewEditTaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

function ViewEditTaskModal({ task, isOpen, onClose, onUpdate, onDelete }: ViewEditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate?.split('T')[0] || '');
  const [status, setStatus] = useState(task.status || 'todo');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(task.title);
      setDueDate(task.dueDate?.split('T')[0] || '');
      setStatus(task.status || 'todo');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, task]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          dueDate: dueDate || null,
          status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdate({ ...task, title: data.task.title, dueDate: data.task.dueDate, status: data.task.status });
        onClose();
      } else {
        console.error('Failed to update task');
      }
    } catch (e) {
      console.error('Error updating task:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/user/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onDelete(task.id);
        onClose();
      } else {
        console.error('Failed to delete task');
      }
    } catch (e) {
      console.error('Error deleting task:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#f0f2f4]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#111318]">Task Details</h2>
            <button
              onClick={onClose}
              className="text-[#657386] hover:text-[#111318] transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Task title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111318] mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111318] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            {task.projectName && (
              <div>
                <label className="block text-sm font-medium text-[#111318] mb-1">
                  Project
                </label>
                <p className="text-sm text-[#657386] bg-[#f9fafb] px-3 py-2 rounded-lg">
                  {task.projectName}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 flex gap-3">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete
          </button>
          <div className="flex-1"></div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#657386] hover:bg-[#f9fafb] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation in Edit Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-[#111318] mb-2">Delete Task?</h3>
            <p className="text-sm text-[#616f89] mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#111318] font-medium text-sm hover:bg-[#f9fafb] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
