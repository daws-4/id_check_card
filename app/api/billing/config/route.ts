import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { BillingConfig } from '@/models/BillingConfig';
import { getOrCreateBillingConfig } from '@/lib/billing';

// GET — Obtener configuración de tarifas actual
export async function GET() {
  try {
    await connectDB();
    const config = await getOrCreateBillingConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al obtener configuración de facturación' }, { status: 500 });
  }
}

// PUT — Actualizar tarifas (solo superadmin)
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      default_cost_per_active_user,
      default_cost_per_active_reader,
      rate_overrides,
      currency,
      billing_cycle,
      notes,
    } = body;

    const config = await getOrCreateBillingConfig();

    if (default_cost_per_active_user !== undefined) config.default_cost_per_active_user = default_cost_per_active_user;
    if (default_cost_per_active_reader !== undefined) config.default_cost_per_active_reader = default_cost_per_active_reader;
    if (rate_overrides !== undefined) config.rate_overrides = rate_overrides;
    if (currency !== undefined) config.currency = currency;
    if (billing_cycle !== undefined) config.billing_cycle = billing_cycle;
    if (notes !== undefined) config.notes = notes;

    await config.save();

    return NextResponse.json({ message: 'Configuración actualizada', config });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
