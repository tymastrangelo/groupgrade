"use client";

import React, { useState } from "react";
import { getMemberColor } from "@/components/GroupMemberColors";

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  status?: string;
  type: "member-update" | "meeting" | "deliverable" | "milestone" | "collaboration-hub";
  memberName?: string;
  color?: string;
  assignedTo?: string;
  pendingTransferFrom?: string;
  pendingTransferTo?: string;
  createdBy?: string;
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
  members?: Array<{ name: string; email: string; id: string }>;
}

export function GroupProjectTimeline({
  events,
  projectStartDate,
  projectDueDate,
  today = new Date().toISOString().split("T")[0],
  members = [],
}: GroupProjectTimelineProps) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  
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

  const toggleFilter = (filter: string) => {
    if (filter === 'all') {
      setSelectedFilters(['all']);
    } else if (filter === 'meetings') {
      setSelectedFilters(prev => {
        const withoutAll = prev.filter(f => f !== 'all');
        if (withoutAll.includes('meetings')) {
          const result = withoutAll.filter(f => f !== 'meetings');
          return result.length === 0 ? ['all'] : result;
        }
        return [...withoutAll, 'meetings'];
      });
    } else {
      // Student filter
      setSelectedFilters(prev => {
        const withoutAll = prev.filter(f => f !== 'all');
        if (withoutAll.includes(filter)) {
          const result = withoutAll.filter(f => f !== filter);
          return result.length === 0 ? ['all'] : result;
        }
        return [...withoutAll, filter];
      });
    }
  };

  const filteredEvents = sortedEvents.filter(event => {
    if (selectedFilters.includes('all')) return true;
    
    if (selectedFilters.includes('meetings') && event.type === 'meeting') return true;
    
    const memberMatch = selectedFilters.some(filter => {
      if (filter === 'meetings' || filter === 'all') return false;
      return event.memberName === filter || event.assignedTo === filter;
    });
    
    return memberMatch;
  });

  // Group events by date to detect multiple items on same date
  const eventsByDate = filteredEvents.reduce((acc, event) => {
    const isFinal = typeof event.title === 'string' && event.title.startsWith('[FINAL]');
    if (isFinal || (finalEventAtDue && event.id === finalEventAtDue.id)) return acc;
    
    const eventDate = new Date(event.date);
    const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <div className="w-full">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <button
          onClick={() => toggleFilter('all')}
          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
            selectedFilters.includes('all')
              ? 'bg-[#8b1f1f] text-white'
              : 'bg-white text-[#616f89] border border-[#e5e7eb] hover:bg-[#f9fafb]'
          }`}
        >
          All Students
        </button>
        <button
          onClick={() => toggleFilter('meetings')}
          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
            selectedFilters.includes('meetings')
              ? 'bg-[#616f89] text-white'
              : 'bg-white text-[#616f89] border border-[#e5e7eb] hover:bg-[#f9fafb]'
          }`}
        >
          Meetings
        </button>
        {members.map(member => {
          const memberColor = getMemberColor(member.name, members);
          const isSelected = selectedFilters.includes(member.name);
          return (
            <button
              key={member.id}
              onClick={() => toggleFilter(member.name)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all`}
              style={{
                backgroundColor: isSelected ? memberColor.hex : 'white',
                color: isSelected ? 'white' : '#616f89',
                border: isSelected ? 'none' : '1px solid #e5e7eb',
              }}
            >
              {getFirstName(member.name)}
            </button>
          );
        })}
      </div>

      <div className="relative w-full py-12">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#8b1f1f] transform -translate-y-1/2"></div>


        <div
          className="absolute flex flex-col items-center pointer-events-none z-40"
          style={{ left: `${todayPosition}%`, top: '0', height: '50%' }}
        >
          <div className="absolute -top-8 bg-[#8b1f1f] text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap">
            TODAY
          </div>
          <div className="w-0.5 bg-[#8b1f1f] mt-6" style={{ height: 'calc(100% - 24px)' }} />
        </div>

        {dueDate && (
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
              <div className="w-6 h-6 rounded-full bg-[#8b1f1f] flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-sm">flag</span>
              </div>
              <div className="absolute top-10 right-0 whitespace-nowrap text-right">
                <span className="text-[10px] font-bold text-[#8b1f1f] block uppercase tracking-widest">
                  {dueDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })} Deadline
                </span>
              </div>
            </div>
          </div>
        )}

        {Object.entries(eventsByDate).map(([dateKey, eventsOnDate]) => {
          const position = calculatePosition(eventsOnDate[0].date);
          const hasMultiple = eventsOnDate.length > 1;
          const isExpanded = expandedDate === dateKey;

          if (!hasMultiple) {
            // Single event - render normally
            const event = eventsOnDate[0];
            const isMeeting = event.type === "meeting";
            const isPending = event.status === 'pending';
            const isSubmitted = event.status === 'submitted';
            const assignedMember = event.assignedTo || event.memberName;
            const eventColor = assignedMember ? getMemberColor(assignedMember, members).hex : "#6b7280";
            const transferFromColor = event.pendingTransferFrom ? getMemberColor(event.pendingTransferFrom, members).hex : "#9ca3af";
            const transferToColor = event.pendingTransferTo ? getMemberColor(event.pendingTransferTo, members).hex : "#6b7280";

            return (
              <div
                key={dateKey}
                className="absolute top-1/2 transform -translate-y-1/2 cursor-pointer group"
                style={{ left: `${position}%`, zIndex: 30 }}
                onClick={(e) => {
                  e.stopPropagation();
                  event.viewButton?.onClick();
                }}
              >
                <div className="relative flex flex-col items-center transform -translate-x-1/2 transition-all duration-200">
                  {isPending && event.pendingTransferFrom && event.pendingTransferTo ? (
                    <div className="relative w-5 h-5">
                      <div className="absolute inset-0 rounded-full border-[3px] border-dashed" style={{ borderColor: transferFromColor }}></div>
                      <div className="absolute inset-1 rounded-full border-[1.5px] border-dashed" style={{ borderColor: transferToColor }}></div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-full transition-all duration-200 group-hover:scale-125 ${isMeeting ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
                      style={{
                        backgroundColor: isSubmitted ? eventColor : 'white',
                        border: isSubmitted ? 'none' : `2px solid ${eventColor}`,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  )}
                </div>
              </div>
            );
          }

          // Multiple events - show black circle with number
          return (
            <div
              key={dateKey}
              className="absolute top-1/2 transform -translate-y-1/2"
              style={{ left: `${position}%`, zIndex: isExpanded ? 50 : 30 }}
            >
              <div className="relative flex flex-col items-center transform -translate-x-1/2">
                {/* Stacked individual dots (shown when expanded) */}
                {isExpanded && (
                  <div className="absolute bottom-full mb-1 flex flex-col-reverse items-center gap-1">
                    {eventsOnDate.map((event) => {
                      const isMeeting = event.type === "meeting";
                      const isPending = event.status === 'pending';
                      const isSubmitted = event.status === 'submitted';
                      const assignedMember = event.assignedTo || event.memberName;
                      const eventColor = assignedMember ? getMemberColor(assignedMember, members).hex : "#6b7280";
                      const transferFromColor = event.pendingTransferFrom ? getMemberColor(event.pendingTransferFrom, members).hex : "#9ca3af";
                      const transferToColor = event.pendingTransferTo ? getMemberColor(event.pendingTransferTo, members).hex : "#6b7280";

                      return (
                        <div
                          key={event.id}
                          className="cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            event.viewButton?.onClick();
                          }}
                        >
                          {isPending && event.pendingTransferFrom && event.pendingTransferTo ? (
                            <div className="relative w-5 h-5">
                              <div className="absolute inset-0 rounded-full border-[3px] border-dashed" style={{ borderColor: transferFromColor }}></div>
                              <div className="absolute inset-1 rounded-full border-[1.5px] border-dashed" style={{ borderColor: transferToColor }}></div>
                            </div>
                          ) : (
                            <div
                              className={`rounded-full transition-all duration-200 group-hover:scale-125 ${isMeeting ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
                              style={{
                                backgroundColor: isSubmitted ? eventColor : 'white',
                                border: isSubmitted ? 'none' : `2px solid ${eventColor}`,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Outlined circle with brand color */}
                <div
                  className="w-5 h-5 rounded-full bg-white flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
                  style={{ 
                    border: '2.5px solid #8b1f1f',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedDate(isExpanded ? null : dateKey);
                  }}
                >
                  <span className="text-[#8b1f1f] text-[10px] font-bold">{eventsOnDate.length}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend - Below Timeline */}
      <div className="flex items-center justify-center gap-6 mt-8 text-xs text-[#616f89] flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-[#616f89] bg-white"></div>
          <span className="uppercase tracking-wide font-medium">Unsubmitted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#616f89]"></div>
          <span className="uppercase tracking-wide font-medium">Submitted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#9ca3af]"></div>
            <div className="absolute inset-1 rounded-full border border-dashed border-[#6b7280]"></div>
          </div>
          <span className="uppercase tracking-wide font-medium">Pending Transfer (Sender to Receiver)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-[#616f89]"></div>
          <span className="uppercase tracking-wide font-medium">Project Path</span>
        </div>
      </div>
    </div>
  );
}
