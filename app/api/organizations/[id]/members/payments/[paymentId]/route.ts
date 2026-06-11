import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { MemberPayment } from '@/models/MemberPayment';
import { Membership } from '@/models/Membership';
import { MembershipPlan } from '@/models/MembershipPlan';

// PUT: Audit / Conciliate a payment (Approve or Reject)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    await connectDB();
    const { id: organizationId, paymentId } = await params;
    const body = await req.json();

    const { status, audited_by } = body;

    if (!status || !['paid', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Estado de auditoría inválido' }, { status: 400 });
    }

    const payment = await MemberPayment.findById(paymentId);
    if (!payment || payment.organization_id.toString() !== organizationId) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    if (payment.status !== 'pending') {
      return NextResponse.json({ error: 'Este pago ya ha sido auditado previamente' }, { status: 400 });
    }

    // Update payment record
    payment.status = status;
    payment.audited_by = audited_by || 'admin_system';
    payment.audited_at = new Date();
    await payment.save();

    // If approved, activate/extend membership
    if (status === 'paid') {
      const membership = await Membership.findById(payment.membership_id);
      if (membership) {
        // Retrieve plan details to set remaining sessions if needed
        const plan = await MembershipPlan.findById(membership.plan_id);
        
        membership.plan_status = 'active';
        membership.expiration_date = payment.period_end;
        
        if (plan) {
          if (plan.billing_cycle === 'sessions') {
            membership.remaining_sessions = (membership.remaining_sessions || 0) + (plan.sessions_limit || 0);
          } else if (plan.sessions_limit !== undefined) {
            membership.remaining_sessions = plan.sessions_limit;
          }
        }
        
        membership.last_payment_date = new Date();
        membership.next_billing_date = payment.period_end;
        await membership.save();
      }
    } else if (status === 'rejected') {
      const membership = await Membership.findById(payment.membership_id);
      if (membership && membership.plan_status === 'pending_payment') {
        membership.plan_status = 'expired';
        await membership.save();
      }
    }

    return NextResponse.json({
      message: status === 'paid' ? 'Pago aprobado y membresía activada con éxito' : 'Pago rechazado administrativamente',
      payment
    });

  } catch (error: any) {
    console.error('PUT MemberPayment Audit Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
