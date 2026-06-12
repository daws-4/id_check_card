import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { EnrolmentSession } from '@/models/EnrolmentSession';
import { User } from '@/models/User';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, esp32_id } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Falta el parámetro status.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Buscar la sesión de enrolamiento en estado 'writing' (o 'pending' si hubo un reintento)
    const session = await EnrolmentSession.findOne({ 
      status: { $in: ['writing', 'pending'] } 
    });

    if (!session) {
      return NextResponse.json(
        { error: 'No hay ninguna sesión de enrolamiento activa en curso.' },
        { status: 404 }
      );
    }

    const userId = session.user_id;
    const isSuccess = status === 'success';

    // 2. Si la escritura fue exitosa, marcar la tarjeta como activa en el usuario
    if (isSuccess) {
      await User.findByIdAndUpdate(userId, { has_nfc_card: true });
      console.log(`[Enrolment Confirm] Usuario ${userId} enrolado exitosamente.`);
    } else {
      console.warn(`[Enrolment Confirm] El hardware reportó error al escribir la tarjeta del usuario ${userId}.`);
    }

    // 3. Notificar al panel web vía SSE (Server-Sent Events) utilizando el canal existente
    try {
      const host = req.headers.get('host') || '';
      const proto = req.headers.get('x-forwarded-proto') || 'http';
      const baseUrl = host ? `${proto}://${host}` : '';
      
      if (baseUrl) {
        // Hacemos el fetch de disparo para avisar a todos los clientes conectados al stream
        // El frontend recibirá { userId } y re-consultará los datos de este usuario,
        // cerrando el modal de espera con éxito o mostrando un mensaje de error.
        await fetch(`${baseUrl}/api/stream?userId=${userId.toString()}`);
        console.log(`[Enrolment Confirm] Notificación SSE enviada para el usuario ${userId}`);
      }
    } catch (sseError) {
      // Las notificaciones SSE son best-effort, no deben tumbar la confirmación
      console.error('[Enrolment Confirm] Error enviando trigger SSE:', sseError);
    }

    // 4. Liberar el bloqueo eliminando la sesión activa
    await EnrolmentSession.deleteOne({ _id: session._id });

    return NextResponse.json(
      { 
        message: isSuccess 
          ? 'Enrolamiento completado exitosamente y bloqueo liberado.' 
          : 'Enrolamiento cancelado por fallo de escritura y bloqueo liberado.' 
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Enrolment Confirm API] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
