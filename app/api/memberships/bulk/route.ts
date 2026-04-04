import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Membership } from '@/models/Membership';
import { User } from '@/models/User';

export async function POST(req: Request) {
  try {
    const { membershipIds } = await req.json();
    if (!membershipIds || !Array.isArray(membershipIds) || membershipIds.length === 0) {
      return NextResponse.json({ error: "No memberships provided" }, { status: 400 });
    }

    await connectDB();

    // 1. Fetch memberships to find the associated users
    const memberships = await Membership.find({ _id: { $in: membershipIds } });
    const userIds = memberships.map(m => m.user_id);

    // 2. Fetch users to check for photos and delete from PB
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds } });
      const { getPbAdmin } = await import('@/config/pocketbase');
      
      for (const user of users) {
        if (user.photo_url) {
          try {
            const pb = await getPbAdmin();
            const existingRecord = await pb.collection('IDCHECKCARD_user_photos').getFirstListItem(`user_mongo_id="${user._id.toString()}"`);
            if (existingRecord) {
              await pb.collection('IDCHECKCARD_user_photos').delete(existingRecord.id);
            }
          } catch (e: any) {
            console.log(`[PocketBase cleanup] skipped for user ${user._id}:`, e.message);
          }
        }
      }

      // 3. Delete the users physically from DB (Cascade)
      await User.deleteMany({ _id: { $in: userIds } });
    }

    // 4. Finally, delete the memberships
    await Membership.deleteMany({ _id: { $in: membershipIds } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk Memberships Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
