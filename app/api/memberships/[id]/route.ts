import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Membership } from '@/models/Membership';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const membership = await Membership.findById(id)
      .populate('user_id', 'name email')
      .populate('organization_id', 'name type');
    if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    return NextResponse.json(membership);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    
    const updateData: any = {};
    if (body.role !== undefined) updateData.role = body.role;
    if (body.plan_name !== undefined) updateData.plan_name = body.plan_name;
    if (body.plan_status !== undefined) updateData.plan_status = body.plan_status;
    if (body.expiration_date !== undefined) updateData.expiration_date = body.expiration_date;
    if (body.remaining_sessions !== undefined) updateData.remaining_sessions = body.remaining_sessions;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updatedMembership = await Membership.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedMembership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });

    return NextResponse.json({ message: 'Membership updated', membership: updatedMembership });
  } catch (error: any) {
    console.error("PUT MEMBERSHIP ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedMembership = await Membership.findByIdAndDelete(id);
    if (!deletedMembership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });

    return NextResponse.json({ message: 'Membership deleted', membership: deletedMembership });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
