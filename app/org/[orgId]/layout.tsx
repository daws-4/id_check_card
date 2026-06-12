"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LayoutDashboard, Users, UsersRound, CalendarPlus, Router, Receipt, ArrowLeft, Activity, Menu, CreditCard } from "lucide-react";
import BillingTrigger from "@/components/BillingTrigger";
import { useSidebar } from "@/components/SidebarContext";
import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("@/components/Sidebar"), { ssr: false });

export default function OrgLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params?.orgId as string;
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [requiresMembership, setRequiresMembership] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { setIsOpenMobile } = useSidebar();

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(s => { if (s?.user?.role === "superadmin") setIsSuperAdmin(true); })
      .catch(() => {});

    if (orgId) {
      fetch(`/api/organizations/${orgId}`)
        .then(r => r.json())
        .then(org => {
          const type = org?.type || "";
          const validationEnabled = type === 'gym' || type === 'membership_venue';
          setRequiresMembership(!!validationEnabled);
        })
        .catch(() => {});
    }
  }, [orgId]);

  const navItems = [
    { href: `/org/${orgId}`, label: "Tablero", icon: LayoutDashboard },
    { href: `/org/${orgId}/members`, label: "Miembros", icon: Users },
    ...((mounted && requiresMembership) ? [{ href: `/org/${orgId}/memberships`, label: "Membresías", icon: CreditCard }] : []),
    { href: `/org/${orgId}/groups`, label: "Grupos", icon: UsersRound },
    { href: `/org/${orgId}/attendance`, label: "Reportes", icon: CalendarPlus },
    { href: `/org/${orgId}/live`, label: "Monitor en vivo", icon: Activity },
    { href: `/org/${orgId}/readers`, label: "Lectores", icon: Router },
    { href: `/org/${orgId}/billing`, label: "Facturación", icon: Receipt },
  ];

  return (
    <div className="bg-[var(--color-lavender-mist)] dark:bg-zinc-950 flex h-screen overflow-hidden text-[var(--color-carbon-black)] dark:text-gray-100">
      <BillingTrigger />
      
      {/* Sidebar Unificado */}
      <Sidebar
        navItems={navItems}
        roleLabel="Panel de Organización"
        activeLayoutId="org-sidebar"
        footerContent={({ showFull }: { showFull: boolean }) => (
          <div className="space-y-3 w-full flex flex-col items-center">
            {isSuperAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-2 rounded-xl text-sm font-medium bg-[var(--color-tropical-teal)]/10 text-[var(--color-tropical-teal)] hover:bg-[var(--color-tropical-teal)]/20 transition-all cursor-pointer ${
                  showFull ? "px-4 py-2.5 w-full" : "w-12 h-12 justify-center p-0"
                }`}
                title={!showFull ? "Panel de Admin" : undefined}
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                {showFull && <span className="whitespace-nowrap overflow-hidden">Panel de Admin</span>}
              </Link>
            )}
            <LogoutButton showText={showFull} />
          </div>
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
              Panel de Organización
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
