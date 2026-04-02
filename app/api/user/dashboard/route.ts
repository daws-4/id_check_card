import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/config/db";
import { Membership } from "@/models/Membership";
import { GroupMembership } from "@/models/GroupMembership";
import { Schedule } from "@/models/Schedule";
import { Task } from "@/models/Task";
import { TaskCompletion } from "@/models/TaskCompletion";
import { AttendanceLog } from "@/models/AttendanceLog";
import { Group } from "@/models/Group";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";

function getWeekday(date: Date): number {
  return date.getDay(); // 0 = Sun, 6 = Sat
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function calculateWorkedMinutes(dayLogs: any[], dailySchedules: any[], enforceStrict: boolean): number {
  let totalMinutes = 0;
  
  if (!enforceStrict) {
    for (let i = 0; i < dayLogs.length; i++) {
      const log = dayLogs[i];
      if (log.type === "entrada" && i + 1 < dayLogs.length && dayLogs[i+1].type === "salida") {
        totalMinutes += (new Date(dayLogs[i+1].timestamp).getTime() - new Date(log.timestamp).getTime()) / 60000;
      }
    }
    return totalMinutes;
  }

  // Strict enforcement: calculate intersections
  const scheduleIntervals: [number, number][] = dailySchedules.map((s: any) => [
    timeToMinutes(s.start_time),
    timeToMinutes(s.end_time)
  ]);
  scheduleIntervals.sort((a, b) => a[0] - b[0]);
  const mergedIntervals: [number, number][] = [];
  if (scheduleIntervals.length > 0) {
    mergedIntervals.push([...scheduleIntervals[0]]);
    for (let i = 1; i < scheduleIntervals.length; i++) {
      const current = scheduleIntervals[i];
      const last = mergedIntervals[mergedIntervals.length - 1];
      if (current[0] <= last[1]) {
        last[1] = Math.max(last[1], current[1]);
      } else {
        mergedIntervals.push([...current]);
      }
    }
  }

  for (let i = 0; i < dayLogs.length; i++) {
    if (dayLogs[i].type === "entrada" && i + 1 < dayLogs.length && dayLogs[i+1].type === "salida") {
      const entryTime = new Date(dayLogs[i].timestamp);
      const exitTime = new Date(dayLogs[i+1].timestamp);
      
      const entryMin = entryTime.getHours() * 60 + entryTime.getMinutes();
      let exitMin = exitTime.getHours() * 60 + exitTime.getMinutes();
      if (exitTime.getDate() !== entryTime.getDate()) exitMin = 1440; // cap at midnight
      
      let intersectMinutes = 0;
      for (const interval of mergedIntervals) {
        const overlapStart = Math.max(entryMin, interval[0]);
        const overlapEnd = Math.min(exitMin, interval[1]);
        if (overlapEnd > overlapStart) intersectMinutes += (overlapEnd - overlapStart);
      }
      totalMinutes += intersectMinutes;
    }
  }
  return totalMinutes;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    await connectDB();

    const userDoc = await User.findById(userId);
    const userType = userDoc?.user_type || 'worker';

    // Prevent Next.js from treeshaking unused models needed for .populate()
    void Organization;
    void Group;

    // 1. Get memberships and organizations
    const memberships = await Membership.find({ user_id: userId }).populate("organization_id");
    const orgIds = memberships.map((m: any) => m.organization_id._id);
    const organizations = memberships.map((m: any) => ({
      _id: m.organization_id._id,
      name: m.organization_id.name,
      type: m.organization_id.type,
    }));

    // 2. Get group memberships
    const groupMemberships = await GroupMembership.find({ user_id: userId });
    const groupIds = groupMemberships.map((gm: any) => gm.group_id);
    const groups = await Group.find({ _id: { $in: groupIds } });

    // 3. Today's schedules
    const now = new Date();
    const todayWeekday = getWeekday(now);
    const allSchedules = await Schedule.find({ group_id: { $in: groupIds } });
    const todaySchedules = allSchedules.filter((s: any) =>
      s.days_of_week.includes(todayWeekday)
    );

    // 4. Pending tasks (not completed by this user)
    const allTasks = await Task.find({ group_id: { $in: groupIds } });
    const taskIds = allTasks.map((t: any) => t._id);
    const completions = await TaskCompletion.find({
      task_id: { $in: taskIds },
      user_id: userId,
    });
    const completedTaskIds = new Set(completions.map((c: any) => c.task_id.toString()));

    const pendingTasks = allTasks.filter(
      (t: any) => !completedTaskIds.has(t._id.toString())
    );
    const completedTasks = allTasks.filter(
      (t: any) => completedTaskIds.has(t._id.toString())
    );

    // 5. Recent attendance logs
    const recentLogs = await AttendanceLog.find({
      user_id: userId,
      organization_id: { $in: orgIds },
    })
      .populate("organization_id", "name")
      .populate("reader_id", "location esp32_id")
      .sort({ timestamp: -1 })
      .limit(10);

    // 6. Calculate metrics
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayLogs = await AttendanceLog.find({
      user_id: userId,
      organization_id: { $in: orgIds },
      timestamp: { $gte: todayStart },
    }).sort({ timestamp: 1 });

    // Schedule compliance for today
    let schedulesComplied = 0;
    for (const schedule of todaySchedules) {
      const scheduleStart = timeToMinutes(schedule.start_time);
      // Check if there's an entrada within ±15 min of schedule start
      const hasEntry = todayLogs.some((log: any) => {
        if (log.type !== "entrada") return false;
        const logMin = minutesSinceMidnight(new Date(log.timestamp));
        return Math.abs(logMin - scheduleStart) <= 15;
      });
      if (hasEntry) schedulesComplied++;
    }
    const scheduleCompliance =
      todaySchedules.length > 0
        ? Math.round((schedulesComplied / todaySchedules.length) * 100)
        : 100;

    // Calculate EXPECTED minutes today from schedule durations
    let expectedMinutesToday = 0;
    for (const schedule of todaySchedules) {
      const startMin = timeToMinutes(schedule.start_time);
      const endMin = timeToMinutes(schedule.end_time);
      if (endMin > startMin) {
        expectedMinutesToday += endMin - startMin;
      }
    }

    // Total hours worked today (sum of entrada-salida pairs, intersected if strict)
    let totalMinutesWorked = calculateWorkedMinutes(todayLogs, todaySchedules, userDoc?.strict_schedule_enforcement || false);
    let lateArrivals = 0;
    let totalLateMinutes = 0;

    for (let i = 0; i < todayLogs.length; i++) {
      const log = todayLogs[i] as any;
      // Track late arrivals
      if (log.status === "late" && log.type === "entrada") {
        lateArrivals++;
        totalLateMinutes += Math.abs(log.time_variance_minutes || 0);
      }
    }

    // Calculate net overtime and deficit based on expected vs actual
    // Overtime only counts when actual hours EXCEED expected hours
    // If someone enters late but exits late → compensated → no overtime
    const netOvertimeMinutes = expectedMinutesToday > 0
      ? Math.max(0, Math.round(totalMinutesWorked - expectedMinutesToday))
      : 0;
    const hoursDeficit = expectedMinutesToday > 0
      ? Math.max(0, Math.round(expectedMinutesToday - totalMinutesWorked))
      : 0;
    const dailyCompliance = expectedMinutesToday > 0
      ? Math.min(100, Math.round((totalMinutesWorked / expectedMinutesToday) * 100))
      : 100;

    // Weekly metrics
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekLogs = await AttendanceLog.find({
      user_id: userId,
      organization_id: { $in: orgIds },
      timestamp: { $gte: weekStart },
    }).sort({ timestamp: 1 });

    // Build daily hours for the week
    const dailyHours: { day: string; minutes: number }[] = [];
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    for (let d = 0; d < 7; d++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(dayStart.getDate() + d);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayLogs = weekLogs.filter(
        (l: any) =>
          new Date(l.timestamp) >= dayStart && new Date(l.timestamp) < dayEnd
      );
      
      const daySchedules = allSchedules.filter((s: any) => s.days_of_week.includes(dayStart.getDay()));
      let dayMinutes = calculateWorkedMinutes(dayLogs, daySchedules, userDoc?.strict_schedule_enforcement || false);

      dailyHours.push({ day: dayNames[d], minutes: Math.round(dayMinutes) });
    }

    // Build daily hours PER ORGANIZATION for the week
    const dailyHoursByOrg: { orgId: string; orgName: string; orgType: string; dailyHours: { day: string; minutes: number }[] }[] = [];
    for (const org of organizations) {
      const orgWeekLogs = weekLogs.filter(
        (l: any) => l.organization_id.toString() === org._id.toString()
      );
      const orgDailyHours: { day: string; minutes: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dayStart = new Date(weekStart);
        dayStart.setDate(dayStart.getDate() + d);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayLogs = orgWeekLogs.filter(
          (l: any) =>
            new Date(l.timestamp) >= dayStart && new Date(l.timestamp) < dayEnd
        );

        // We filter schedules by organization via groupMap later or just allSchedules because we are filtering logs by org already
        const daySchedules = allSchedules.filter((s: any) => s.days_of_week.includes(dayStart.getDay()));
        let dayMinutes = calculateWorkedMinutes(dayLogs, daySchedules, userDoc?.strict_schedule_enforcement || false);

        orgDailyHours.push({ day: dayNames[d], minutes: Math.round(dayMinutes) });
      }
      dailyHoursByOrg.push({
        orgId: org._id.toString(),
        orgName: org.name,
        orgType: org.type,
        dailyHours: orgDailyHours,
      });
    }

    // Weekly late arrivals
    const weeklyLateArrivals = weekLogs.filter(
      (l: any) => l.type === "entrada" && l.status === "late"
    );

    const metrics = {
      scheduleCompliance,
      dailyCompliance,
      totalHoursWorked: +(totalMinutesWorked / 60).toFixed(1),
      expectedMinutesToday,
      overtimeMinutes: netOvertimeMinutes,
      hoursDeficit,
      lateArrivals,
      avgLateMinutes:
        lateArrivals > 0 ? Math.round(totalLateMinutes / lateArrivals) : 0,
      dailyHours,
      dailyHoursByOrg,
      weeklyLateCount: weeklyLateArrivals.length,
      strictScheduleEnforcement: userDoc?.strict_schedule_enforcement || false,
    };

    // 7. Group info mapping for tasks/schedules
    const groupMap: Record<string, any> = {};
    for (const g of groups) {
      const gm = groupMemberships.find(
        (gm: any) => gm.group_id.toString() === (g as any)._id.toString()
      );
      groupMap[(g as any)._id.toString()] = {
        _id: (g as any)._id,
        name: (g as any).name,
        type: (g as any).type,
        organization_id: (g as any).organization_id,
        role: gm?.role || "member",
      };
    }

    return NextResponse.json({
      userType,
      organizations,
      groups: Object.values(groupMap),
      todaySchedules: todaySchedules.map((s: any) => ({
        ...s.toObject(),
        groupName: groupMap[s.group_id.toString()]?.name || "—",
      })),
      pendingTasks: pendingTasks.map((t: any) => ({
        ...t.toObject(),
        groupName: groupMap[t.group_id.toString()]?.name || "—",
        organization_id: groupMap[t.group_id.toString()]?.organization_id || null,
      })),
      completedTasks: completedTasks.map((t: any) => ({
        ...t.toObject(),
        groupName: groupMap[t.group_id.toString()]?.name || "—",
        organization_id: groupMap[t.group_id.toString()]?.organization_id || null,
      })),
      recentLogs,
      metrics,
    });
  } catch (error: any) {
    console.error("User dashboard error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message, stack: error.stack }, { status: 500 });
  }
}
