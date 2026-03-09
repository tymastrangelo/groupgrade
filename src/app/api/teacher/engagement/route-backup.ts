import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Calculate engagement score for a student
function calculateEngagementScore(
  deliverablesCompleted: number,
  totalDeliverables: number,
  meetingsAttended: number,
  totalMeetings: number,
  lastActiveDate: string | null
): number {
  // Deliverables Completed % → 40%
  const deliverablesScore = totalDeliverables > 0 
    ? (deliverablesCompleted / totalDeliverables) * 100 
    : 100;

  // Meetings Attended % → 25%
  const meetingsScore = totalMeetings > 0 
    ? (meetingsAttended / totalMeetings) * 100 
    : 100;

  // Activity Recency → 35%
  let activityScore = 10; // Default: 15+ days
  if (lastActiveDate) {
    const now = new Date();
    const lastActive = new Date(lastActiveDate);
    const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActive <= 3) activityScore = 100;
    else if (daysSinceActive <= 7) activityScore = 70;
    else if (daysSinceActive <= 14) activityScore = 40;
    else activityScore = 10;
  }

  // Weighted average
  const engagementScore = (deliverablesScore * 0.40) + (meetingsScore * 0.25) + (activityScore * 0.35);
  
  return Math.round(engagementScore);
}

// Determine risk level based on engagement score
function getRiskLevel(score: number, autoFlags: string[]): { level: 'healthy' | 'watch' | 'needs-attention'; color: string } {
  // Auto-red flags override score
  if (autoFlags.length > 0) {
    return { level: 'needs-attention', color: '#ef4444' };
  }
  
  if (score >= 75) return { level: 'healthy', color: '#22c55e' };
  if (score >= 50) return { level: 'watch', color: '#f97316' };
  return { level: 'needs-attention', color: '#ef4444' };
}

// Generate reasons for risk
function generateReasons(
  deliverablesPercentage: number,
  missedMeetings: number,
  daysIdle: number,
  projectDueInDays: number | null
): string[] {
  const reasons: string[] = [];
  
  if (deliverablesPercentage < 30 && projectDueInDays !== null && projectDueInDays <= 7) {
    reasons.push(`${deliverablesPercentage}% of assigned deliverables completed (below expected progress)`);
  } else if (deliverablesPercentage < 30) {
    reasons.push(`${deliverablesPercentage}% of assigned deliverables completed`);
  }
  
  if (missedMeetings >= 2) {
    reasons.push(`Missed ${missedMeetings} meetings`);
  }
  
  if (daysIdle > 7) {
    reasons.push(`Idle for ${daysIdle} days`);
  }
  
  return reasons;
}

// Get auto-red flags
function getAutoRedFlags(
  daysIdle: number,
  deliverablesPercentage: number,
  projectDueInDays: number | null
): string[] {
  const flags: string[] = [];
  
  if (daysIdle > 7) {
    flags.push('idle_7_days');
  }
  
  if (deliverablesPercentage < 30 && projectDueInDays !== null && projectDueInDays <= 7) {
    flags.push('low_deliverables_near_deadline');
  }
  
  return flags;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get teacher's user ID
    const { data: teacher } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get all classes taught by this teacher
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name, code")
      .eq("professor_id", teacher.id);

    console.log('[Engagement API] Teacher ID:', teacher.id);
    console.log('[Engagement API] Classes found:', classes?.length || 0);

    if (!classes || classes.length === 0) {
      console.log('[Engagement API] No classes found for teacher');
      return NextResponse.json({ students: [], groups: [] });
    }

    const classIds = classes.map(c => c.id);

    // Get all projects for these classes
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, class_id, due_date")
      .in("class_id", classIds);

    console.log('[Engagement API] Projects found:', projects?.length || 0);

    if (!projects || projects.length === 0) {
      console.log('[Engagement API] No projects found for classes');
      return NextResponse.json({ students: [], groups: [] });
    }

    const projectIds = projects.map(p => p.id);

    // Get all groups for these projects
    const { data: groups } = await supabase
      .from("groups")
      .select("id, name, project_id")
      .in("project_id", projectIds);

    console.log('[Engagement API] Groups found:', groups?.length || 0);

    if (!groups || groups.length === 0) {
      console.log('[Engagement API] No groups found for projects');
      return NextResponse.json({ students: [], groups: [] });
    }

    const groupIds = groups.map(g => g.id);

    // Get all group members
    const { data: groupMembers, error: groupMembersError } = await supabase
      .from("group_members")
      .select("group_id, user_id")
      .in("group_id", groupIds);

    console.log('[Engagement API] Group members found:', groupMembers?.length || 0);
    if (groupMembersError) {
      console.error('[Engagement API] Error fetching group members:', groupMembersError);
    }

    // Get user details separately to avoid join issues
    const userIds = [...new Set((groupMembers || []).map(m => m.user_id))].filter(Boolean);
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email, last_active")
      .in("id", userIds);

    console.log('[Engagement API] Users found:', users?.length || 0);

    // Create a map of user data
    const usersMap: Record<string, any> = {};
    (users || []).forEach(u => {
      usersMap[u.id] = u;
    });

    // Calculate engagement for each student in each group
    const studentEngagementData: any[] = [];
    const groupEngagementData: any[] = [];

    for (const group of groups) {
      const project = projects.find(p => p.id === group.project_id);
      const classInfo = classes.find(c => c.id === project?.class_id);
      
      if (!project || !classInfo) continue;

      const projectDueDate = project.due_date ? new Date(project.due_date) : null;
      const projectDueInDays = projectDueDate 
        ? Math.floor((projectDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      const members = (groupMembers || []).filter(m => m.group_id === group.id);
      const groupScores: number[] = [];

      for (const member of members) {
        const user = usersMap[member.user_id];
        if (!user) {
          console.log('[Engagement API] Skipping member - user not found:', member.user_id);
          continue;
        }

        // Get deliverables for this user in this group
        const { data: deliverables } = await supabase
          .from("deliverables")
          .select("id, status, assigned_to")
          .eq("group_id", group.id)
          .eq("assigned_to", user.id);

        const totalDeliverables = deliverables?.length || 0;
        const completedDeliverables = deliverables?.filter(d => d.status === 'submitted' || d.status === 'finalized').length || 0;
        const deliverablesPercentage = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

        // Get meetings for this group
        const { data: meetings } = await supabase
          .from("meetings")
          .select("id, date, attendees")
          .eq("group_id", group.id);

        const totalMeetings = meetings?.length || 0;
        const attendedMeetings = meetings?.filter(m => {
          const attendees = m.attendees as any[] || [];
          return attendees.some(a => a.user_id === user.id || a.email === user.email);
        }).length || 0;
        const missedMeetings = totalMeetings - attendedMeetings;

        // Calculate days idle
        const lastActive = user.last_active;
        const daysIdle = lastActive 
          ? Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Get auto-red flags
        const autoFlags = getAutoRedFlags(daysIdle, deliverablesPercentage, projectDueInDays);

        // Calculate engagement score
        const engagementScore = calculateEngagementScore(
          completedDeliverables,
          totalDeliverables,
          attendedMeetings,
          totalMeetings,
          lastActive
        );

        groupScores.push(engagementScore);

        // Get risk level
        const risk = getRiskLevel(engagementScore, autoFlags);

        // Generate reasons
        const reasons = generateReasons(deliverablesPercentage, missedMeetings, daysIdle, projectDueInDays);

        studentEngagementData.push({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          classId: classInfo.id,
          className: classInfo.name,
          classCode: classInfo.code,
          projectId: project.id,
          projectName: project.name,
          groupId: group.id,
          groupName: group.name,
          engagementScore,
          riskLevel: risk.level,
          riskColor: risk.color,
          deliverablesCompleted: completedDeliverables,
          totalDeliverables,
          deliverablesPercentage,
          meetingsAttended: attendedMeetings,
          totalMeetings,
          missedMeetings,
          daysIdle,
          lastActive,
          reasons: reasons.join(', '),
          autoFlags
        });
      }

      // Calculate group engagement
      const avgGroupEngagement = groupScores.length > 0 
        ? Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length)
        : 0;

      const atRiskStudents = members.filter(member => {
        const user = usersMap[member.user_id];
        const studentData = studentEngagementData.find(s => s.userId === user?.id && s.groupId === group.id);
        return studentData && studentData.riskLevel === 'needs-attention';
      }).length;

      // Group is at risk if: 2+ students are red OR avg engagement < 60
      const groupAtRisk = atRiskStudents >= 2 || avgGroupEngagement < 60;
      const groupRiskLevel = groupAtRisk ? 'needs-attention' : avgGroupEngagement >= 75 ? 'healthy' : 'watch';

      groupEngagementData.push({
        groupId: group.id,
        groupName: group.name,
        projectId: project.id,
        projectName: project.name,
        classId: classInfo.id,
        className: classInfo.name,
        classCode: classInfo.code,
        avgEngagement: avgGroupEngagement,
        atRiskStudents,
        totalStudents: groupMembers.length,
        riskLevel: groupRiskLevel,
        riskColor: groupRiskLevel === 'healthy' ? '#22c55e' : groupRiskLevel === 'watch' ? '#f97316' : '#ef4444'
      });
    }

    console.log('[Engagement API] Returning data - Students:', studentEngagementData.length, 'Groups:', groupEngagementData.length);

    return NextResponse.json({
      students: studentEngagementData,
      groups: groupEngagementData,
      debug: {
        teacherId: teacher.id,
        classesCount: classes?.length || 0,
        projectsCount: projects?.length || 0,
        groupsCount: groups?.length || 0,
        groupMembersCount: groupMembers?.length || 0,
        classes: classes?.map(c => ({ id: c.id, name: c.name })),
        projects: projects?.map(p => ({ id: p.id, name: p.name, classId: p.class_id })),
        groups: groups?.map(g => ({ id: g.id, name: g.name, projectId: g.project_id }))
      }
    });

  } catch (error: any) {
    console.error("Error in GET /api/teacher/engagement:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
