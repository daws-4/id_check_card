import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface UserInvitationEmailProps {
  name: string;
  inviteLink: string;
}

export const UserInvitationEmail = ({
  name = 'Usuario',
  inviteLink = 'http://localhost:3000/complete-registration',
}: UserInvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Comienza a usar Secure Pass</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>🔐 Secure Pass</Heading>
            <Text style={headerSubtitle}>Sistema de Control de Acceso</Text>
          </Section>
          
          <Section style={bodyContent}>
            <Heading style={h2}>¡Hola, {name}!</Heading>
            <Text style={text}>
              Has sido registrado en la plataforma <strong>Secure Pass</strong>. Para completar tu registro y acceder al sistema, necesitas crear tu contraseña.
            </Text>
            <Text style={text}>
              Haz clic en el siguiente botón para configurar tu cuenta:
            </Text>
            
            <Section style={btnContainer}>
              <Button style={button} href={inviteLink}>
                Completar mi Registro
              </Button>
            </Section>
            
            <Section style={infoBox}>
              <Text style={infoText}>
                ⏰ Este enlace expira en <strong>72 horas</strong>. Si no completas tu registro a tiempo, solicita un nuevo enlace al administrador de tu organización.
              </Text>
            </Section>

            <Text style={smallText}>
              Si el botón no funciona, copia y pega este enlace en tu navegador:
            </Text>
            <Link style={link} href={inviteLink}>
              {inviteLink}
            </Link>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Este correo fue enviado automáticamente por Secure Pass.<br />
              Si no esperabas este mensaje, puedes ignorarlo de forma segura.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default UserInvitationEmail;

// --- Styles ---
const main = {
  backgroundColor: '#f4f7fa',
  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  padding: '24px 16px',
};

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  maxWidth: '600px',
  margin: '0 auto',
};

const header = {
  background: 'linear-gradient(135deg, #0A6DC2, #14B8A6)',
  padding: '40px 32px',
  textAlign: 'center' as const,
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '28px',
  margin: '0',
  fontWeight: '700',
  letterSpacing: '-0.5px',
};

const headerSubtitle = {
  color: 'rgba(255,255,255,0.85)',
  fontSize: '14px',
  margin: '8px 0 0 0',
};

const bodyContent = {
  padding: '40px 32px',
};

const h2 = {
  color: '#1a1a2e',
  fontSize: '22px',
  margin: '0 0 16px 0',
  fontWeight: '600',
};

const text = {
  color: '#4a5568',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 16px 0',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  background: 'linear-gradient(135deg, #0A6DC2, #14B8A6)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  boxShadow: '0 4px 16px rgba(10,109,194,0.3)',
};

const infoBox = {
  backgroundColor: '#f0f9ff',
  borderLeft: '4px solid #0A6DC2',
  padding: '16px 20px',
  borderRadius: '0 8px 8px 0',
  margin: '24px 0',
};

const infoText = {
  color: '#1e40af',
  fontSize: '13px',
  margin: '0',
};

const smallText = {
  fontSize: '13px',
  color: '#718096',
  marginBottom: '8px',
};

const link = {
  fontSize: '12px',
  color: '#0A6DC2',
  wordBreak: 'break-all' as const,
};

const footer = {
  backgroundColor: '#f8fafc',
  padding: '24px 32px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e2e8f0',
};

const footerText = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '0',
  lineHeight: '1.6',
};
