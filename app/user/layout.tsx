"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LayoutDashboard, Calendar, ListChecks, BarChart3, UserCircle, Building2, Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { useSidebar } from "@/components/SidebarContext";

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { setIsOpenMobile } = useSidebar();

  const navItems = [
    { href: "/user", label: "Inicio", icon: LayoutDashboard },
    { href: "/user/organizations", label: "Mis Organizaciones", icon: Building2 },
    { href: "/user/schedules", label: "Horarios", icon: Calendar },
    { href: "/user/tasks", label: "Tareas", icon: ListChecks },
    { href: "/user/metrics", label: "Métricas", icon: BarChart3 },
    { href: "/user/profile", label: "Perfil", icon: UserCircle },
  ];

  return (
    <div className="bg-[var(--color-lavender-mist)] dark:bg-zinc-950 flex h-screen overflow-hidden text-[var(--color-carbon-black)] dark:text-gray-100">
      
      {/* Sidebar Unificado */}
      <Sidebar
        navItems={navItems}
        roleLabel="Panel de Usuario"
        activeLayoutId="user-sidebar"
        footerContent={({ showFull }: { showFull: boolean }) => (
          <LogoutButton showText={showFull} />
        )}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--color-lavender-mist)] dark:bg-zinc-950">
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
              Mi Panel
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Bienvenido</span>
            <ThemeSwitcher />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

