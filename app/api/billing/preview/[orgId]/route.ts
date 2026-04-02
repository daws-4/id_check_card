import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { calculateOrgBilling, getOrCreateBillingConfig } from '@/lib/billing';

// GET — Preview del costo estimado de una organización sin generar factura
export async function GET(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    await connectDB();
    const { orgId } = await params;
    const config = await getOrCreateBillingConfig();
    const preview = await calculateOrgBilling(orgId, config);
    return NextResponse.json(preview);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al calcular preview' }, { status: 500 });
  }
}
