import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/config/db';
import { User } from '@/models/User';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { theme } = await req.json();

    if (!['system', 'light', 'dark'].includes(theme)) {
      return NextResponse.json({ error: 'Tema inválido' }, { status: 400 });
    }

    await connectDB();
    await User.findByIdAndUpdate(userId, { theme_preference: theme });

    return NextResponse.json({ message: 'Tema actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando tema:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
