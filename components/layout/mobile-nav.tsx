"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Zap, ChevronDown } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { navItems } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { UncategorisedBadge } from "@/components/layout/uncategorised-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [budgetExpanded, setBudgetExpanded] = useState(() =>
    pathname.startsWith("/budget")
  );

  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const isBudgetSection = pathname.startsWith("/budget");

  return (
    <>
      {/* Mobile header bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center border-b border-border bg-card px-4 lg:hidden">
        {/* Hamburger button (left) */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          onClick={() => setOpen(true)}
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Branding (center) */}
        <div className="flex flex-1 items-center justify-center">
          <Zap className="mr-2 h-5 w-5 text-primary" />
          <span className="text-heading-sm text-foreground">Mjolnir</span>
        </div>

        {/* UserButton (right) */}
        <div className="shrink-0">
          {hasClerkKey ? (
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          ) : (
            <div className="w-8" />
          )}
        </div>
      </header>

      {/* Navigation drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-card border-border p-0">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="flex items-center gap-2 text-left">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-heading-sm text-foreground">Mjolnir</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-2 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;

              if (item.children) {
                const isGroupActive = isBudgetSection;
                const showChildren = budgetExpanded || isGroupActive;

                return (
                  <div key={item.href}>
                    {/* Group header */}
                    <button
                      onClick={() => setBudgetExpanded(!budgetExpanded)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isGroupActive
                          ? "bg-accent/20 text-foreground"
                          : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                          showChildren && "rotate-180"
                        )}
                      />
                    </button>

                    {/* Sub-links */}
                    {showChildren && (
                      <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-2">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive =
                            child.href === "/budget"
                              ? pathname === "/budget"
                              : pathname === child.href ||
                                pathname.startsWith(child.href + "/");
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isChildActive
                                  ? "bg-accent/20 text-foreground"
                                  : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                              )}
                            >
                              <ChildIcon className="h-4 w-4 shrink-0" />
                              <span>{child.label}</span>
                              {child.href === "/budget/transactions" && (
                                <UncategorisedBadge />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Regular nav item
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive
                      ? "bg-accent/20 text-foreground"
                      : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
