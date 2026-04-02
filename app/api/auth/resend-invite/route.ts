import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (user.status === 'active') {
      return NextResponse.json({ error: 'El usuario ya completó su registro' }, { status: 400 });
    }

    // Regenerar token de invitación
    const invite_token = crypto.randomBytes(32).toString('hex');
    const invite_token_expires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas

    await User.findByIdAndUpdate(user._id, {
      $set: { invite_token, invite_token_expires },
    });

    try {
      const { sendInviteEmail } = await import('@/lib/mailer');
      await sendInviteEmail(user.email, user.name, invite_token);
    } catch (mailError: any) {
      console.error('[RESEND-INVITE] Failed to send email:', mailError.message);
      return NextResponse.json({ error: 'No se pudo enviar el correo. Intenta de nuevo.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Invitación reenviada exitosamente.' });
  } catch (error: any) {
    console.error('RESEND INVITE ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
