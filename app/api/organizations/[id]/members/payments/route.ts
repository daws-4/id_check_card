import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { MemberPayment } from '@/models/MemberPayment';
import { Membership } from '@/models/Membership';
import { MembershipPlan } from '@/models/MembershipPlan';
import { User } from '@/models/User';
import mongoose from 'mongoose';

// GET: Query payments for the organization
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: organizationId } = await params;
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const userId = url.searchParams.get('user_id');

    const filter: any = { organization_id: organizationId };
    if (status) filter.status = status;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.user_id = new mongoose.Types.ObjectId(userId);
    }

    const payments = await MemberPayment.find(filter)
      .populate('user_id', 'name last_name email document_id user_type')
      .populate({
        path: 'membership_id',
        select: 'plan_name plan_status expiration_date'
      })
      .sort({ createdAt: -1 });

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error('GET MemberPayments Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST: Report / Register a payment
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: organizationId } = await params;
    const body = await req.json();

    const { user_id, plan_id, payment_method, reference, notes, force_paid } = body;

    if (!user_id || !plan_id || !payment_method) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Find User to evaluate discounts and check existence
    const user = await User.findById(user_id);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Find Plan to calculate amount and cycle
    const plan = await MembershipPlan.findById(plan_id);
    if (!plan || plan.organization_id.toString() !== organizationId) {
      return NextResponse.json({ error: 'Plan de membresía inválido' }, { status: 404 });
    }

    // Find or create Membership for this user in this org
    let membership = await Membership.findOne({ user_id, organization_id: organizationId });
    if (!membership) {
      membership = await Membership.create({
        user_id,
        organization_id: organizationId,
        role: 'user',
        plan_id: plan._id,
        plan_name: plan.name,
        plan_status: 'pending_payment',
        remaining_sessions: plan.sessions_limit || 0
      });
    } else {
      membership.plan_id = plan._id;
      membership.plan_name = plan.name;
    }

    // Calculate dynamic discount based on user type (e.g. student)
    const userType = user.user_type || 'worker';
    const matchingDiscount = plan.discounts.find(d => d.user_type === userType);
    const discountPercent = matchingDiscount ? matchingDiscount.percentage : 0;
    const discountApplied = parseFloat(((plan.price * discountPercent) / 100).toFixed(2));
    const finalAmount = parseFloat((plan.price - discountApplied).toFixed(2));

    // Determine payment status (Cash or Admin forced payments are immediately active/paid)
    // Mobile payment or bank transfers default to pending for audit/reconciliation
    const isInstantPay = payment_method === 'cash' || force_paid === true;
    const paymentStatus = isInstantPay ? 'paid' : 'pending';

    // Calculate dates
    const today = new Date();
    let periodStart = new Date(today);
    
    // If the membership is currently active and not expired, pile up starting from expiration date
    if (membership.expiration_date && membership.expiration_date > today && membership.plan_status === 'active') {
      periodStart = new Date(membership.expiration_date);
    }
    
    let periodEnd = new Date(periodStart);
    if (plan.billing_cycle === 'weekly') {
      periodEnd.setDate(periodStart.getDate() + 7);
    } else if (plan.billing_cycle === 'yearly') {
      periodEnd.setDate(periodStart.getDate() + 365);
    } else {
      // Monthly or custom sessions defaults to 30 days
      periodEnd.setDate(periodStart.getDate() + 30);
    }

    // Create Payment Record
    const payment = await MemberPayment.create({
      membership_id: membership._id,
      user_id,
      organization_id: organizationId,
      amount: plan.price,
      discount_applied: discountApplied,
      final_amount: finalAmount,
      payment_date: new Date(),
      period_start: periodStart,
      period_end: periodEnd,
      status: paymentStatus,
      payment_method,
      reference,
      notes
    });

    // If instantly paid, update membership immediately
    if (paymentStatus === 'paid') {
      membership.plan_status = 'active';
      membership.expiration_date = periodEnd;
      if (plan.billing_cycle === 'sessions') {
        membership.remaining_sessions = (membership.remaining_sessions || 0) + (plan.sessions_limit || 0);
      } else {
        membership.remaining_sessions = plan.sessions_limit;
      }
      membership.last_payment_date = new Date();
      membership.next_billing_date = periodEnd;
      await membership.save();
    } else {
      membership.plan_status = 'pending_payment';
      await membership.save();
    }

    return NextResponse.json({
      message: paymentStatus === 'paid' ? 'Pago registrado y membresía activada' : 'Pago reportado, pendiente por conciliación',
      payment,
      membership
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST MemberPayment Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
