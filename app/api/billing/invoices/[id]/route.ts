import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Invoice } from '@/models/Invoice';

// GET — Obtener detalle de una factura
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const invoice = await Invoice.findById(id)
      .populate('organization_id', 'name type tax_id')
      .lean();

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al obtener factura' }, { status: 500 });
  }
}

// PUT — Actualizar estado de una factura (marcar como pagada, cancelar, etc.)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { status, payment_method, paid_by, payment_reference, notes } = body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    if (status) invoice.status = status;
    if (payment_method) invoice.payment_method = payment_method;
    if (paid_by !== undefined) invoice.paid_by = paid_by;
    if (payment_reference !== undefined) invoice.payment_reference = payment_reference;
    if (notes !== undefined) invoice.notes = notes;

    // Si se marca como pagada, registrar fecha
    if (status === 'paid' && !invoice.paid_at) {
      invoice.paid_at = new Date();
    }

    await invoice.save();

    return NextResponse.json({ message: 'Factura actualizada', invoice });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar factura' }, { status: 500 });
  }
}

// DELETE — Eliminar factura (solo si está cancelada)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    if (invoice.status !== 'cancelled') {
      return NextResponse.json({ error: 'Solo se pueden eliminar facturas canceladas' }, { status: 400 });
    }

    await Invoice.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Factura eliminada' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar factura' }, { status: 500 });
  }
}
