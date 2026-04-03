import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/config/db';
import { AttendanceLog } from '@/models/AttendanceLog';
import { User } from '@/models/User';
import { Organization } from '@/models/Organization';
import { Membership } from '@/models/Membership';

const STATUS_LABELS: Record<string, string> = {
  on_time: 'A Tiempo',
  late: 'Retraso',
  early_leave: 'Salida Temprana',
  overtime: 'Tiempo Extra',
  out_of_schedule: 'Fuera de Horario',
};

const STATUS_COLORS: Record<string, string> = {
  on_time: '#10b981',
  late: '#ef4444',
  early_leave: '#f59e0b',
  overtime: '#8b5cf6',
  out_of_schedule: '#6b7280',
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const organization_id = url.searchParams.get('organization_id');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!organization_id) {
      return NextResponse.json({ error: 'organization_id is required' }, { status: 400 });
    }

    await connectDB();

    const org = await Organization.findById(organization_id).select('name type');
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build query filter
    const filter: any = { organization_id };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = toDate;
      }
    }

    const logs = await AttendanceLog.find(filter)
      .populate('user_id', 'name last_name email document_id')
      .populate('reader_id', 'location')
      .sort({ timestamp: -1 })
      .limit(2000);

    // Prevent treeshaking
    void User;
    void Membership;

    // Calculate summary metrics
    const totalEntradas = logs.filter((l: any) => l.type === 'entrada').length;
    const totalSalidas = logs.filter((l: any) => l.type === 'salida').length;
    const onTimeCount = logs.filter((l: any) => l.status === 'on_time').length;
    const lateCount = logs.filter((l: any) => l.status === 'late').length;
    const earlyLeaveCount = logs.filter((l: any) => l.status === 'early_leave').length;

    const puntualidadPercent = totalEntradas > 0
      ? Math.round((onTimeCount / totalEntradas) * 100)
      : 0;

    // Date range label
    const fromLabel = from ? new Date(from).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const toLabel = to ? new Date(to).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Hoy';

    // Build HTML report
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; background: white; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #0d9488; padding-bottom: 20px; }
        .header h1 { font-size: 24px; color: #0d9488; }
        .header .org-name { font-size: 16px; color: #64748b; margin-top: 4px; }
        .header .date-range { font-size: 12px; color: #94a3b8; margin-top: 8px; }
        .header .logo { text-align: right; }
        .header .logo span { font-size: 20px; font-weight: bold; color: #0d9488; }
        .header .logo small { display: block; font-size: 10px; color: #94a3b8; }
        
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
        .metric-value { font-size: 28px; font-weight: 700; }
        .metric-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        .metric-green .metric-value { color: #10b981; }
        .metric-red .metric-value { color: #ef4444; }
        .metric-blue .metric-value { color: #3b82f6; }
        .metric-purple .metric-value { color: #8b5cf6; }

        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        thead th { background: #0f172a; color: white; padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        tbody td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
        .type-entrada { color: #0d9488; font-weight: 600; }
        .type-salida { color: #f59e0b; font-weight: 600; }
        .variance-pos { color: #ef4444; font-weight: 600; }
        .variance-neg { color: #10b981; font-weight: 600; }

        .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }

        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Reporte de Asistencia</h1>
          <div class="org-name">${org.name}</div>
          <div class="date-range">${fromLabel} — ${toLabel}</div>
        </div>
        <div class="logo">
          <span>Secure Pass</span>
          <small>Id_CheckCard NFC System</small>
        </div>
      </div>

      <div class="metrics">
        <div class="metric-card metric-blue">
          <div class="metric-value">${totalEntradas}</div>
          <div class="metric-label">Entradas</div>
        </div>
        <div class="metric-card metric-green">
          <div class="metric-value">${puntualidadPercent}%</div>
          <div class="metric-label">Puntualidad</div>
        </div>
        <div class="metric-card metric-red">
          <div class="metric-value">${lateCount}</div>
          <div class="metric-label">Retrasos</div>
        </div>
        <div class="metric-card metric-purple">
          <div class="metric-value">${earlyLeaveCount}</div>
          <div class="metric-label">Salidas Tempranas</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Nombre</th>
            <th>Cédula</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Variación</th>
            <th>Lector</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map((log: any) => {
            const date = new Date(log.timestamp);
            const statusColor = STATUS_COLORS[log.status] || '#6b7280';
            return `
              <tr>
                <td>${date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td>${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${log.user_id?.name || '?'} ${log.user_id?.last_name || ''}</td>
                <td>${log.user_id?.document_id || 'N/A'}</td>
                <td class="type-${log.type}">${log.type === 'entrada' ? 'Entrada' : 'Salida'}</td>
                <td>
                  ${log.status
                    ? `<span class="status-badge" style="background: ${statusColor}20; color: ${statusColor}">${STATUS_LABELS[log.status] || log.status}</span>`
                    : '—'}
                </td>
                <td class="${log.time_variance_minutes > 0 ? 'variance-pos' : 'variance-neg'}">
                  ${log.time_variance_minutes !== undefined ? `${log.time_variance_minutes > 0 ? '+' : ''}${log.time_variance_minutes} min` : '—'}
                </td>
                <td>${log.reader_id?.location || 'N/A'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        Generado automáticamente por Secure Pass NFC — ${new Date().toLocaleString('es-ES')} — ${logs.length} registros
      </div>
    </body>
    </html>
    `;

    // Render to PDF with Puppeteer
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    });
    await browser.close();

    const sanitizedOrgName = org.name.replace(/[^a-zA-Z0-9]/g, '_');
    const dateLabel = from && to ? `${from}_${to}` : new Date().toISOString().split('T')[0];

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte_Asistencia_${sanitizedOrgName}_${dateLabel}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('[Reports/PDF] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
