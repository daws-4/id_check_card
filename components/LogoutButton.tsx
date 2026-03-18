"use client";

import { Button } from "@heroui/button";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <Button
      color="danger"
      variant="flat"
      onPress={() => signOut({ callbackUrl: "/login" })}
      className="w-full"
    >
      Cerrar Sesión
    </Button>
  );
}
