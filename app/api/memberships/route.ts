import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Membership } from '@/models/Membership';

export async function GET(req: Request) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const organization_id = url.searchParams.get("organization_id");
    
    const filter = organization_id ? { organization_id } : {};
    
    const memberships = await Membership.find(filter)
      .populate('user_id', 'name email nfc_card_id')
      .populate('organization_id', 'name type');
    return NextResponse.json(memberships);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { user_id, organization_id, role } = body;

    if (!user_id || !organization_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingMembership = await Membership.findOne({ user_id, organization_id });
    if (existingMembership) {
      return NextResponse.json({ error: 'Membership already exists' }, { status: 409 });
    }

    const newMembership = await Membership.create({
      user_id,
      organization_id,
      role: role || 'user'
    });

    return NextResponse.json({ message: 'Membership created', membership: newMembership }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
