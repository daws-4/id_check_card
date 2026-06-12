import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import { EnrolmentSession } from '@/models/EnrolmentSession';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    // 1. Validar autenticación y rol de Super Admin
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json(
        { error: 'No autorizado. Se requieren permisos de Super Admin.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'El ID de usuario proporcionado no es válido.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 2. Verificar si el usuario objetivo ya posee tarjeta registrada
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    if (targetUser.has_nfc_card) {
      return NextResponse.json(
        { error: 'El usuario ya tiene una credencial física asignada. Por favor, elimínela primero.' },
        { status: 400 }
      );
    }

    // 3. Control de concurrencia: buscar si existe otra sesión activa en el sistema
    // Estado 'pending' o 'writing'
    const activeLock = await EnrolmentSession.findOne({
      status: { $in: ['pending', 'writing'] }
    });

    if (activeLock) {
      // Si el bloqueo ha expirado por tiempo pero la base de datos no ha ejecutado el índice TTL aún,
      // podemos validar manualmente los 120 segundos
      const ageInSeconds = (Date.now() - new Date(activeLock.createdAt).getTime()) / 1000;
      if (ageInSeconds < 120) {
        return NextResponse.json(
          { error: 'La estación de enrolamiento está ocupada en este momento. Inténtelo más tarde.' },
          { status: 423 } // Locked
        );
      } else {
        // Si ya expiró, la removemos proactivamente
        await EnrolmentSession.deleteOne({ _id: activeLock._id });
      }
    }

    // 4. Asegurar que no haya registros duplicados de sesión para este usuario específico
    await EnrolmentSession.deleteMany({ user_id: userId });

    // 5. Crear la sesión de enrolamiento (Bloqueo activo)
    const newSession = await EnrolmentSession.create({
      user_id: userId,
      superadmin_id: (session.user as any).id || (session.user as any)._id,
      status: 'pending'
    });

    return NextResponse.json(
      { 
        message: 'Sesión de enrolamiento iniciada. Esperando tarjeta en el hardware.',
        sessionId: newSession._id 
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Enrolment Start API] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
