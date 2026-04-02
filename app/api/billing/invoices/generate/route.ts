import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Invoice } from '@/models/Invoice';
import { Organization } from '@/models/Organization';
import { calculateOrgBilling, getOrCreateBillingConfig } from '@/lib/billing';

// POST — Generar facturas para una o todas las organizaciones
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { organization_id, period_start, period_end } = body;

    if (!period_start || !period_end) {
      return NextResponse.json({ error: 'Se requieren period_start y period_end' }, { status: 400 });
    }

    const config = await getOrCreateBillingConfig();
    const periodStart = new Date(period_start);
    const periodEnd = new Date(period_end);

    let orgsToProcess: string[] = [];

    if (organization_id) {
      // Generar solo para una organización
      orgsToProcess = [organization_id];
    } else {
      // Generar para todas las organizaciones con facturación activa
      const allOrgs = await Organization.find({
        billing_plan: { $in: ['default', 'custom'] }
      }).select('_id').lean();
      orgsToProcess = allOrgs.map(o => o._id.toString());
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const orgId of orgsToProcess) {
      try {
        // Verificar si ya existe una factura para este periodo y organización
        const existing = await Invoice.findOne({
          organization_id: orgId,
          period_start: periodStart,
          period_end: periodEnd,
        });

        if (existing) {
          errors.push({ orgId, error: 'Ya existe una factura para este periodo' });
          continue;
        }

        const preview = await calculateOrgBilling(orgId, config);

        // Solo crear factura si hay al menos un usuario o reader activo
        if (preview.active_users_count === 0 && preview.active_readers_count === 0) {
          errors.push({ orgId, error: 'Sin usuarios ni lectores activos' });
          continue;
        }

        const invoice = await Invoice.create({
          organization_id: orgId,
          period_start: periodStart,
          period_end: periodEnd,
          active_users_count: preview.active_users_count,
          active_readers_count: preview.active_readers_count,
          cost_per_user_at_billing: preview.cost_per_user,
          cost_per_reader_at_billing: preview.cost_per_reader,
          subtotal_users: preview.subtotal_users,
          subtotal_readers: preview.subtotal_readers,
          total_amount: preview.total,
          currency: preview.currency,
          status: 'pending',
        });

        results.push(invoice);
      } catch (err: any) {
        errors.push({ orgId, error: err.message });
      }
    }

    return NextResponse.json({
      message: `${results.length} factura(s) generada(s)`,
      invoices: results,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al generar facturas' }, { status: 500 });
  }
}
