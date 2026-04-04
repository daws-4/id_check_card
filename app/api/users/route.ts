import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import { Membership } from '@/models/Membership';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const type = req.nextUrl.searchParams.get('type');
    const search = req.nextUrl.searchParams.get('search');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '15');
    const skip = (page - 1) * limit;

    let query: any = {};
    if (type === 'admins') {
      query.role = { $in: ['org_admin', 'superadmin'] };
    } else if (type === 'users') {
      query.role = 'user';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { document_id: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password_hash -invite_token -reset_token')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      users,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error: any) {
    console.error("GET USERS ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { 
      name, last_name, email, role, organization_id, has_nfc_card,
      birth_date, document_id, blood_type, user_type, strict_schedule_enforcement,
      emergency_contacts, insurance_info, residence_info
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'El nombre y correo son obligatorios' }, { status: 400 });
    }

    if (role === 'org_admin' && !organization_id) {
      return NextResponse.json({ error: 'Organization is required for org_admin' }, { status: 400 });
    }

    if (user_type === 'student') {
      if (!emergency_contacts || !Array.isArray(emergency_contacts) || emergency_contacts.length === 0) {
        return NextResponse.json({ error: 'Los contactos de emergencia son obligatorios para estudiantes' }, { status: 400 });
      }
      if (emergency_contacts.length > 3) {
        return NextResponse.json({ error: 'Máximo 3 contactos de emergencia' }, { status: 400 });
      }
      for (const contact of emergency_contacts) {
        if (!contact.name || !contact.phone || !contact.relationship) {
          return NextResponse.json({ error: 'Todos los campos del contacto de emergencia son obligatorios' }, { status: 400 });
        }
      }
      if (!residence_info || !residence_info.address || !residence_info.city || !residence_info.state) {
        return NextResponse.json({ error: 'La información de residencia es obligatoria para estudiantes' }, { status: 400 });
      }
    }

    const testRole = role || 'user';
    const existingUser = await User.findOne({ email, role: testRole });
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está registrado para este rol' }, { status: 409 });
    }

    // Generar token de invitación (el usuario definirá su propia contraseña)
    const invite_token = crypto.randomBytes(32).toString('hex');
    const invite_token_expires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas

    const createPayload: any = {
      name,
      email,
      has_nfc_card: has_nfc_card || false,
      role: role || 'user',
      status: 'pending',
      invite_token,
      invite_token_expires,
    };
    if (last_name) createPayload.last_name = last_name;
    if (birth_date) createPayload.birth_date = birth_date;
    if (document_id) createPayload.document_id = document_id;
    if (blood_type) createPayload.blood_type = blood_type;
    if (user_type) createPayload.user_type = user_type;
    if (strict_schedule_enforcement !== undefined) createPayload.strict_schedule_enforcement = strict_schedule_enforcement;
    if (emergency_contacts) createPayload.emergency_contacts = emergency_contacts;
    if (insurance_info) createPayload.insurance_info = insurance_info;
    if (residence_info) createPayload.residence_info = residence_info;

    const newUser = await User.create(createPayload);

    if (role === 'org_admin' && organization_id) {
      await Membership.create({
        user_id: newUser._id,
        organization_id,
        role: 'admin'
      });
    }

    // Enviar email de invitación
    try {
      const { sendInviteEmail } = await import('@/lib/mailer');
      await sendInviteEmail(email, name, invite_token);
    } catch (mailError: any) {
      console.error('[USERS] Failed to send invite email:', mailError.message);
      // No falla la creación del usuario si el email no se envía
      // El admin puede reenviar la invitación después
    }

    const userObj = newUser.toObject();
    delete (userObj as any).password_hash;
    delete (userObj as any).invite_token;

    return NextResponse.json({ message: 'Usuario creado. Se ha enviado un correo de invitación.', user: userObj }, { status: 201 });
  } catch (error: any) {
    console.error("CREATE USER ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
