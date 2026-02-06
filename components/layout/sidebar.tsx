"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { layout } from "@/lib/theme";
import { navItems } from "@/lib/navigation";
import { NavItemLink } from "@/components/layout/nav-item";

const STORAGE_KEY = "mjolnir-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
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

  const width = isCollapsed ? 64 : layout.sidebarWidth;

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      style={{ width: mounted ? width : layout.sidebarWidth }}
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out",
        "hidden lg:flex"
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>

      <div className="border-t border-border px-2 py-2">
        <button
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
