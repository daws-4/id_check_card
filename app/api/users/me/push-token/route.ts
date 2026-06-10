import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/config/db';
import { User } from '@/models/User';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { pushToken } = await req.json();

    if (pushToken !== undefined && typeof pushToken !== 'string') {
      return NextResponse.json({ error: 'Invalid pushToken format' }, { status: 400 });
    }

    await connectDB();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      pushToken ? { $set: { push_device_token: pushToken } } : { $unset: { push_device_token: 1 } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: pushToken ? 'Push token registered successfully' : 'Push token unregistered successfully'
    });
  } catch (error: any) {
    console.error('[API/Users/Me/PushToken] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
