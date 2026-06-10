"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({ showText = true }: { showText?: boolean }) {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={`flex cursor-pointer items-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-medium text-sm ${
        showText ? "w-full gap-3 px-4 py-3" : "w-12 h-12 justify-center p-0"
      }`}
      title={!showText ? "Cerrar Sesión" : undefined}
    >
      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center font-bold text-sm text-red-500 flex-shrink-0">
        S
      </div>
      {showText && <span className="whitespace-nowrap overflow-hidden">Cerrar Sesión</span>}
    </button>
  );
}
