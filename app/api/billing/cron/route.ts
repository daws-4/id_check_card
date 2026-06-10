import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/config/db';
import { Invoice } from '@/models/Invoice';
import { Organization } from '@/models/Organization';
import { CronLog } from '@/models/CronLog';
import { calculateOrgBilling, getOrCreateBillingConfig } from '@/lib/billing';

async function executeBillingTrigger(req: Request) {
  let logDoc: any = null;
  try {
    // 1. Verificación de Seguridad: Permitir token CRON_SECRET (QA/Scripts) o Sesión de usuario activa
    const session = await getServerSession(authOptions);
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    const isCronSecretValid = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const hasSession = !!session;

    if (!isCronSecretValid && !hasSession) {
      return NextResponse.json({ error: 'No autorizado / Token o Sesión incorrecta' }, { status: 401 });
    }

    // 2. Establecer fecha y validar que sea a partir del día 17 del mes
    const now = new Date();
    const currentDay = now.getDate();
    
    if (currentDay < 17) {
      return NextResponse.json({
        message: 'No es el momento para ejecutar la facturación (debe ser el día 17 de cada mes o posterior).',
        day: currentDay,
        status: 'skipped'
      }, { status: 200 });
    }

    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed (Enero = 0, Diciembre = 11)

    await connectDB();

    // 3. Verificar si ya se ejecutó la facturación de forma exitosa para este mes
    const existingSuccess = await CronLog.findOne({
      taskName: 'billing',
      year,
      month,
      status: 'success'
    });

    if (existingSuccess) {
      return NextResponse.json({
        message: `La facturación para el periodo ${year}-${month + 1} ya fue generada exitosamente.`,
        executedAt: existingSuccess.executedAt,
        status: 'skipped'
      }, { status: 200 });
    }

    // 4. Intentar adquirir el lock de ejecución atómico en la DB
    try {
      logDoc = await CronLog.create({
        taskName: 'billing',
        year,
        month,
        status: 'running',
        executedAt: now
      });
    } catch (err: any) {
      // Si falla por clave duplicada (E11000) debido al índice único
      if (err.code === 11000) {
        return NextResponse.json({
          message: 'La facturación está siendo procesada en paralelo por otra sesión.',
          status: 'skipped'
        }, { status: 200 });
      }
      throw err;
    }

    // 5. Establecer el lapso del mes calendario anterior (del 1 al último día del mes anterior)
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Día 0 del mes actual equivale al último día del mes anterior

    const config = await getOrCreateBillingConfig();

    // 6. Buscar organizaciones con plan activo ('default' o 'custom')
    const allOrgs = await Organization.find({
      billing_plan: { $in: ['default', 'custom'] }
    }).select('_id').lean();

    if (allOrgs.length === 0) {
      logDoc.status = 'success';
      logDoc.details = { message: 'No hay organizaciones activas para facturar.' };
      await logDoc.save();
      return NextResponse.json({ message: 'No hay organizaciones activas para facturar la mensualidad' }, { status: 200 });
    }

    const orgsToProcess = allOrgs.map(o => o._id.toString());
    const results: any[] = [];
    const errors: any[] = [];

    // 7. Bucle principal de facturación
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

    // 8. Actualizar el estado del CronLog a 'success'
    logDoc.status = 'success';
    logDoc.details = {
      message: `Ciclo Completado: ${results.length} facturas generadas.`,
      invoicesCount: results.length,
      errorsCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
    await logDoc.save();

    return NextResponse.json({
      message: `Ciclo Completado: ${results.length} facturas generadas.`,
      period: `${periodStart.toISOString().split('T')[0]} a ${periodEnd.toISOString().split('T')[0]}`,
      invoices: results,
      errors: errors.length > 0 ? errors : undefined,
      status: 'executed'
    }, { status: 201 });

  } catch (error: any) {
    if (logDoc) {
      logDoc.status = 'failed';
      logDoc.details = { error: error.message };
      await logDoc.save();
    }
    return NextResponse.json({ error: 'Error del script de facturación: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return executeBillingTrigger(req);
}

export async function GET(req: Request) {
  return executeBillingTrigger(req);
}

