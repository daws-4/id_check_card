import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { EnrolmentSession } from '@/models/EnrolmentSession';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { card_uid, esp32_id } = body;

    if (!card_uid) {
      return NextResponse.json(
        { error: 'Falta el parámetro card_uid.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Buscar una sesión de enrolamiento activa en estado 'pending'
    const session = await EnrolmentSession.findOne({ status: 'pending' });
    if (!session) {
      return NextResponse.json(
        { error: 'No hay ninguna sesión de enrolamiento activa en espera.' },
        { status: 404 }
      );
    }

    // 2. Validar que la sesión no haya expirado (2 minutos)
    const ageInSeconds = (Date.now() - new Date(session.createdAt).getTime()) / 1000;
    if (ageInSeconds >= 120) {
      await EnrolmentSession.deleteOne({ _id: session._id });
      return NextResponse.json(
        { error: 'La sesión de enrolamiento ha expirado.' },
        { status: 410 } // Gone
      );
    }

    const secret = process.env.NFC_SIGNING_KEY;
    if (!secret) {
      return NextResponse.json(
        { error: 'Error de servidor: Clave NFC_SIGNING_KEY no configurada.' },
        { status: 500 }
      );
    }

    // 3. Generar la firma criptográfica vinculante (Bind-to-UID)
    const cardIdStr = session.user_id.toString().toLowerCase();
    const cardUidStr = card_uid.toString().toLowerCase();
    const payload = `${cardIdStr}:${cardUidStr}`;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const calculatedSignatureFull = hmac.digest('hex');

    // Truncar la firma a los primeros 16 bytes (32 caracteres hexadecimales)
    const signature = calculatedSignatureFull.substring(0, 32);

    // 4. Cambiar el estado de la sesión a 'writing' y registrar el UID físico
    session.status = 'writing';
    session.card_uid = cardUidStr;
    await session.save();

    // 5. Retornar las variables que el ESP32 debe escribir físicamente
    return NextResponse.json(
      {
        card_id: cardIdStr,
        signature: signature
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Enrolment Scan API] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
