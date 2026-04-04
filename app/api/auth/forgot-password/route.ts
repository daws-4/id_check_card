import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, portalType } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'El correo es requerido' }, { status: 400 });
    }

    let roleFilter = {};
    if (portalType === 'admin') {
      roleFilter = { role: { $in: ['org_admin', 'superadmin'] } };
    } else {
      roleFilter = { role: 'user' };
    }

    // Siempre retornar éxito para no revelar si el email existe
    const genericResponse = NextResponse.json({
      message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
    });

    const user = await User.findOne({ email, status: 'active', ...roleFilter });

    if (!user) {
      return genericResponse;
    }

    const reset_token = crypto.randomBytes(32).toString('hex');
    const reset_token_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await User.findByIdAndUpdate(user._id, {
      $set: {
        reset_token,
        reset_token_expires,
      },
    });

    try {
      const { sendResetEmail } = await import('@/lib/mailer');
      await sendResetEmail(email, user.name, reset_token);
    } catch (mailError: any) {
      console.error('[FORGOT-PASSWORD] Failed to send reset email:', mailError.message);
      // No revelar error de email al usuario
    }

    return genericResponse;
  } catch (error: any) {
    console.error('FORGOT PASSWORD ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
