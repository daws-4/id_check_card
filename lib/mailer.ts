import { Resend } from 'resend';
import UserInvitationEmail from '@/emails/UserInvitationEmail';
import PasswordResetEmail from '@/emails/PasswordResetEmail';

// Instanciar Resend con la key de las variables de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

// Este "from" DEBE ser un dominio que hayas verificado en Resend
const defaultFrom = 'Secure Pass <onboarding@davidvillamizar.com>';

export async function sendInviteEmail(to: string, name: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/complete-registration?token=${token}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: defaultFrom,
      to,
      subject: 'Completa tu registro en Secure Pass',
      react: UserInvitationEmail({ name, inviteLink: link }),
    });

    if (error) {
      console.error(`[MAILER] Error de Resend para ${to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`[MAILER] Email enviado a ${to}:`, data?.id);
    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error(`[MAILER] Fallo crítico al enviar a ${to}:`, error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendResetEmail(to: string, name: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/reset-password?token=${token}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: defaultFrom,
      to,
      subject: 'Restablece tu contraseña — Secure Pass',
      react: PasswordResetEmail({ name, resetLink: link }),
    });

    if (error) {
      console.error(`[MAILER] Error de Resend para ${to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`[MAILER] Email enviado a ${to}:`, data?.id);
    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error(`[MAILER] Fallo crítico al enviar a ${to}:`, error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
