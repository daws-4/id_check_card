import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/config/db';
import { Membership } from '@/models/Membership';
import { Organization } from '@/models/Organization';
import { MembershipPlan } from '@/models/MembershipPlan';
import { MemberPayment } from '@/models/MemberPayment';

// GET: Retrieve authenticated user's memberships and available organization plans
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await connectDB();

    // 1. Find all user memberships
    const memberships = await Membership.find({ user_id: userId })
      .populate('organization_id', 'name type settings');

    // Filter memberships to only include those where organization type is 'gym' or 'membership_venue'
    const filteredMemberships = memberships.filter((m: any) => 
      m.organization_id && (m.organization_id.type === 'gym' || m.organization_id.type === 'membership_venue')
    );

    // 2. Fetch available plans and payment instructions for each organization
    const enrichedMemberships = await Promise.all(
      filteredMemberships.map(async (membership: any) => {
        const orgId = membership.organization_id._id;
        const plans = await MembershipPlan.find({ organization_id: orgId, active: true });
        
        return {
          _id: membership._id,
          organization: {
            _id: orgId,
            name: membership.organization_id.name,
            type: membership.organization_id.type,
            bank_details: membership.organization_id.settings?.bank_details || '',
            grace_period_days: membership.organization_id.settings?.grace_period_days || 0,
            is_membership_validation_enabled: membership.organization_id.settings?.is_membership_validation_enabled || false,
          },
          plan_id: membership.plan_id || null,
          plan_name: membership.plan_name || 'Sin Plan',
          plan_status: membership.plan_status || 'expired',
          expiration_date: membership.expiration_date || null,
          remaining_sessions: membership.remaining_sessions,
          last_payment_date: membership.last_payment_date || null,
          next_billing_date: membership.next_billing_date || null,
          available_plans: plans
        };
      })
    );

    // 3. Fetch past payment reports
    const payments = await MemberPayment.find({ user_id: userId })
      .populate('organization_id', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      memberships: enrichedMemberships,
      payments
    });
  } catch (error: any) {
    console.error('GET User Memberships Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
