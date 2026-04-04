"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlError = searchParams.get('error');
      if (urlError === 'AccessDenied') {
        setError('Acceso denegado: Tu cuenta no está registrada.');
      } else if (urlError === 'OAuthSignin' || urlError === 'OAuthCallback') {
        setError('Ocurrió un error al iniciar sesión con Google.');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      portalType: "user",
    });

    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? "Correo o contraseña inválidos" : res.error);
      setIsLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[var(--color-tropical-teal)] to-[var(--color-electric-sapphire)] p-4">
      <Card className="w-full max-w-md shadow-2xl bg-[var(--color-carbon-black)] border border-divider/10">
        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--color-maya-blue)] to-[var(--color-tropical-teal)] bg-clip-text text-transparent">
            Secure Pass
          </h1>
          <p className="text-sm text-[var(--color-lavender-mist)]/70 mt-2">Portal de Usuarios</p>
        </CardHeader>
        <Divider className="bg-divider/5" />
        <CardBody className="p-8">
          <div className="flex flex-col gap-6 mb-6">
            <Button
              variant="flat"
              className="w-full bg-white text-[var(--color-carbon-black)] font-semibold shadow hover:bg-gray-100 flex items-center justify-center gap-3 transition-colors"
              size="lg"
              onPress={() => signIn('google', { callbackUrl: '/' })}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.71 17.58V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.58C14.73 18.24 13.48 18.64 12 18.64C9.13 18.64 6.7 16.7 5.82 14.1H2.14V16.94C3.96 20.55 7.69 23 12 23Z" fill="#34A853"/>
                <path d="M5.82 14.1C5.6 13.44 5.47 12.73 5.47 12C5.47 11.27 5.6 10.56 5.82 9.9V7.06H2.14C1.4 8.53 1 10.21 1 12C1 13.79 1.4 15.47 2.14 16.94L5.82 14.1Z" fill="#FBBC05"/>
                <path d="M12 5.38C13.62 5.38 15.06 5.94 16.21 7.03L19.37 3.87C17.46 2.09 14.97 1 12 1C7.69 1 3.96 3.45 2.14 7.06L5.82 9.9C6.7 7.3 9.13 5.38 12 5.38Z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </Button>
            
            <div className="flex items-center gap-4">
              <Divider className="flex-1 bg-divider/10" />
              <span className="text-xs text-[var(--color-lavender-mist)]/50 uppercase tracking-wider">O usa tu contraseña</span>
              <Divider className="flex-1 bg-divider/10" />
            </div>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Input
              isRequired
              label="Correo"
              placeholder="Ingresa tu correo"
              type="email"
              variant="bordered"
              value={email}
              onValueChange={setEmail}
              isDisabled={isLoading}
              classNames={{
                inputWrapper: "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
                input: "text-white",
                label: "text-white/70"
              }}
            />
            <Input
              isRequired
              label="Contraseña"
              placeholder="Ingresa tu contraseña"
              type={showPassword ? "text" : "password"}
              variant="bordered"
              value={password}
              onValueChange={setPassword}
              isDisabled={isLoading}
              endContent={
                <button type="button" className="focus:outline-none cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              }
              classNames={{
                inputWrapper: "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
                input: "text-white",
                label: "text-white/70"
              }}
            />
            {error && (
              <div className="text-danger text-sm text-center bg-danger/10 p-2 rounded-lg">
                {error}
              </div>
            )}
            <Button
              color="primary"
              type="submit"
              isLoading={isLoading}
              className="mt-2 bg-gradient-to-r from-[var(--color-electric-sapphire)] to-[var(--color-tropical-teal)] text-white shadow-lg text-md font-medium"
              size="lg"
            >
              Iniciar Sesión
            </Button>
            <div className="text-center text-sm text-[var(--color-lavender-mist)]/70 mt-4 flex flex-col gap-2">
              <a href="/forgot-password?portal=user" className="text-[var(--color-maya-blue)] hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
              <span>
                ¿Eres administrador? <a href="/admin-login" className="text-[var(--color-maya-blue)] hover:underline">Ingresa aquí</a>
              </span>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
