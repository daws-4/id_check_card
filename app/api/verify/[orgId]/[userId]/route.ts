import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import { Membership } from '@/models/Membership';
import { Organization } from '@/models/Organization';

/**
 * Public API endpoint - No authentication required.
 * Returns limited public profile data for QR-scanned verification.
 * Used by emergency services, school guards, or anyone scanning a student's carnet QR.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await params;
    await connectDB();

    // Find user with only public-safe fields
    const user = await User.findById(userId).select(
      'name last_name photo_url blood_type emergency_contacts insurance_info status user_type document_id'
    );

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verify membership to the specified organization
    const membership = await Membership.findOne({
      user_id: userId,
      organization_id: orgId,
    });

    if (!membership) {
      return NextResponse.json({ error: 'El usuario no pertenece a esta organización' }, { status: 404 });
    }

    // Get organization public info (including settings for grace period and validations)
    const org = await Organization.findById(orgId).select('name type settings');

    if (!org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const orgSettings = org.settings || {};
    const requiresValidation = orgSettings.is_membership_validation_enabled || org.type === 'gym' || org.type === 'membership_venue';

    let isPlanValid = true;
    let membershipDetails: any = null;

    if (requiresValidation) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const graceDays = orgSettings.grace_period_days || 0;
      let isExpired = false;
      let inGracePeriod = false;

      if (membership.expiration_date) {
        const expDate = new Date(membership.expiration_date);
        const expirationWithGrace = new Date(expDate);
        expirationWithGrace.setDate(expirationWithGrace.getDate() + graceDays);

        isExpired = expirationWithGrace < today;
        inGracePeriod = expDate < today && expirationWithGrace >= today;
      }

      const isSuspended = membership.plan_status === 'suspended';
      const isPendingPayment = membership.plan_status === 'pending_payment';
      const isNoSessions = membership.remaining_sessions !== undefined && membership.remaining_sessions <= 0;

      isPlanValid = !isExpired && !isSuspended && !isPendingPayment && !isNoSessions && (membership.plan_status === 'active');

      membershipDetails = {
        plan_status: isExpired ? 'expired' : membership.plan_status,
        plan_name: membership.plan_name || 'Sin Plan',
        expiration_date: membership.expiration_date || null,
        remaining_sessions: membership.remaining_sessions,
        in_grace_period: inGracePeriod,
        grace_period_days: graceDays
      };

      // Auto-update expired status in db if needed
      if (isExpired && membership.plan_status === 'active') {
        membership.plan_status = 'expired';
        await membership.save();
      }
    }

    return NextResponse.json({
      user: {
        name: user.name,
        last_name: user.last_name || '',
        photo_url: user.photo_url || null,
        blood_type: user.blood_type || null,
        document_id: user.document_id || null,
        user_type: user.user_type || 'worker',
        status: user.status,
        emergency_contacts: user.emergency_contacts || [],
        insurance_info: user.insurance_info || null,
      },
      organization: {
        name: org.name,
        type: org.type,
      },
      verified: user.status === 'active' && isPlanValid,
      verified_at: new Date().toISOString(),
      membership_status: membershipDetails
    });
  } catch (error: any) {
    console.error('Verify API Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
