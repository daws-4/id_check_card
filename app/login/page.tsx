"use client";

import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Correo o contraseña inválidos");
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
          <p className="text-sm text-[var(--color-lavender-mist)]/70 mt-2">Inicia sesión en tu cuenta</p>
        </CardHeader>
        <Divider className="bg-divider/5" />
        <CardBody className="p-8">
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
              type="password"
              variant="bordered"
              value={password}
              onValueChange={setPassword}
              isDisabled={isLoading}
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
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
