import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Type for disengagement configuration
type DisengagementConfig = {
  weights: {
    deliverablesCompleted: number;
    meetingParticipation: number;
    commitmentFollowThrough: number;
    platformActivity: number;
  };
  thresholds: {
    atRisk: number;
    needsAttention: number;
  };
  commitmentDecay: {
    maxDays: number;
    style: string;
  };
  idleDecay: {
    maxDays: number;
    style: string;
  };
  hardFlagTriggers: {
    noLoginDays: { enabled: boolean; days: number };
    consecutiveLateSubmissions: { enabled: boolean; count: number };
    groupRiskThreshold: { enabled: boolean; percentage: number };
  };
};

// Default configuration if project doesn't have one
const DEFAULT_CONFIG: DisengagementConfig = {
  weights: {
    deliverablesCompleted: 2.5,
    meetingParticipation: 2.5,
    commitmentFollowThrough: 2.5,
    platformActivity: 2.5,
  },
  thresholds: {
    atRisk: 6.5,
    needsAttention: 7.6,
  },
  commitmentDecay: {
    maxDays: 5,
    style: 'balanced',
  },
  idleDecay: {
    maxDays: 7,
    style: 'balanced',
  },
  hardFlagTriggers: {
    noLoginDays: { enabled: true, days: 4 },
    consecutiveLateSubmissions: { enabled: true, count: 2 },
    groupRiskThreshold: { enabled: true, percentage: 50 },
  },
};

// Calculate engagement score for a student using project-specific config
function calculateEngagementScore(
  deliverablesCompleted: number,
  totalDeliverables: number,
  meetingsAttended: number,
  totalMeetings: number,
  lastActiveDate: string | null,
  config: DisengagementConfig
): number {
  // Calculate component scores (0-10 scale)
  const deliverablesScore = totalDeliverables > 0 
    ? (deliverablesCompleted / totalDeliverables) * 10 
    : 10;

  const meetingsScore = totalMeetings > 0 
    ? (meetingsAttended / totalMeetings) * 10 
    : 10;

  // Activity score based on idle days (0-10 scale)
  let activityScore = 0;
  if (lastActiveDate) {
    const now = new Date();
    const lastActive = new Date(lastActiveDate);
    const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    // Linear decay: 0 days = 10, maxDays = 0
    const maxIdleDays = 14; // Could be from config.idleDecay.maxDays
    if (daysSinceActive === 0) activityScore = 10;
    else if (daysSinceActive >= maxIdleDays) activityScore = 0;
    else activityScore = 10 * (1 - (daysSinceActive / maxIdleDays));
  } else {
    activityScore = 0; // No activity data
  }

  // Apply weights from config (weights are already on 0-10 scale, sum to 10)
  const engagementScore = 
    (deliverablesScore * config.weights.deliverablesCompleted) +
    (meetingsScore * config.weights.meetingParticipation) +
    (activityScore * config.weights.platformActivity) +
    (deliverablesScore * config.weights.commitmentFollowThrough * 0); // Commitment is for late submissions, not used here yet
  
  return Math.round(engagementScore * 10) / 10; // Return on 0-10 scale with 1 decimal
}

// Determine risk level based on engagement score and config thresholds
function getRiskLevel(score: number, autoFlags: string[], config: DisengagementConfig): { level: 'healthy' | 'watch' | 'needs-attention'; color: string } {
  // Auto-red flags override score
  if (autoFlags.length > 0) {
    return { level: 'needs-attention', color: '#ef4444' };
  }
  
  // Convert score from 0-100 scale to 0-10 scale to match thresholds
  const scoreOn10Scale = score / 10;
  
  // Use project-specific thresholds (on 0-10 scale)
  if (scoreOn10Scale >= config.thresholds.needsAttention) return { level: 'healthy', color: '#22c55e' };
  if (scoreOn10Scale >= config.thresholds.atRisk) return { level: 'watch', color: '#f97316' };
  return { level: 'needs-attention', color: '#ef4444' };
}

// Generate reasons for risk
function generateReasons(
  deliverablesPercentage: number,
  missedMeetings: number,
  daysIdle: number,
  projectDueInDays: number | null,
  config: DisengagementConfig,
  totalDeliverables: number,
  totalMeetings: number
): string[] {
  const reasons: string[] = [];
  
  // Only flag deliverables if there are actually deliverables assigned
  if (totalDeliverables > 0) {
    if (deliverablesPercentage < 30 && projectDueInDays !== null && projectDueInDays <= 7) {
      reasons.push(`${deliverablesPercentage}% of assigned deliverables completed (below expected progress)`);
    } else if (deliverablesPercentage < 50 && totalDeliverables >= 2) {
      reasons.push(`${deliverablesPercentage}% of assigned deliverables completed`);
    }
  }
  
  // Only flag missed meetings if there are actually meetings scheduled
  if (totalMeetings > 0 && missedMeetings >= 2) {
    reasons.push(`Missed ${missedMeetings} meetings`);
  }
  
  if (daysIdle > config.idleDecay.maxDays) {
    reasons.push(`Idle for ${daysIdle} days`);
  }
  
  return reasons;
}

// Get auto-red flags based on config
function getAutoRedFlags(
  daysIdle: number,
  deliverablesPercentage: number,
  projectDueInDays: number | null,
  config: DisengagementConfig
): string[] {
  const flags: string[] = [];
  
  // Check no login trigger
  if (config.hardFlagTriggers.noLoginDays.enabled && daysIdle >= config.hardFlagTriggers.noLoginDays.days) {
    flags.push(`no_login_${config.hardFlagTriggers.noLoginDays.days}_days`);
  }
  
  // Check low deliverables near deadline (simplified - would need late submission tracking for full implementation)
  if (config.hardFlagTriggers.consecutiveLateSubmissions.enabled && deliverablesPercentage < 30 && projectDueInDays !== null && projectDueInDays <= 7) {
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

    // Get all projects for these classes with disengagement config
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, class_id, due_date, disengagement_config")
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

    // **OPTIMIZATION: Batch fetch all deliverables for all groups at once**
    const { data: allDeliverables } = await supabase
      .from("deliverables")
      .select("id, status, assigned_to, group_id")
      .in("group_id", groupIds);

    console.log('[Engagement API] Deliverables found:', allDeliverables?.length || 0);

    // **OPTIMIZATION: Batch fetch all meetings for all groups at once**
    const { data: allMeetings } = await supabase
      .from("meetings")
      .select("id, group_id, date, attendees")
      .in("group_id", groupIds);

    console.log('[Engagement API] Meetings found:', allMeetings?.length || 0);

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

        // **OPTIMIZED: Get deliverables from cached data instead of querying**
        const deliverables = (allDeliverables || []).filter(d => 
          d.group_id === group.id && d.assigned_to === user.id
        );

        const totalDeliverables = deliverables.length;
        const completedDeliverables = deliverables.filter(d => d.status === 'submitted' || d.status === 'finalized').length;
        const deliverablesPercentage = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

        // **OPTIMIZED: Get meetings from cached data instead of querying**
        const meetings = (allMeetings || []).filter(m => m.group_id === group.id);

        const totalMeetings = meetings.length;
        const attendedMeetings = meetings.filter(m => {
          const attendees = m.attendees as any[] || [];
          return attendees.some(a => a.user_id === user.id || a.email === user.email);
        }).length;
        const missedMeetings = totalMeetings - attendedMeetings;

        // Calculate days idle
        const lastActive = user.last_active;
        const daysIdle = lastActive 
          ? Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Parse project's disengagement config
        let projectConfig: DisengagementConfig = DEFAULT_CONFIG;
        if (project.disengagement_config) {
          try {
            projectConfig = typeof project.disengagement_config === 'string' 
              ? JSON.parse(project.disengagement_config)
              : project.disengagement_config;
            
            // Ensure thresholds are numbers, not strings
            projectConfig.thresholds.atRisk = Number(projectConfig.thresholds.atRisk);
            projectConfig.thresholds.needsAttention = Number(projectConfig.thresholds.needsAttention);
          } catch (e) {
            console.error('[Engagement API] Failed to parse disengagement_config for project:', project.id, e);
          }
        }

        // Get auto-red flags using project config
        const autoFlags = getAutoRedFlags(daysIdle, deliverablesPercentage, projectDueInDays, projectConfig);

        // Calculate engagement score using project config
        const engagementScore = calculateEngagementScore(
          completedDeliverables,
          totalDeliverables,
          attendedMeetings,
          totalMeetings,
          lastActive,
          projectConfig
        );

        groupScores.push(engagementScore);

        // Get risk level using project config
        const risk = getRiskLevel(engagementScore, autoFlags, projectConfig);

        // Generate reasons
        const reasons = generateReasons(deliverablesPercentage, missedMeetings, daysIdle, projectDueInDays, projectConfig, totalDeliverables, totalMeetings);

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

      // Parse project config for group risk threshold
      let projectConfig: DisengagementConfig = DEFAULT_CONFIG;
      if (project.disengagement_config) {
        try {
          projectConfig = typeof project.disengagement_config === 'string' 
            ? JSON.parse(project.disengagement_config)
            : project.disengagement_config;
        } catch (e) {
          console.error('[Engagement API] Failed to parse disengagement_config for project:', project.id);
        }
      }

      // Calculate group engagement
      const avgGroupEngagement = groupScores.length > 0 
        ? Math.round((groupScores.reduce((a, b) => a + b, 0) / groupScores.length) * 10) / 10
        : 0;

      const atRiskStudents = members.filter(member => {
        const user = usersMap[member.user_id];
        const studentData = studentEngagementData.find(s => s.userId === user?.id && s.groupId === group.id);
        return studentData && studentData.riskLevel === 'needs-attention';
      }).length;

      // Group is at risk based on config threshold
      const atRiskPercentage = members.length > 0 ? (atRiskStudents / members.length) * 100 : 0;
      const groupAtRisk = projectConfig.hardFlagTriggers.groupRiskThreshold.enabled 
        && atRiskPercentage >= projectConfig.hardFlagTriggers.groupRiskThreshold.percentage;
      const groupRiskLevel = groupAtRisk ? 'needs-attention' 
        : avgGroupEngagement >= projectConfig.thresholds.needsAttention ? 'healthy' 
        : avgGroupEngagement >= projectConfig.thresholds.atRisk ? 'watch'
        : 'needs-attention';

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
        totalStudents: members.length,
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
