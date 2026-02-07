"use client";

import { useCallback, useEffect, useState } from "react";

import { layout } from "@/lib/theme";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandMenu } from "@/components/command-menu";

const STORAGE_KEY = "mjolnir-sidebar-collapsed";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsCollapsed(true);
    }
    setMounted(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const sidebarWidth = isCollapsed ? 64 : layout.sidebarWidth;

  return (
    <>
      {/* Desktop sidebar */}
      <Sidebar isCollapsed={isCollapsed} onToggleCollapsed={toggleCollapsed} />

      {/* Mobile navigation */}
      <MobileNav />

      {/* Main content area */}
      <main
        id="main-content"
        style={
          {
            "--sidebar-width": `${mounted ? sidebarWidth : layout.sidebarWidth}px`,
          } as React.CSSProperties
        }
        className="min-h-screen ml-0 lg:ml-[var(--sidebar-width)] transition-[margin-left] duration-200 ease-in-out pt-14 lg:pt-0"
      >
        <div
          className="mx-auto p-4 lg:p-6"
          style={{ maxWidth: layout.maxContentWidth }}
        >
          {children}
        </div>
      </main>

      {/* Command menu */}
      <CommandMenu />
    </>
  );
}
