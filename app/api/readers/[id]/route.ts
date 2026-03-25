import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Reader } from '@/models/Reader';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const reader = await Reader.findById(id).populate('organization_id', 'name type').populate('group_id', 'name');
    if (!reader) return NextResponse.json({ error: 'Reader not found' }, { status: 404 });
    return NextResponse.json(reader);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { esp32_id, organization_id, location, status, group_id } = body;

    const updateData: any = {};
    if (esp32_id) updateData.esp32_id = esp32_id;
    if (organization_id) updateData.organization_id = organization_id;
    if (location !== undefined) updateData.location = location;
    if (status) updateData.status = status;
    if (group_id !== undefined) updateData.group_id = group_id === "" ? null : group_id;

    const updatedReader = await Reader.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedReader) return NextResponse.json({ error: 'Reader not found' }, { status: 404 });

    return NextResponse.json({ message: 'Reader updated', reader: updatedReader });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedReader = await Reader.findByIdAndDelete(id);
    if (!deletedReader) return NextResponse.json({ error: 'Reader not found' }, { status: 404 });

    return NextResponse.json({ message: 'Reader deleted', reader: deletedReader });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
