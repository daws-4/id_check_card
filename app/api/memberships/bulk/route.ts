import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Membership } from '@/models/Membership';

export async function POST(req: Request) {
  try {
    const { membershipIds } = await req.json();
    if (!membershipIds || !Array.isArray(membershipIds) || membershipIds.length === 0) {
      return NextResponse.json({ error: "No memberships provided" }, { status: 400 });
    }

    await connectDB();
    await Membership.deleteMany({ _id: { $in: membershipIds } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk Memberships Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
