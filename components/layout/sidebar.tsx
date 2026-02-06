"use client";

import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Zap } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { layout } from "@/lib/theme";
import { navItems } from "@/lib/navigation";
import { NavItemLink } from "@/components/layout/nav-item";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const width = isCollapsed ? 64 : layout.sidebarWidth;

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      style={{ width }}
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out",
        "hidden lg:flex"
      )}
    >
      {/* Branding */}
      <div className="flex h-14 items-center border-b border-border px-4">
        {isCollapsed ? (
          <div className="flex w-full items-center justify-center">
            <Zap className="h-6 w-6 text-primary" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-heading-sm text-foreground">Mjolnir</span>
          </div>
        )}
      </div>

      {/* Nav items */}
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

      {/* User section */}
      {hasClerkKey && (
        <div className="border-t border-border px-3 py-3">
          <div
            className={cn(
              "flex items-center",
              isCollapsed ? "justify-center" : "gap-3"
            )}
          >
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
            {!isCollapsed && user?.firstName && (
              <span className="truncate text-body-sm text-muted-foreground">
                {user.firstName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t border-border px-2 py-2">
        <button
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
