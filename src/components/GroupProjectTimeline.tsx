"use client";

import React from "react";
import { getMemberColor } from "@/components/GroupMemberColors";

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  status?: string;
  type: "member-update" | "meeting" | "deliverable" | "milestone";
  memberName?: string;
  color?: string;
  viewButton?: {
    label: string;
    onClick: () => void;
  };
}

interface GroupProjectTimelineProps {
  events: TimelineEvent[];
  projectStartDate?: string;
  projectDueDate?: string;
  today?: string;
}

export function GroupProjectTimeline({
  events,
  projectStartDate,
  projectDueDate,
  today = new Date().toISOString().split("T")[0],
}: GroupProjectTimelineProps) {
  const parseDate = (dateStr: string) => new Date(dateStr);
  const startDate = projectStartDate ? parseDate(projectStartDate) : null;
  const dueDate = projectDueDate ? parseDate(projectDueDate) : null;
  const todayDate = parseDate(today);

  const calculatePosition = (date: string): number => {
    const eventDate = parseDate(date);
    if (!startDate || !dueDate) {
      const allDates = events.map(e => parseDate(e.date));
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      const range = maxDate.getTime() - minDate.getTime();
      if (range === 0) return 50; // center if all dates identical
      const offset = eventDate.getTime() - minDate.getTime();
      return (offset / range) * 100;
    }

    const range = dueDate.getTime() - startDate.getTime();
    if (range === 0) return 50;
    const offset = eventDate.getTime() - startDate.getTime();
    return Math.max(0, Math.min(100, (offset / range) * 100));
  };

  const todayPosition = calculatePosition(today);
  const isEventInPast = (eventDate: string) => parseDate(eventDate) < todayDate;

  const sortedEvents = [...events].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
  );

  // Detect any final deliverable event. Prefer one that falls on the due date, otherwise pick the first final found.
  let finalEventAtDue: TimelineEvent | undefined = undefined;
  const finalEvents = sortedEvents.filter((e) => typeof e.title === 'string' && e.title.startsWith('[FINAL]'));
  if (finalEvents.length > 0) {
    if (dueDate) {
      const match = finalEvents.find((e) => {
        const evDate = parseDate(e.date);
        return evDate.getFullYear() === dueDate.getFullYear() && evDate.getMonth() === dueDate.getMonth() && evDate.getDate() === dueDate.getDate();
      });
      finalEventAtDue = match || finalEvents[0];
    } else {
      finalEventAtDue = finalEvents[0];
    }
  }

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  const formatEventType = (type: string) => {
    return type.split('-').join(' ');
  };

  return (
    <div className="w-full">
      <div className="relative w-full py-12">
        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-100 dark:bg-zinc-800 transform -translate-y-1/2 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{ 
              width: `${todayPosition}%`,
              background: `linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)`
            }}
          />
        </div>

        {startDate && (
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-5">
            <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-zinc-700" />
          </div>
        )}

        <div
          className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-10"
          style={{ left: `${todayPosition}%` }}
        >
          <div className="h-full w-px bg-primary border-r border-dashed border-primary" />
          <div className="absolute -top-6 bg-primary text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm whitespace-nowrap">
            TODAY
          </div>
        </div>

        {dueDate && (
          // If a final event is represented at the due date, make the flag clickable and keyboard-accessible
          <div
            className={`absolute right-0 top-1/2 transform -translate-y-1/2 flex flex-col items-center z-10 ${finalEventAtDue && finalEventAtDue.viewButton ? 'cursor-pointer' : ''}`}
            onClick={(e) => {
              if (finalEventAtDue?.viewButton?.onClick) {
                e.stopPropagation();
                finalEventAtDue.viewButton.onClick();
              }
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && finalEventAtDue?.viewButton?.onClick) {
                e.preventDefault();
                finalEventAtDue.viewButton.onClick();
              }
            }}
            role={finalEventAtDue?.viewButton ? 'button' : undefined}
            tabIndex={finalEventAtDue?.viewButton ? 0 : -1}
          >
            <div className="relative flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center ring-4 ring-primary/20 shadow-lg">
                <span className="material-symbols-outlined text-white text-base">flag</span>
              </div>
              <div className="absolute top-10 right-0 whitespace-nowrap text-right">
                <span className="text-[10px] font-bold text-primary block uppercase tracking-widest">
                  {dueDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-[9px] text-slate-500">{finalEventAtDue ? `Final: ${finalEventAtDue.title.replace('[FINAL] ', '')}` : 'Deadline'}</span>
              </div>
            </div>
          </div>
        )}

        {sortedEvents.map((event) => {
          const isFinal = typeof event.title === 'string' && event.title.startsWith('[FINAL]');
          // Always skip rendering per-event markers for final deliverables; they are represented by the deadline flag
          if (isFinal) return null;
          // If this final event is represented by the project due-date flag, skip rendering a separate marker
          if (finalEventAtDue && event.id === finalEventAtDue.id) return null;
          const position = calculatePosition(event.date);
          const eventColor = event.color || (event.memberName ? getMemberColor(event.memberName).hex : "#8b5cf6");
          const isPast = isEventInPast(event.date);
          const isMeeting = event.type === "meeting";
          const displayName = isMeeting ? "Meeting" : (event.memberName ? getFirstName(event.memberName) : formatEventType(event.type));
          const isPending = event.status === 'pending';

          return (
            <div
              key={event.id}
              className={`timeline-group absolute top-1/2 transform -translate-y-1/2 cursor-pointer ${isPast ? "historical-glow" : ""}`}
              style={{ left: `${position}%`, color: eventColor, zIndex: 30 }}
              onClick={(e) => {
                e.stopPropagation();
                event.viewButton?.onClick();
              }}
            >
                <div className="relative flex flex-col items-center transform -translate-x-1/2 transition-all duration-300">
                <div
                  className={`timeline-marker ${isFinal ? "w-5 h-5" : (isMeeting ? "w-3.5 h-3.5" : "w-4 h-4")} rounded-full shadow-md transition-all duration-300 hover:scale-125 relative z-50`}
                  style={isPending ? {
                    background: 'transparent',
                    border: '2px dashed #f59e0b',
                    width: isFinal ? 40 : (isMeeting ? 14 : 16),
                    height: isFinal ? 40 : (isMeeting ? 14 : 16),
                    borderRadius: '9999px'
                  } : { backgroundColor: isFinal ? '#ef4444' : (isMeeting ? '#6b7280' : eventColor), boxShadow: '0 2px 6px rgba(0,0,0,0.06)'}}
                >
                  {isFinal && (
                    <span className="material-symbols-outlined text-white text-sm">flag</span>
                  )}
                </div>

                <div className="timeline-label absolute top-8 left-1/2 whitespace-nowrap text-center pointer-events-none z-10 max-w-[120px]">
                  {event.memberName ? (
                    <>
                      <span className="text-[10px] font-bold block uppercase tracking-tight truncate" style={{ color: eventColor }}>
                        {getFirstName(event.memberName)}
                      </span>
                      <span className="text-[9px] text-slate-500 block truncate" style={{ color: eventColor }}>
                        {isFinal ? event.title.replace('[FINAL] ', '') : event.title}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold block uppercase tracking-tight truncate" style={{ color: isFinal ? '#ef4444' : eventColor }}>
                        {isFinal ? event.title.replace('[FINAL] ', '') : event.title}
                      </span>
                      <span className="text-[8px] text-slate-400 font-medium">
                        {new Date(event.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
