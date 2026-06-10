"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "./SidebarContext";
import { Tooltip } from "@heroui/tooltip";
import { Nfc, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  navItems: NavItem[];
  roleLabel: string;
  headerTitle?: string;
  footerContent?: React.ReactNode | ((props: { showFull: boolean }) => React.ReactNode);
  activeLayoutId: string;
}

export default function Sidebar({
  navItems,
  roleLabel,
  headerTitle = "Secure Pass",
  footerContent,
  activeLayoutId,
}: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed, isOpenMobile, setIsOpenMobile } = useSidebar();

  const isLinkActive = (itemHref: string) => {
    if (itemHref.startsWith("/user")) {
      return itemHref === "/user" ? pathname === "/user" : pathname.startsWith(itemHref);
    }
    return pathname === itemHref;
  };

  // Variantes para la animación de colapso en escritorio
  const sidebarVariants = {
    expanded: { width: 256, transition: { type: "spring", stiffness: 300, damping: 30 } },
    collapsed: { width: 80, transition: { type: "spring", stiffness: 300, damping: 30 } },
  };

  const textVariants = {
    expanded: { opacity: 1, width: "auto", display: "inline-block", transition: { duration: 0.2 } },
    collapsed: { opacity: 0, width: 0, transitionEnd: { display: "none" }, transition: { duration: 0.1 } },
  };

  // Contenido interno del sidebar
  const renderSidebarContent = (isMobileView = false) => {
    const showFull = isMobileView || !isCollapsed;

    return (
      <div className="flex flex-col h-full justify-between bg-[var(--color-carbon-black)] dark:bg-zinc-900 text-white select-none">
        <div>
          {/* Encabezado del Logo */}
          <div className={`p-6 flex items-center justify-between border-b border-white/5`}>
            <div className={`flex items-center gap-3 overflow-hidden ${!showFull && "justify-center w-full"}`}>
              <Nfc className="w-6 h-6 text-[var(--color-tropical-teal)] flex-shrink-0" />
              {showFull && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col"
                >
                  <h1 className="text-xl font-bold tracking-wide text-[var(--color-tropical-teal)] whitespace-nowrap">
                    {headerTitle}
                  </h1>
                  <p className="text-[var(--color-lavender-mist)] text-[10px] opacity-60 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {roleLabel}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Botón de Colapsar (Escritorio) */}
            {!isMobileView && showFull && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Contraer menú"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            {/* Botón de Cerrar (Móvil) */}
            {isMobileView && (
              <button
                onClick={() => setIsOpenMobile(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Botón para Expandir cuando está colapsado (Escritorio) */}
          {!isMobileView && !showFull && (
            <div className="flex justify-center py-4 border-b border-white/5">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--color-tropical-teal)] hover:scale-105 transition-all cursor-pointer"
                title="Expandir menú"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Navegación */}
          <nav className="px-4 space-y-2 mt-6 relative">
            {navItems.map((item) => {
              const isActive = isLinkActive(item.href);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobileView && setIsOpenMobile(false)}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-300 cursor-pointer ${
                    isActive
                      ? "text-[var(--color-tropical-teal)]"
                      : "text-[var(--color-lavender-mist)] hover:bg-white/5 hover:text-[var(--color-maya-blue)]"
                  } ${!showFull ? "justify-center" : ""}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId={`${activeLayoutId}-active-indicator`}
                      className="absolute inset-0 bg-white/10 border-l-4 border-[var(--color-tropical-teal)] rounded-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-3 ${!showFull ? "justify-center" : "w-full"}`}>
                    <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-300 hover:scale-110" />
                    <motion.span
                      variants={textVariants}
                      animate={showFull ? "expanded" : "collapsed"}
                      className="font-medium overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  </span>
                </Link>
              );

              // Usar Tooltip solo si está colapsado en escritorio
              if (!showFull) {
                return (
                  <Tooltip
                    key={item.href}
                    content={item.label}
                    placement="right"
                    color="foreground"
                    closeDelay={100}
                    className="font-semibold text-xs py-1.5 px-3 rounded-lg dark:bg-zinc-800"
                  >
                    {linkContent}
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>
        </div>

        {/* Pie de la barra lateral */}
        <div className={`p-4 border-t border-white/5 space-y-4 ${!showFull && "flex flex-col items-center"}`}>
          {footerContent ? (
            typeof footerContent === "function" ? (
              // @ts-ignore
              footerContent({ showFull })
            ) : (
              footerContent
            )
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. SIDEBAR DE ESCRITORIO (Visible a partir de lg: 1024px) */}
      <motion.aside
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        className="hidden lg:flex flex-col h-screen overflow-hidden shadow-xl z-20 bg-[var(--color-carbon-black)] dark:bg-zinc-900 border-r border-white/5"
      >
        {renderSidebarContent(false)}
      </motion.aside>

      {/* 2. DRAWER DE MÓVIL (Con Backdrop y deslizable, visible en resoluciones menores) */}
      <AnimatePresence>
        {isOpenMobile && (
          <>
            {/* Backdrop oscuro translúcido con efecto blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpenMobile(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Contenedor del Drawer deslizante */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="lg:hidden fixed top-0 bottom-0 left-0 w-64 h-full bg-[var(--color-carbon-black)] dark:bg-zinc-900 z-50 shadow-2xl overflow-hidden"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
