"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import LogoutButton from "@/components/LogoutButton";
import { Nfc, LayoutDashboard, Calendar, ListChecks, BarChart3, UserCircle } from "lucide-react";

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/user", label: "Inicio", icon: LayoutDashboard },
    { href: "/user/schedules", label: "Horarios", icon: Calendar },
    { href: "/user/tasks", label: "Tareas", icon: ListChecks },
    { href: "/user/metrics", label: "Métricas", icon: BarChart3 },
    { href: "/user/profile", label: "Perfil", icon: UserCircle },
  ];

  return (
    <div className="bg-[var(--color-lavender-mist)] flex h-screen overflow-hidden text-[var(--color-carbon-black)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--color-carbon-black)] flex flex-col justify-between shadow-xl z-20">
        <div>
          <div className="p-6">
            <h1 className="text-[var(--color-tropical-teal)] text-2xl font-bold tracking-wide flex items-center gap-2">
              <Nfc className="w-6 h-6" />
              Secure Pass
            </h1>
            <p className="text-[var(--color-lavender-mist)] text-xs opacity-60 mt-1 uppercase tracking-wider font-semibold">
              Panel de Usuario
            </p>
          </div>

          <nav className="px-4 space-y-2 mt-4 relative">
            {navItems.map((item) => {
              const isActive =
                item.href === "/user"
                  ? pathname === "/user"
                  : pathname.startsWith(item.href);
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
                      layoutId="user-sidebar-active-indicator"
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

        <div className="p-4 border-t border-white/10 space-y-4">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--color-lavender-mist)]">
        <header className="bg-white px-8 py-5 shadow-sm border-b border-gray-100 z-10 flex items-center justify-between">
          <h2 className="text-[var(--color-tropical-teal)] text-xl font-bold flex items-center gap-2">
            Mi Panel
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Bienvenido</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
