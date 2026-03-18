import { ReactNode } from "react";
import { Link } from "@heroui/link";
import { ThemeSwitch } from "@/components/theme-switch";
import LogoutButton from "@/components/LogoutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-divider flex flex-col bg-[var(--color-carbon-black)] text-[var(--color-lavender-mist)]">
        <div className="p-6">
          <h2 className="text-xl font-bold text-[var(--color-maya-blue)]">Secure Pass</h2>
          <p className="text-small opacity-70">Panel de Super Admin</p>
        </div>
        
        <nav className="flex-1 px-4 flex flex-col gap-2">
          <Link href="/admin" className="w-full p-2 rounded-md hover:bg-white/10 transition-colors text-[var(--color-lavender-mist)]">
            Tablero
          </Link>
          <Link href="/admin/organizations" className="w-full p-2 rounded-md hover:bg-white/10 transition-colors text-[var(--color-lavender-mist)]">
            Organizaciones
          </Link>
          <Link href="/admin/readers" className="w-full p-2 rounded-md hover:bg-white/10 transition-colors text-[var(--color-lavender-mist)]">
            Lectores y Dispositivos
          </Link>
          <Link href="/admin/users" className="w-full p-2 rounded-md hover:bg-white/10 transition-colors text-[var(--color-lavender-mist)]">
            Usuarios
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Tema</span>
            <ThemeSwitch />
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-16 border-b border-divider flex items-center px-8 bg-content1/50 backdrop-blur-md">
          <h1 className="text-xl font-semibold text-[var(--color-tropical-teal)]">Área de Admin</h1>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
