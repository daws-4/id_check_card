import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Reader } from '@/models/Reader';
import { User } from '@/models/User';
import { Membership } from '@/models/Membership';
import { AttendanceLog } from '@/models/AttendanceLog';
import { GroupMembership } from '@/models/GroupMembership';
import { Schedule } from '@/models/Schedule';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const organization_id = url.searchParams.get("organization_id");
    
    const filter = organization_id ? { organization_id } : {};
    
    const logs = await AttendanceLog.find(filter)
      .populate('user_id', 'name email nfc_card_id')
      .populate('reader_id', 'location esp32_id')
      .sort({ timestamp: -1 })
      .limit(100);

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { card_id, esp32_id } = body;

    if (!card_id || !esp32_id) {
      return NextResponse.json(
        { error: 'Missing card_id or esp32_id' },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Find Reader
    const reader = await Reader.findOne({ esp32_id });
    if (!reader) {
      return NextResponse.json(
        { error: 'Reader not found or unauthorized' },
        { status: 404 }
      );
    }

    if (reader.status !== 'active') {
      return NextResponse.json(
        { error: 'Reader is not active' },
        { status: 403 }
      );
    }

    const organization_id = reader.organization_id;

    // 2. Find User
    const user = await User.findOne({ nfc_card_id: card_id });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found for this card' },
        { status: 404 }
      );
    }

    const user_id = user._id;

    // 3. Verify Membership
    const membership = await Membership.findOne({ user_id, organization_id });
    if (!membership) {
      return NextResponse.json(
        { error: 'User does not belong to this organization' },
        { status: 403 }
      );
    }

    // 4. Determine Entry or Exit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const lastLog = await AttendanceLog.findOne({
      user_id,
      organization_id,
      timestamp: { $gte: todayStart }
    }).sort({ timestamp: -1 });

    let type: 'entrada' | 'salida' = 'entrada';
    if (lastLog && lastLog.type === 'entrada') {
      type = 'salida';
    }

    // 5. Calculate compliance status based on schedules
    let status: 'on_time' | 'late' | 'early_leave' | 'overtime' | 'out_of_schedule' | undefined;
    let time_variance_minutes: number | undefined;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todayWeekday = now.getDay(); // 0 = Sun, 6 = Sat

    // Find user's groups for this org
    const userGroupMemberships = await GroupMembership.find({ user_id });
    const userGroupIds = userGroupMemberships.map((gm: any) => gm.group_id);

    // Find active schedules for today
    const todaySchedules = await Schedule.find({
      group_id: { $in: userGroupIds },
      days_of_week: todayWeekday,
    });

    if (todaySchedules.length > 0) {
      if (type === 'entrada') {
        // Find the closest schedule start_time
        let closestSchedule = todaySchedules[0];
        let closestDiff = Math.abs(nowMinutes - timeToMinutes(closestSchedule.start_time));

        for (const s of todaySchedules) {
          const diff = Math.abs(nowMinutes - timeToMinutes(s.start_time));
          if (diff < closestDiff) {
            closestDiff = diff;
            closestSchedule = s;
          }
        }

        const scheduleStartMin = timeToMinutes(closestSchedule.start_time);
        const variance = nowMinutes - scheduleStartMin; // positive = late

        if (Math.abs(closestDiff) > 60) {
          status = 'out_of_schedule';
        } else {
          time_variance_minutes = variance;
          status = variance <= 5 ? 'on_time' : 'late'; // 5 min grace period
        }
      } else {
        // salida: find the closest schedule end_time
        let closestSchedule = todaySchedules[0];
        let closestDiff = Math.abs(nowMinutes - timeToMinutes(closestSchedule.end_time));

        for (const s of todaySchedules) {
          const diff = Math.abs(nowMinutes - timeToMinutes(s.end_time));
          if (diff < closestDiff) {
            closestDiff = diff;
            closestSchedule = s;
          }
        }

        const scheduleEndMin = timeToMinutes(closestSchedule.end_time);
        const variance = nowMinutes - scheduleEndMin; // positive = overtime

        if (Math.abs(closestDiff) > 60) {
          status = 'out_of_schedule';
        } else {
          time_variance_minutes = variance;
          if (variance > 5) {
            status = 'overtime';
          } else if (variance < -5) {
            status = 'early_leave';
          } else {
            status = 'on_time';
          }
        }
      }
    }

    // 6. Create AttendanceLog
    const logData: any = {
      user_id,
      organization_id,
      reader_id: reader._id,
      type,
    };

    if (status) logData.status = status;
    if (time_variance_minutes !== undefined) logData.time_variance_minutes = time_variance_minutes;

    const newLog = await AttendanceLog.create(logData);

    // 7. Fire notification webhook (fire-and-forget, don't block ESP32 response)
    try {
      const baseUrl = req.headers.get('host') ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}` : '';
      if (baseUrl) {
        fetch(`${baseUrl}/api/webhooks/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user_id.toString(),
            organization_id: organization_id.toString(),
            event_type: type,
            timestamp: newLog.timestamp || new Date().toISOString(),
            status: status || undefined,
            time_variance_minutes: time_variance_minutes ?? undefined,
          }),
        }).catch((notifErr: any) => {
          console.error('[Attendance] Notification dispatch failed (non-blocking):', notifErr.message);
        });
      }
    } catch (notifError) {
      // Notifications are best-effort; never fail the attendance log
      console.error('[Attendance] Notification setup error:', notifError);
    }

    return NextResponse.json(
      { 
        message: 'Attendance logged successfully', 
        log: newLog 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Attendance API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
