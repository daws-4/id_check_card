import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Organization } from '@/models/Organization';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const organization = await Organization.findById(id);
    if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    return NextResponse.json(organization);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { name, type, settings, tax_id, billing_plan, billing_rates } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (tax_id !== undefined) updateData.tax_id = tax_id || null;
    if (settings) updateData.settings = settings;
    if (billing_plan !== undefined) updateData.billing_plan = billing_plan;
    if (billing_rates !== undefined) updateData.billing_rates = billing_rates;

    const updatedOrganization = await Organization.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedOrganization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    return NextResponse.json({ message: 'Organization updated', organization: updatedOrganization });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedOrganization = await Organization.findByIdAndDelete(id);
    if (!deletedOrganization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    return NextResponse.json({ message: 'Organization deleted', organization: deletedOrganization });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
