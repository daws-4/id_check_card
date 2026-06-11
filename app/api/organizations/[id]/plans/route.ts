import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { MembershipPlan } from '@/models/MembershipPlan';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: organizationId } = await params;

    const plans = await MembershipPlan.find({ organization_id: organizationId });
    return NextResponse.json(plans);
  } catch (error: any) {
    console.error('GET MembershipPlans Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: organizationId } = await params;
    const body = await req.json();

    const { name, billing_cycle, price, currency, sessions_limit, discounts } = body;

    if (!name || !billing_cycle || price === undefined) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const newPlan = await MembershipPlan.create({
      organization_id: organizationId,
      name,
      billing_cycle,
      price,
      currency: currency || 'USD',
      sessions_limit,
      discounts: discounts || []
    });

    return NextResponse.json({ message: 'Plan creado con éxito', plan: newPlan }, { status: 201 });
  } catch (error: any) {
    console.error('POST MembershipPlan Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
