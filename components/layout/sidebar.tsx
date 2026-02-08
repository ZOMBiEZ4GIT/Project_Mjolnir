"use client";

import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Zap, ChevronDown } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { layout } from "@/lib/theme";
import { navItems } from "@/lib/navigation";
import { NavItemLink } from "@/components/layout/nav-item";
import { UncategorisedBadge } from "@/components/layout/uncategorised-badge";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [budgetExpanded, setBudgetExpanded] = useState(() =>
    pathname.startsWith("/budget")
  );

  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const width = isCollapsed ? 64 : layout.sidebarWidth;

  const isBudgetSection = pathname.startsWith("/budget");

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
        {navItems.map((item) => {
          if (item.children) {
            // Collapsible group (Budget)
            const isGroupActive = isBudgetSection;
            const showChildren = isCollapsed ? false : (budgetExpanded || isGroupActive);

            return (
              <div key={item.href}>
                {/* Group header */}
                {isCollapsed ? (
                  <NavItemLink
                    item={item}
                    isCollapsed={isCollapsed}
                    isActive={isGroupActive}
                  />
                ) : (
                  <button
                    onClick={() => setBudgetExpanded(!budgetExpanded)}
                    className={cn(
                      "relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isGroupActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        showChildren && "rotate-180"
                      )}
                    />
                  </button>
                )}

                {/* Sub-links */}
                {showChildren && (
                  <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-2">
                    {item.children.map((child) => {
                      const isChildActive =
                        child.href === "/budget"
                          ? pathname === "/budget"
                          : pathname === child.href ||
                            pathname.startsWith(child.href + "/");
                      return (
                        <NavItemLink
                          key={child.href}
                          item={child}
                          isCollapsed={false}
                          isActive={isChildActive}
                          badge={
                            child.href === "/budget/transactions" ? (
                              <UncategorisedBadge />
                            ) : undefined
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular nav item
          return (
            <NavItemLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
              isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
            />
          );
        })}
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
