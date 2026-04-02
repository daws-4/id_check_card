import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import { Membership } from '@/models/Membership';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/change-password
 * 
 * Jerarquía de permisos:
 * - user: solo puede cambiar su propia contraseña (requiere currentPassword)
 * - org_admin: puede cambiar contraseñas de usuarios de su organización + la propia
 * - superadmin: puede cambiar user y org_admin, NO puede cambiar otros superadmin
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();
    const { targetUserId, currentPassword, newPassword } = await req.json();

    if (!newPassword) {
      return NextResponse.json({ error: 'La nueva contraseña es requerida' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!hasUpperCase || !hasNumber) {
      return NextResponse.json({ error: 'La contraseña debe incluir al menos una mayúscula y un número' }, { status: 400 });
    }

    const currentUser = await User.findById((session.user as any).id);
    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const isSelfChange = !targetUserId || targetUserId === currentUser._id.toString();

    if (isSelfChange) {
      // Cambio de contraseña propia — requiere contraseña actual
      if (!currentPassword) {
        return NextResponse.json({ error: 'La contraseña actual es requerida para cambiar tu propia contraseña' }, { status: 400 });
      }

      if (!currentUser.password_hash) {
        return NextResponse.json({ error: 'Tu cuenta no tiene contraseña configurada' }, { status: 400 });
      }

      const isMatch = await bcrypt.compare(currentPassword, currentUser.password_hash);
      if (!isMatch) {
        return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 403 });
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);
      await User.findByIdAndUpdate(currentUser._id, { $set: { password_hash } });

      return NextResponse.json({ message: 'Contraseña actualizada exitosamente.' });
    }

    // Cambio de contraseña de otro usuario — validar jerarquía
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario objetivo no encontrado' }, { status: 404 });
    }

    const callerRole = currentUser.role;
    const targetRole = targetUser.role;

    // user no puede cambiar contraseña de otros
    if (callerRole === 'user') {
      return NextResponse.json({ error: 'No tienes permisos para cambiar la contraseña de otros usuarios' }, { status: 403 });
    }

    // superadmin NO puede cambiar contraseña de otros superadmin
    if (callerRole === 'superadmin' && targetRole === 'superadmin') {
      return NextResponse.json({ error: 'No puedes cambiar la contraseña de otro superadmin' }, { status: 403 });
    }

    // org_admin solo puede cambiar contraseñas de 'user' en su organización
    if (callerRole === 'org_admin') {
      if (targetRole !== 'user') {
        return NextResponse.json({ error: 'Solo puedes cambiar contraseñas de usuarios regulares de tu organización' }, { status: 403 });
      }

      // Verificar que el target pertenece a una organización del org_admin
      const adminMemberships = await Membership.find({
        user_id: currentUser._id,
        role: 'admin',
      });
      const adminOrgIds = adminMemberships.map(m => m.organization_id.toString());

      const targetMemberships = await Membership.find({
        user_id: targetUser._id,
      });
      const targetOrgIds = targetMemberships.map(m => m.organization_id.toString());

      const hasCommonOrg = adminOrgIds.some(orgId => targetOrgIds.includes(orgId));
      if (!hasCommonOrg) {
        return NextResponse.json({ error: 'Este usuario no pertenece a tu organización' }, { status: 403 });
      }
    }

    // superadmin puede cambiar user y org_admin — ya validado arriba que no es otro superadmin
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    await User.findByIdAndUpdate(targetUser._id, { $set: { password_hash } });

    return NextResponse.json({ message: `Contraseña de ${targetUser.name} actualizada exitosamente.` });
  } catch (error: any) {
    console.error('CHANGE PASSWORD ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
