"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Spinner } from "@heroui/spinner";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[var(--color-tropical-teal)] to-[var(--color-electric-sapphire)]">
        <Spinner size="lg" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError] = useState("");

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && passwordsMatch;

  useEffect(() => {
    if (!token) {
      setTokenError("No se proporcionó un token de recuperación.");
      setIsValidating(false);
      return;
    }

    fetch(`/api/auth/reset-password?token=${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUserInfo(data);
        } else {
          const err = await res.json();
          setTokenError(err.error || "Token inválido o expirado.");
        }
      })
      .catch(() => setTokenError("Error de conexión."))
      .finally(() => setIsValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        const err = await res.json();
        setError(err.error || "Error al restablecer la contraseña");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordRequirement = ({ met, label }: { met: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-sm transition-colors ${met ? "text-emerald-400" : "text-gray-500"}`}>
      {met ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4 text-gray-600" />}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[var(--color-tropical-teal)] to-[var(--color-electric-sapphire)] p-4">
      <Card className="w-full max-w-md shadow-2xl bg-[var(--color-carbon-black)] border border-divider/10">
        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--color-maya-blue)] to-[var(--color-tropical-teal)] bg-clip-text text-transparent">
            Secure Pass
          </h1>
          <p className="text-sm text-[var(--color-lavender-mist)]/70 mt-2">Restablecer Contraseña</p>
        </CardHeader>
        <Divider className="bg-divider/5" />
        <CardBody className="p-8">
          {isValidating ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Spinner size="lg" />
              <p className="text-sm text-[var(--color-lavender-mist)]/70">Validando enlace...</p>
            </div>
          ) : tokenError ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-danger" />
              </div>
              <p className="text-danger text-center text-sm">{tokenError}</p>
              <a
                href="/forgot-password"
                className="text-[var(--color-maya-blue)] text-sm hover:underline mt-2"
              >
                Solicitar un nuevo enlace
              </a>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-emerald-400 text-center font-medium">¡Contraseña restablecida!</p>
              <p className="text-[var(--color-lavender-mist)]/70 text-center text-sm">
                Serás redirigido al inicio de sesión en unos segundos...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-[var(--color-lavender-mist)]/70 mb-1">Restableciendo contraseña para</p>
                <p className="text-white font-semibold">{userInfo?.name}</p>
                <p className="text-[var(--color-maya-blue)] text-sm">{userInfo?.email}</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <Input
                  isRequired
                  label="Nueva Contraseña"
                  placeholder="Ingresa tu nueva contraseña"
                  type={showPassword ? "text" : "password"}
                  variant="bordered"
                  value={password}
                  onValueChange={setPassword}
                  isDisabled={isLoading}
                  endContent={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  classNames={{
                    inputWrapper: "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
                    input: "text-white",
                    label: "text-white/70",
                  }}
                />
                <Input
                  isRequired
                  label="Confirmar Contraseña"
                  placeholder="Repite tu nueva contraseña"
                  type={showConfirm ? "text" : "password"}
                  variant="bordered"
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  isDisabled={isLoading}
                  endContent={
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  classNames={{
                    inputWrapper: "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
                    input: "text-white",
                    label: "text-white/70",
                  }}
                />

                <div className="flex flex-col gap-2 p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Requisitos de contraseña</p>
                  <PasswordRequirement met={hasMinLength} label="Al menos 8 caracteres" />
                  <PasswordRequirement met={hasUpperCase} label="Al menos una mayúscula" />
                  <PasswordRequirement met={hasNumber} label="Al menos un número" />
                  <PasswordRequirement met={passwordsMatch} label="Las contraseñas coinciden" />
                </div>

                {error && (
                  <div className="text-danger text-sm text-center bg-danger/10 p-2 rounded-lg">
                    {error}
                  </div>
                )}

                <Button
                  color="primary"
                  type="submit"
                  isLoading={isLoading}
                  isDisabled={!isPasswordValid}
                  className="mt-2 bg-gradient-to-r from-[var(--color-electric-sapphire)] to-[var(--color-tropical-teal)] text-white shadow-lg text-md font-medium"
                  size="lg"
                >
                  Restablecer Contraseña
                </Button>
              </form>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
