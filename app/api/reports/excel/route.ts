import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/config/db';
import { AttendanceLog } from '@/models/AttendanceLog';
import { User } from '@/models/User';
import { Organization } from '@/models/Organization';
import * as XLSX from 'xlsx';

const STATUS_LABELS: Record<string, string> = {
  on_time: 'A TIEMPO',
  late: 'RETRASO',
  early_leave: 'SALIDA TEMPRANA',
  overtime: 'TIEMPO EXTRA',
  out_of_schedule: 'FUERA DE HORARIO',
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const organization_id = url.searchParams.get('organization_id');
    const from = url.searchParams.get('from'); // ISO date string
    const to = url.searchParams.get('to');     // ISO date string

    if (!organization_id) {
      return NextResponse.json({ error: 'organization_id is required' }, { status: 400 });
    }

    await connectDB();

    // Verify organization exists
    const org = await Organization.findById(organization_id).select('name');
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
      .populate('reader_id', 'location esp32_id')
      .sort({ timestamp: -1 })
      .limit(5000); // Safety cap

    // Prevent treeshaking
    void User;

    // Build spreadsheet rows
    const rows = logs.map((log: any) => ({
      'Fecha': new Date(log.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      'Hora': new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      'Nombre': log.user_id?.name || 'Desconocido',
      'Apellido': log.user_id?.last_name || '',
      'Cédula': log.user_id?.document_id || 'N/A',
      'Correo': log.user_id?.email || 'N/A',
      'Tipo': log.type === 'entrada' ? 'ENTRADA' : 'SALIDA',
      'Estado': STATUS_LABELS[log.status] || '—',
      'Variación (min)': log.time_variance_minutes !== undefined ? log.time_variance_minutes : '—',
      'Ubicación Lector': log.reader_id?.location || 'N/A',
      'ID Lector': log.reader_id?.esp32_id || 'N/A',
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r: any) => String(r[key] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const sanitizedOrgName = org.name.replace(/[^a-zA-Z0-9]/g, '_');
    const dateLabel = from && to ? `${from}_${to}` : new Date().toISOString().split('T')[0];

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Reporte_Asistencia_${sanitizedOrgName}_${dateLabel}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('[Reports/Excel] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
