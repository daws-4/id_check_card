import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import { Membership } from '@/models/Membership';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const type = req.nextUrl.searchParams.get('type');
    let query = {};
    if (type === 'admins') {
      query = { role: { $in: ['org_admin', 'superadmin'] } };
    } else if (type === 'users') {
      query = { role: 'user' };
    }
    const users = await User.find(query).select('-password_hash');
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { 
      name, last_name, email, password, role, organization_id, has_nfc_card,
      birth_date, document_id, blood_type, user_type
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role === 'org_admin' && !organization_id) {
      return NextResponse.json({ error: 'Organization is required for org_admin' }, { status: 400 });
    }

    const testRole = role || 'user';
    const existingUser = await User.findOne({ email, role: testRole });
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está registrado para este rol' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const createPayload: any = {
      name,
      email,
      password_hash,
      has_nfc_card: has_nfc_card || false,
      role: role || 'user',
    };
    if (last_name) createPayload.last_name = last_name;
    if (birth_date) createPayload.birth_date = birth_date;
    if (document_id) createPayload.document_id = document_id;
    if (blood_type) createPayload.blood_type = blood_type;
    if (user_type) createPayload.user_type = user_type;

    const newUser = await User.create(createPayload);

    if (role === 'org_admin' && organization_id) {
      await Membership.create({
        user_id: newUser._id,
        organization_id,
        role: 'admin'
      });
    }

    const userObj = newUser.toObject();
    delete (userObj as any).password_hash;

    return NextResponse.json({ message: 'User created', user: userObj }, { status: 201 });
  } catch (error: any) {
    console.error("CREATE USER ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
