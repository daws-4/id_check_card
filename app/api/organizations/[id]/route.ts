import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Organization } from '@/models/Organization';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const organization = await Organization.findById(params.id);
    if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    return NextResponse.json(organization);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, type, settings } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (settings) updateData.settings = settings;

    const updatedOrganization = await Organization.findByIdAndUpdate(params.id, updateData, { new: true });
    if (!updatedOrganization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    return NextResponse.json({ message: 'Organization updated', organization: updatedOrganization });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const deletedOrganization = await Organization.findByIdAndDelete(params.id);
    if (!deletedOrganization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    return NextResponse.json({ message: 'Organization deleted', organization: deletedOrganization });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
