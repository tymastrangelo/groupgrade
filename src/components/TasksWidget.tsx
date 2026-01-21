'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  project: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  assignees: { name: string; avatar: string }[];
  status: 'todo' | 'doing' | 'done';
}

export function TasksWidget() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'todo' | 'doing' | 'done'>('all');

  const tasks: Task[] = [
    {
      id: '1',
      title: 'Implement Edmonds-Karp Max Flow algorithm',
      project: 'Advanced Algorithms',
      priority: 'high',
      dueDate: 'Today',
      assignees: [{ name: 'You', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMl6rMthnwJTHXtMiCDmb7QVFwo3sPb3jeWm9b4Rzlh9aMn3gvnoUggZESMGkVTzhibV2aeUiBWGQ65PPCAEDblvFM9XBUQ2QzHBM3OPio7_qbaI36VhG4GHXWKrcKegfCpdllPH5L6-RmcXGIaVke0vqCdi0o7jkIWaCG8Y1aodJg8R3WILh902qtk-yv5tM1Q1S2C7nbzYCZ3s7BM5CmP4XPxYH4RJqRefAuhgz7Fao7dwNecHTMtZG65lFeVY29BI6EP6v4Xb4' }],
      status: 'todo',
    },
    {
      id: '2',
      title: 'Refine color palette for Accessibility (WCAG 2.1)',
      project: 'UI/UX Design Lab',
      priority: 'medium',
      dueDate: 'Tomorrow',
      assignees: [{ name: 'You', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMl6rMthnwJTHXtMiCDmb7QVFwo3sPb3jeWm9b4Rzlh9aMn3gvnoUggZESMGkVTzhibV2aeUiBWGQ65PPCAEDblvFM9XBUQ2QzHBM3OPio7_qbaI36VhG4GHXWKrcKegfCpdllPH5L6-RmcXGIaVke0vqCdi0o7jkIWaCG8Y1aodJg8R3WILh902qtk-yv5tM1Q1S2C7nbzYCZ3s7BM5CmP4XPxYH4RJqRefAuhgz7Fao7dwNecHTMtZG65lFeVY29BI6EP6v4Xb4' }],
      status: 'todo',
    },
    {
      id: '3',
      title: 'Draft project architecture diagram',
      project: 'Advanced Algorithms',
      priority: 'medium',
      dueDate: '2 days ago',
      assignees: [{ name: 'You', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMl6rMthnwJTHXtMiCDmb7QVFwo3sPb3jeWm9b4Rzlh9aMn3gvnoUggZESMGkVTzhibV2aeUiBWGQ65PPCAEDblvFM9XBUQ2QzHBM3OPio7_qbaI36VhG4GHXWKrcKegfCpdllPH5L6-RmcXGIaVke0vqCdi0o7jkIWaCG8Y1aodJg8R3WILh902qtk-yv5tM1Q1S2C7nbzYCZ3s7BM5CmP4XPxYH4RJqRefAuhgz7Fao7dwNecHTMtZG65lFeVY29BI6EP6v4Xb4' }],
      status: 'done',
    },
  ];

  const filteredTasks = activeFilter === 'all' ? tasks : tasks.filter(t => t.status === activeFilter);

  return (
    <div className="bg-white rounded-2xl border border-[#f0f2f4] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[#f0f2f4] flex items-center justify-between">
        <h3 className="text-lg font-bold">Your Tasks</h3>
        <div className="flex items-center gap-1 bg-[#f0f2f4] p-1 rounded-lg">
          {(['all', 'todo', 'doing', 'done'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                activeFilter === filter
                  ? 'bg-white shadow-sm'
                  : 'text-[#657386] hover:text-[#121417]'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-[#f0f2f4]">
        {filteredTasks.map((task) => (
          <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-[#fafafa] transition-colors group cursor-pointer">
            {task.status === 'done' ? (
              <div className="size-5 rounded bg-primary border-2 border-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[14px]">check</span>
              </div>
            ) : (
              <div className="size-5 rounded border-2 border-[#f0f2f4] flex items-center justify-center group-hover:border-primary"></div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${task.status === 'done' ? 'text-[#657386] line-through' : ''}`}>
                {task.title}
              </p>
              <p className="text-[11px] text-[#657386]">{task.project} • Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex -space-x-2">
                {task.assignees.map((assignee) => (
                  <div key={assignee.name} className="size-6 rounded-full border-2 border-white bg-cover" style={{ backgroundImage: `url("${assignee.avatar}")` }}></div>
                ))}
              </div>
              <span className={`text-xs font-medium ${task.status === 'done' ? 'text-[#a0aec0]' : 'text-[#657386]'}`}>
                {task.dueDate}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-[#f0f2f4]/30 text-center">
        <button className="text-xs font-bold text-primary hover:underline">+ Add new task</button>
      </div>
    </div>
  );
}
