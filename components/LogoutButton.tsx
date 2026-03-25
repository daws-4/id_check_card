"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-medium text-sm"
    >
      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center font-bold text-sm text-red-500">
        S
      </div>
      <span>Cerrar Sesión</span>
    </button>
  );
}
