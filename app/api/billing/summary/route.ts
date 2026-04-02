import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Invoice } from '@/models/Invoice';
import mongoose from 'mongoose';

// GET — Resumen financiero global
export async function GET() {
  try {
    await connectDB();

    const [summary] = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          total_invoices: { $sum: 1 },
          total_amount: { $sum: '$total_amount' },
          total_pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$total_amount', 0] },
          },
          total_paid: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total_amount', 0] },
          },
          total_overdue: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$total_amount', 0] },
          },
          count_pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          count_paid: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
          },
          count_overdue: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
          },
        },
      },
    ]);

    // Resumen por organización
    const byOrg = await Invoice.aggregate([
      {
        $group: {
          _id: '$organization_id',
          total_amount: { $sum: '$total_amount' },
          total_pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$total_amount', 0] },
          },
          total_paid: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total_amount', 0] },
          },
          invoice_count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'organizations',
          localField: '_id',
          foreignField: '_id',
          as: 'organization',
        },
      },
      { $unwind: '$organization' },
      {
        $project: {
          organization_name: '$organization.name',
          organization_type: '$organization.type',
          total_amount: 1,
          total_pending: 1,
          total_paid: 1,
          invoice_count: 1,
        },
      },
      { $sort: { total_pending: -1 } },
    ]);

    return NextResponse.json({
      global: summary || {
        total_invoices: 0,
        total_amount: 0,
        total_pending: 0,
        total_paid: 0,
        total_overdue: 0,
        count_pending: 0,
        count_paid: 0,
        count_overdue: 0,
      },
      by_organization: byOrg,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al obtener resumen' }, { status: 500 });
  }
}
