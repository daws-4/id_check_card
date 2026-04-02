import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  // Validate token and return user info (name, email) for the registration page
  try {
    await connectDB();
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const user = await User.findOne({
      invite_token: token,
      invite_token_expires: { $gt: new Date() },
      status: 'pending',
    }).select('name last_name email');

    if (!user) {
      return NextResponse.json({ error: 'El enlace de invitación es inválido o ha expirado. Solicita uno nuevo al administrador.' }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name,
      last_name: user.last_name,
      email: user.email,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token y contraseña son requeridos' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Validate password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasUpperCase || !hasNumber) {
      return NextResponse.json({ error: 'La contraseña debe incluir al menos una mayúscula y un número' }, { status: 400 });
    }

    const user = await User.findOne({
      invite_token: token,
      invite_token_expires: { $gt: new Date() },
      status: 'pending',
    });

    if (!user) {
      return NextResponse.json({ error: 'El enlace de invitación es inválido o ha expirado. Solicita uno nuevo al administrador.' }, { status: 404 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await User.findByIdAndUpdate(user._id, {
      $set: {
        password_hash,
        status: 'active',
      },
      $unset: {
        invite_token: 1,
        invite_token_expires: 1,
      },
    });

    return NextResponse.json({ message: 'Registro completado exitosamente. Ya puedes iniciar sesión.' });
  } catch (error: any) {
    console.error('COMPLETE REGISTRATION ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
