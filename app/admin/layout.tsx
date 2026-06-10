"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LayoutDashboard, Building2, Users, Router, UserCog, Receipt, Menu } from "lucide-react";
import BillingTrigger from "@/components/BillingTrigger";
import Sidebar from "@/components/Sidebar";
import { useSidebar } from "@/components/SidebarContext";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { setIsOpenMobile } = useSidebar();

  const navItems = [
    { href: "/admin", label: "Tablero", icon: LayoutDashboard },
    { href: "/admin/organizations", label: "Organizaciones", icon: Building2 },
    { href: "/admin/readers", label: "Lectores y Dispositivos", icon: Router },
    { href: "/admin/admins", label: "Administradores", icon: UserCog },
    { href: "/admin/users", label: "Usuarios", icon: Users },
    { href: "/admin/billing", label: "Facturación", icon: Receipt },
  ];

  return (
    <div className="bg-[var(--color-lavender-mist)] dark:bg-zinc-950 flex h-screen overflow-hidden text-[var(--color-carbon-black)] dark:text-gray-100">
      <BillingTrigger />
      
      {/* Sidebar Unificado */}
      <Sidebar
        navItems={navItems}
        roleLabel="Panel de Super Admin"
        activeLayoutId="admin-sidebar"
        footerContent={({ showFull }: { showFull: boolean }) => (
          <LogoutButton showText={showFull} />
        )}
      />

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--color-lavender-mist)] dark:bg-zinc-950">
        {/* Barra superior (Topbar) */}
        <header className="bg-white dark:bg-zinc-900 px-8 py-5 shadow-sm border-b border-gray-100 dark:border-white/10 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpenMobile(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-[var(--color-tropical-teal)] text-xl font-bold">
              Área de Admin
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Bienvenido de nuevo</span>
            <ThemeSwitcher />
          </div>
        </header>

        {/* Área de contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
