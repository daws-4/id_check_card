"use client";

import { ReactNode } from "react";
import { Link } from "@heroui/link";
import { ThemeSwitch } from "@/components/theme-switch";
import { useParams } from "next/navigation";

export default function OrgLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const orgId = params?.orgId as string;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-divider flex flex-col bg-content1/30">
        <div className="p-6">
          <h2 className="text-xl font-bold">Secure Pass</h2>
          <p className="text-small text-default-500">Organization Panel</p>
        </div>
        
        <nav className="flex-1 px-4 flex flex-col gap-2">
          <Link href={`/org/${orgId}`} className="w-full p-2 rounded-md hover:bg-default-100 transition-colors">
            Dashboard
          </Link>
          <Link href={`/org/${orgId}/members`} className="w-full p-2 rounded-md hover:bg-default-100 transition-colors">
            Members
          </Link>
          <Link href={`/org/${orgId}/attendance`} className="w-full p-2 rounded-md hover:bg-default-100 transition-colors">
            Attendance Reports
          </Link>
        </nav>

        <div className="p-4 border-t border-divider flex items-center justify-between">
          <span className="text-sm border-r pr-4 border-divider">Theme</span>
          <ThemeSwitch />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-divider flex items-center px-8 bg-content1/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
