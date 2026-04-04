"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Mail, CheckCircle, ArrowLeft } from "lucide-react";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const searchParams = useSearchParams();
  const portalType = searchParams.get("portal") || "user";
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, portalType }),
      });
      // Siempre mostrar éxito sin importar si el email existe
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[var(--color-tropical-teal)] to-[var(--color-electric-sapphire)] p-4">
      <Card className="w-full max-w-md shadow-2xl bg-[var(--color-carbon-black)] border border-divider/10">
        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--color-maya-blue)] to-[var(--color-tropical-teal)] bg-clip-text text-transparent">
            Secure Pass
          </h1>
          <p className="text-sm text-[var(--color-lavender-mist)]/70 mt-2">Recuperar Contraseña {portalType === 'admin' ? '(Admin)' : ''}</p>
        </CardHeader>
        <Divider className="bg-divider/5" />
        <CardBody className="p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-white text-center font-medium">¡Correo enviado!</p>
              <p className="text-[var(--color-lavender-mist)]/70 text-center text-sm">
                Si el correo <strong className="text-[var(--color-maya-blue)]">{email}</strong> está registrado en nuestra plataforma, recibirás un enlace para restablecer tu contraseña.
              </p>
              <p className="text-[var(--color-lavender-mist)]/50 text-center text-xs mt-2">
                Revisa también tu carpeta de spam. El enlace expira en 1 hora.
              </p>
              <div className="flex flex-col gap-2 mt-4 w-full">
                <Button
                  variant="flat"
                  className="text-[var(--color-maya-blue)]"
                  onPress={() => setSent(false)}
                >
                  Enviar a otro correo
                </Button>
                <a
                  href={portalType === 'admin' ? "/admin-login" : "/login"}
                  className="flex items-center justify-center gap-2 text-sm text-[var(--color-lavender-mist)]/70 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-full bg-[var(--color-maya-blue)]/15 flex items-center justify-center">
                  <Mail className="w-7 h-7 text-[var(--color-maya-blue)]" />
                </div>
                <p className="text-[var(--color-lavender-mist)]/70 text-sm text-center">
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>
              <Input
                isRequired
                label="Correo Electrónico"
                placeholder="Ingresa tu correo"
                type="email"
                variant="bordered"
                value={email}
                onValueChange={setEmail}
                isDisabled={isLoading}
                classNames={{
                  inputWrapper: "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
                  input: "text-white",
                  label: "text-white/70",
                }}
              />
              <Button
                color="primary"
                type="submit"
                isLoading={isLoading}
                isDisabled={!email}
                className="bg-gradient-to-r from-[var(--color-electric-sapphire)] to-[var(--color-tropical-teal)] text-white shadow-lg text-md font-medium"
                size="lg"
              >
                Enviar Enlace de Recuperación
              </Button>
              <a
                href={portalType === 'admin' ? "/admin-login" : "/login"}
                className="flex items-center justify-center gap-2 text-sm text-[var(--color-lavender-mist)]/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </a>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-[var(--color-tropical-teal)] to-[var(--color-electric-sapphire)]"></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
