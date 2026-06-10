"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(false);
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Cargar estado inicial desde localStorage solo en el cliente
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsedState(saved === "true");
    }
    setMounted(true);
  }, []);

  const setIsCollapsed = (value: boolean) => {
    setIsCollapsedState(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed: mounted ? isCollapsed : false, // Evita discrepancias de hidratación en SSR
        setIsCollapsed,
        isOpenMobile,
        setIsOpenMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
