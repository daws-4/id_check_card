import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Reader } from '@/models/Reader';
import { User } from '@/models/User';
import { Membership } from '@/models/Membership';
import { AttendanceLog } from '@/models/AttendanceLog';
import { GroupMembership } from '@/models/GroupMembership';
import { Schedule } from '@/models/Schedule';

const TAG = '[Attendance API]';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function elapsed(start: number): string {
  return `${(Date.now() - start).toFixed(0)}ms`;
}

export async function GET(req: Request) {
  const reqStart = Date.now();
  console.log(`${TAG} ────── GET START ──────`);
  try {
    const url = new URL(req.url);
    const organization_id = url.searchParams.get("organization_id");
    const user_id = url.searchParams.get("user_id");
    console.log(`${TAG} GET params: organization_id=${organization_id}, user_id=${user_id}`);

    const dbStart = Date.now();
    await connectDB();
    console.log(`${TAG} GET DB connected (${elapsed(dbStart)})`);
    
    const filter: any = {};
    if (organization_id) filter.organization_id = organization_id;
    if (user_id) filter.user_id = user_id;
    console.log(`${TAG} GET filter:`, JSON.stringify(filter));
    
    const queryStart = Date.now();
    const logs = await AttendanceLog.find(filter)
      .populate('user_id', 'name email nfc_card_id')
      .populate('reader_id', 'location esp32_id')
      .sort({ timestamp: -1 })
      .limit(100);
    console.log(`${TAG} GET query completed: ${logs.length} logs found (${elapsed(queryStart)})`);

    console.log(`${TAG} ────── GET END (${elapsed(reqStart)}) 200 ──────`);
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error(`${TAG} ────── GET ERROR (${elapsed(reqStart)}) ──────`);
    console.error(`${TAG} GET Error name: ${error.name}`);
    console.error(`${TAG} GET Error message: ${error.message}`);
    console.error(`${TAG} GET Error stack:`, error.stack);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const reqStart = Date.now();
  console.log(`${TAG} ────── POST START ──────`);
  try {
    // Parse body
    const bodyStart = Date.now();
    const body = await req.json();
    console.log(`${TAG} POST body parsed (${elapsed(bodyStart)}):`, JSON.stringify(body));
    const { card_id, esp32_id } = body;

    if (!card_id || !esp32_id) {
      console.warn(`${TAG} POST 400 — Missing fields: card_id=${card_id}, esp32_id=${esp32_id}`);
      return NextResponse.json(
        { error: 'Missing card_id or esp32_id' },
        { status: 400 }
      );
    }

    // DB Connection
    const dbStart = Date.now();
    await connectDB();
    console.log(`${TAG} POST DB connected (${elapsed(dbStart)})`);

    // 1. Find Reader
    const step1 = Date.now();
    const reader = await Reader.findOne({ esp32_id });
    console.log(`${TAG} [Step 1] Find Reader by esp32_id="${esp32_id}" (${elapsed(step1)}):`, reader ? `found → id=${reader._id}, org=${reader.organization_id}, status=${reader.status}, location=${reader.location}` : 'NOT FOUND');
    if (!reader) {
      console.warn(`${TAG} POST 404 — Reader not found for esp32_id="${esp32_id}"`);
      return NextResponse.json(
        { error: 'Reader not found or unauthorized' },
        { status: 404 }
      );
    }

    if (reader.status !== 'active') {
      console.warn(`${TAG} POST 403 — Reader status="${reader.status}" (not active)`);
      return NextResponse.json(
        { error: 'Reader is not active' },
        { status: 403 }
      );
    }

    const organization_id = reader.organization_id;
    console.log(`${TAG} POST organization_id=${organization_id}`);

    // 2. Find User
    const step2 = Date.now();
    const user = await User.findOne({ nfc_card_id: card_id });
    console.log(`${TAG} [Step 2] Find User by nfc_card_id="${card_id}" (${elapsed(step2)}):`, user ? `found → id=${user._id}, name=${user.name}, email=${user.email}` : 'NOT FOUND');
    if (!user) {
      console.warn(`${TAG} POST 404 — User not found for card_id="${card_id}"`);
      return NextResponse.json(
        { error: 'User not found for this card' },
        { status: 404 }
      );
    }

    const user_id = user._id;

    // 3. Verify Membership
    const step3 = Date.now();
    const membership = await Membership.findOne({ user_id, organization_id });
    console.log(`${TAG} [Step 3] Verify Membership user=${user_id}, org=${organization_id} (${elapsed(step3)}):`, membership ? `found → role=${membership.role}, id=${membership._id}` : 'NOT FOUND');
    if (!membership) {
      console.warn(`${TAG} POST 403 — No membership for user=${user_id} in org=${organization_id}`);
      return NextResponse.json(
        { error: 'User does not belong to this organization' },
        { status: 403 }
      );
    }

    // 4. Determine Entry or Exit
    const step4 = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const lastLog = await AttendanceLog.findOne({
      user_id,
      organization_id,
      timestamp: { $gte: todayStart }
    }).sort({ timestamp: -1 });
    console.log(`${TAG} [Step 4] Last log today (${elapsed(step4)}):`, lastLog ? `type=${lastLog.type}, timestamp=${lastLog.timestamp}, status=${lastLog.status}` : 'NONE (first log today)');

    let type: 'entrada' | 'salida' = 'entrada';
    if (lastLog && lastLog.type === 'entrada') {
      type = 'salida';
    }
    console.log(`${TAG} [Step 4] Determined type="${type}"`);

    // 5. Calculate compliance status based on schedules
    const step5 = Date.now();
    let status: 'on_time' | 'late' | 'early_leave' | 'overtime' | 'out_of_schedule' | undefined;
    let time_variance_minutes: number | undefined;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todayWeekday = now.getDay(); // 0 = Sun, 6 = Sat
    console.log(`${TAG} [Step 5] Now: ${now.toISOString()}, nowMinutes=${nowMinutes}, weekday=${todayWeekday}`);

    // Find user's groups for this org
    const userGroupMemberships = await GroupMembership.find({ user_id });
    const userGroupIds = userGroupMemberships.map((gm: any) => gm.group_id);
    console.log(`${TAG} [Step 5] User group memberships: ${userGroupMemberships.length} found, groupIds=${JSON.stringify(userGroupIds)}`);

    // Find active schedules for today
    const todaySchedules = await Schedule.find({
      group_id: { $in: userGroupIds },
      days_of_week: todayWeekday,
    });
    console.log(`${TAG} [Step 5] Schedules for today: ${todaySchedules.length} found (${elapsed(step5)})`);
    todaySchedules.forEach((s: any, i: number) => {
      console.log(`${TAG} [Step 5]   Schedule[${i}]: group=${s.group_id}, start=${s.start_time}, end=${s.end_time}, days=${s.days_of_week}`);
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

        console.log(`${TAG} [Step 5] Entrada: closestSchedule.start=${closestSchedule.start_time} (${scheduleStartMin}min), variance=${variance}min, closestDiff=${closestDiff}min`);

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

        console.log(`${TAG} [Step 5] Salida: closestSchedule.end=${closestSchedule.end_time} (${scheduleEndMin}min), variance=${variance}min, closestDiff=${closestDiff}min`);

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
    } else {
      console.log(`${TAG} [Step 5] No schedules for today — status will be undefined`);
    }

    console.log(`${TAG} [Step 5] Final: status=${status}, time_variance_minutes=${time_variance_minutes}`);

    // 6. Create AttendanceLog
    const step6 = Date.now();
    const logData: any = {
      user_id,
      organization_id,
      reader_id: reader._id,
      type,
    };

    if (status) logData.status = status;
    if (time_variance_minutes !== undefined) logData.time_variance_minutes = time_variance_minutes;
    console.log(`${TAG} [Step 6] Creating log with data:`, JSON.stringify(logData));

    const newLog = await AttendanceLog.create(logData);
    console.log(`${TAG} [Step 6] Log created (${elapsed(step6)}): id=${newLog._id}, timestamp=${newLog.timestamp}`);

    // 7. Fire notification webhook (fire-and-forget, don't block ESP32 response)
    try {
      const baseUrl = req.headers.get('host') ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}` : '';
      console.log(`${TAG} [Step 7] Notification webhook baseUrl="${baseUrl}"`);
      if (baseUrl) {
        const notifPayload = {
          user_id: user_id.toString(),
          organization_id: organization_id.toString(),
          event_type: type,
          timestamp: newLog.timestamp || new Date().toISOString(),
          status: status || undefined,
          time_variance_minutes: time_variance_minutes ?? undefined,
        };
        console.log(`${TAG} [Step 7] Dispatching notification:`, JSON.stringify(notifPayload));
        fetch(`${baseUrl}/api/webhooks/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notifPayload),
        }).then((res) => {
          console.log(`${TAG} [Step 7] Notification response: status=${res.status}`);
        }).catch((notifErr: any) => {
          console.error(`${TAG} [Step 7] Notification dispatch failed (non-blocking):`, notifErr.message);
        });
      }
    } catch (notifError) {
      // Notifications are best-effort; never fail the attendance log
      console.error(`${TAG} [Step 7] Notification setup error:`, notifError);
    }

    console.log(`${TAG} ────── POST END (${elapsed(reqStart)}) 201 — user=${user.name}, type=${type}, status=${status} ──────`);
    return NextResponse.json(
      { 
        message: 'Attendance logged successfully', 
        log: newLog 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error(`${TAG} ────── POST ERROR (${elapsed(reqStart)}) ──────`);
    console.error(`${TAG} POST Error name: ${error.name}`);
    console.error(`${TAG} POST Error message: ${error.message}`);
    console.error(`${TAG} POST Error stack:`, error.stack);
    if (error.errors) {
      console.error(`${TAG} POST Validation errors:`, JSON.stringify(error.errors, null, 2));
    }
    if (error.code) {
      console.error(`${TAG} POST Error code: ${error.code}`);
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
