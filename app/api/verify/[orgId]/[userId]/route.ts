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

    // Get organization public info
    const org = await Organization.findById(orgId).select('name type');

    if (!org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
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
      verified: user.status === 'active',
      verified_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Verify API Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
