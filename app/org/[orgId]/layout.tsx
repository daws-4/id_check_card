"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import LogoutButton from "@/components/LogoutButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Nfc, LayoutDashboard, Users, UsersRound, CalendarPlus, Router, Receipt, ArrowLeft } from "lucide-react";

export default function OrgLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params?.orgId as string;
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(s => { if (s?.user?.role === "superadmin") setIsSuperAdmin(true); })
      .catch(() => {});
  }, []);

  const navItems = [
    { href: `/org/${orgId}`, label: "Tablero", icon: LayoutDashboard },
    { href: `/org/${orgId}/members`, label: "Miembros", icon: Users },
    { href: `/org/${orgId}/groups`, label: "Grupos", icon: UsersRound },
    { href: `/org/${orgId}/attendance`, label: "Reportes", icon: CalendarPlus },
    { href: `/org/${orgId}/readers`, label: "Lectores", icon: Router },
    { href: `/org/${orgId}/billing`, label: "Facturación", icon: Receipt },
  ];

  return (
    <div className="bg-[var(--color-lavender-mist)] dark:bg-zinc-950 flex h-screen overflow-hidden text-[var(--color-carbon-black)] dark:text-gray-100">
      {/* Barra Lateral (Sidebar) */}
      <aside className="w-64 bg-[var(--color-carbon-black)] dark:bg-zinc-900 flex flex-col justify-between shadow-xl z-20">
        <div>
          {/* Encabezado del Logo */}
          <div className="p-6">
            <h1 className="text-[var(--color-tropical-teal)] text-2xl font-bold tracking-wide flex items-center gap-2">
              <Nfc className="w-6 h-6" />
              Secure Pass
            </h1>
            <p className="text-[var(--color-lavender-mist)] text-xs opacity-60 mt-1 uppercase tracking-wider font-semibold">
              Panel de Organización
            </p>
          </div>
          
          <nav className="px-4 space-y-2 mt-4 relative">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-300 ${
                    isActive
                      ? "text-[var(--color-tropical-teal)]"
                      : "text-[var(--color-lavender-mist)] hover:bg-white/5 hover:text-[var(--color-maya-blue)]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="org-sidebar-active-indicator"
                      className="absolute inset-0 bg-white/10 border-l-4 border-[var(--color-tropical-teal)] rounded-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3 w-full">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-3">
          {isSuperAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-tropical-teal)]/10 text-[var(--color-tropical-teal)] hover:bg-[var(--color-tropical-teal)]/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Panel de Admin
            </Link>
          )}
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--color-lavender-mist)] dark:bg-zinc-950">
        <header className="bg-white dark:bg-zinc-900 px-8 py-5 shadow-sm border-b border-gray-100 dark:border-white/10 z-10 flex items-center justify-between">
          <h2 className="text-[var(--color-tropical-teal)] text-xl font-bold flex items-center gap-2">
            Panel de Organización
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">Bienvenido</span>
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
