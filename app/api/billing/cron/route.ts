import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Invoice } from '@/models/Invoice';
import { Organization } from '@/models/Organization';
import { calculateOrgBilling, getOrCreateBillingConfig } from '@/lib/billing';

export async function POST(req: Request) {
  try {
    // 1. Verificación de Seguridad robusta
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado / Token incorrecto' }, { status: 401 });
    }

    // 2. Establecer el lapso usando Date Math nativo
    // Se ejecuta el día 1 del mes, por ende facturamos el mes calendario *inmediatamente anterior*.
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // Truco: día '0' es el pre-último día del mes actual, que equivale al último día del mes anterior
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    await connectDB();
    const config = await getOrCreateBillingConfig();

    // 3. Buscar solo organizaciones que tengan el plan en 'default' o 'custom'
    const allOrgs = await Organization.find({
      billing_plan: { $in: ['default', 'custom'] }
    }).select('_id').lean();

    if (allOrgs.length === 0) {
      return NextResponse.json({ message: 'No hay organizaciones activas para facturar la mensualidad' }, { status: 200 });
    }

    const orgsToProcess = allOrgs.map(o => o._id.toString());
    const results: any[] = [];
    const errors: any[] = [];

    // 4. Bucle principal de la generadora
    for (const orgId of orgsToProcess) {
      try {
        const existing = await Invoice.findOne({
          organization_id: orgId,
          period_start: { $gte: periodStart },
          period_end: { $lte: periodEnd },
        });

        if (existing) {
          errors.push({ orgId, error: 'Ya existe una factura para este mes' });
          continue;
        }

        // Se usa la utilidad de facturación para hacer el $match con los "Status Activos"
        const preview = await calculateOrgBilling(orgId, config);

        if (preview.active_users_count === 0 && preview.active_readers_count === 0) {
          errors.push({ orgId, error: 'No se factura - 0 usuarios y 0 lectores activos' });
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
      message: `Ciclo Completado: ${results.length} facturas generadas.`,
      period: `${periodStart.toISOString().split('T')[0]} a ${periodEnd.toISOString().split('T')[0]}`,
      invoices: results,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Error del CronJob interno: ' + error.message }, { status: 500 });
  }
}
