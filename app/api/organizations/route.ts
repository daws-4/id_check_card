import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Organization } from '@/models/Organization';

export async function GET(req: Request) {
  try {
    await connectDB();
    const organizations = await Organization.find({});
    return NextResponse.json(organizations);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, type, settings, tax_id, billing_plan, billing_rates } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newOrganization = await Organization.create({
      name,
      type,
      tax_id: tax_id || undefined,
      settings: settings || {},
      billing_plan: billing_plan || 'none',
      billing_rates: billing_rates || undefined
    });

    return NextResponse.json({ message: 'Organization created', organization: newOrganization }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
