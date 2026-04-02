import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  // Validate token exists and is not expired
  try {
    await connectDB();
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const user = await User.findOne({
      reset_token: token,
      reset_token_expires: { $gt: new Date() },
    }).select('name email');

    if (!user) {
      return NextResponse.json({ error: 'El enlace de recuperación es inválido o ha expirado.' }, { status: 404 });
    }

    return NextResponse.json({ name: user.name, email: user.email });
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

    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasUpperCase || !hasNumber) {
      return NextResponse.json({ error: 'La contraseña debe incluir al menos una mayúscula y un número' }, { status: 400 });
    }

    const user = await User.findOne({
      reset_token: token,
      reset_token_expires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ error: 'El enlace de recuperación es inválido o ha expirado.' }, { status: 404 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await User.findByIdAndUpdate(user._id, {
      $set: { password_hash },
      $unset: { reset_token: 1, reset_token_expires: 1 },
    });

    return NextResponse.json({ message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.' });
  } catch (error: any) {
    console.error('RESET PASSWORD ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
