/**
 * Plantillas de email HTML profesionales para Secure Pass.
 * Diseño responsive inline-CSS compatible con todos los clientes de correo.
 */

const baseStyles = `
  body { margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #0A6DC2, #14B8A6); padding: 40px 32px; text-align: center; }
  .header h1 { color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px; }
  .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0 0; }
  .body-content { padding: 40px 32px; }
  .body-content h2 { color: #1a1a2e; font-size: 22px; margin: 0 0 16px 0; font-weight: 600; }
  .body-content p { color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0; }
  .cta-button { display: inline-block; background: linear-gradient(135deg, #0A6DC2, #14B8A6); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; margin: 24px 0; box-shadow: 0 4px 16px rgba(10,109,194,0.3); }
  .info-box { background-color: #f0f9ff; border-left: 4px solid #0A6DC2; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0; }
  .info-box p { color: #1e40af; font-size: 13px; margin: 0; }
  .footer { background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; }
  .footer p { color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6; }
`;

function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div style="padding: 24px 16px; background-color: #f4f7fa;">
    <div class="container">
      ${content}
    </div>
  </div>
</body>
</html>`;
}

export function getInviteTemplate(name: string, link: string): string {
  return wrapTemplate(`
    <div class="header">
      <h1>🔐 Secure Pass</h1>
      <p>Sistema de Control de Acceso</p>
    </div>
    <div class="body-content">
      <h2>¡Hola, ${name}!</h2>
      <p>Has sido registrado en la plataforma <strong>Secure Pass</strong>. Para completar tu registro y acceder al sistema, necesitas crear tu contraseña.</p>
      <p>Haz clic en el siguiente botón para configurar tu cuenta:</p>
      <div style="text-align: center;">
        <a href="${link}" class="cta-button">Completar mi Registro</a>
      </div>
      <div class="info-box">
        <p>⏰ Este enlace expira en <strong>72 horas</strong>. Si no completas tu registro a tiempo, solicita un nuevo enlace al administrador de tu organización.</p>
      </div>
      <p style="font-size: 13px; color: #718096;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="font-size: 12px; color: #0A6DC2; word-break: break-all;">${link}</p>
    </div>
    <div class="footer">
      <p>Este correo fue enviado automáticamente por Secure Pass.<br>Si no esperabas este mensaje, puedes ignorarlo de forma segura.</p>
    </div>
  `);
}

export function getResetTemplate(name: string, link: string): string {
  return wrapTemplate(`
    <div class="header">
      <h1>🔐 Secure Pass</h1>
      <p>Restablecimiento de Contraseña</p>
    </div>
    <div class="body-content">
      <h2>Hola, ${name}</h2>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Secure Pass</strong>.</p>
      <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
      <div style="text-align: center;">
        <a href="${link}" class="cta-button">Restablecer Contraseña</a>
      </div>
      <div class="info-box">
        <p>⏰ Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este correo y tu contraseña no será modificada.</p>
      </div>
      <p style="font-size: 13px; color: #718096;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="font-size: 12px; color: #0A6DC2; word-break: break-all;">${link}</p>
    </div>
    <div class="footer">
      <p>Este correo fue enviado automáticamente por Secure Pass.<br>Si no solicitaste el restablecimiento, puedes ignorar este mensaje.</p>
    </div>
  `);
}
