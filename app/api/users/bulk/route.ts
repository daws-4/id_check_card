import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';

export async function POST(req: Request) {
  try {
    const { userIds, action } = await req.json();
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "No users provided" }, { status: 400 });
    }

    await connectDB();

    if (action === "assign_card") {
      await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { has_nfc_card: true } }
      );
    } else if (action === "delete") {
      await User.deleteMany({ _id: { $in: userIds } });
    } else if (action === "enable_strict") {
      await User.updateMany({ _id: { $in: userIds } }, { $set: { strict_schedule_enforcement: true } });
    } else if (action === "disable_strict") {
      await User.updateMany({ _id: { $in: userIds } }, { $set: { strict_schedule_enforcement: false } });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk Users Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
