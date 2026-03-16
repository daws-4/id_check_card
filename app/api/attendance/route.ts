import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Reader } from '@/models/Reader';
import { User } from '@/models/User';
import { Membership } from '@/models/Membership';
import { AttendanceLog } from '@/models/AttendanceLog';

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
    // Get beginning of the day (local or UTC based on server, using UTC for simplicity or simple relative time)
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

    // 5. Create AttendanceLog
    const newLog = await AttendanceLog.create({
      user_id,
      organization_id,
      reader_id: reader._id,
      type
    });

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
