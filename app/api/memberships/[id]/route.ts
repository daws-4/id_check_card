import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Membership } from '@/models/Membership';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const membership = await Membership.findById(params.id)
      .populate('user_id', 'name email')
      .populate('organization_id', 'name type');
    if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    return NextResponse.json(membership);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: 'Role is required to update' }, { status: 400 });
    }

    const updatedMembership = await Membership.findByIdAndUpdate(params.id, { role }, { new: true });
    if (!updatedMembership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });

    return NextResponse.json({ message: 'Membership updated', membership: updatedMembership });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const deletedMembership = await Membership.findByIdAndDelete(params.id);
    if (!deletedMembership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });

    return NextResponse.json({ message: 'Membership deleted', membership: deletedMembership });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
