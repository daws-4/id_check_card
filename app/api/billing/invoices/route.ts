import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Invoice } from '@/models/Invoice';

// GET — Listar facturas con filtros opcionales
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const filter: any = {};
    if (orgId) filter.organization_id = orgId;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('organization_id', 'name type tax_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return NextResponse.json({ invoices, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al obtener facturas' }, { status: 500 });
  }
}
