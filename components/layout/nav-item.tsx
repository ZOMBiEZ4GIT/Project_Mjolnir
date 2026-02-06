"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItemProps {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
}

export function NavItemLink({ item, isCollapsed, isActive }: NavItemProps) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-label={isCollapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
      )}
    >
      {isActive && (
        <motion.span
          layoutId="active-nav"
          className="absolute inset-0 rounded-md bg-accent/20 shadow-glow-sm"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className="relative z-10 h-4 w-4 shrink-0" />
      {!isCollapsed && (
        <span className="relative z-10 truncate">{item.label}</span>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return link;
}
