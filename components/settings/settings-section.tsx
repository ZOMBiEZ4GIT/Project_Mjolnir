"use client";

import type { LucideIcon } from "lucide-react";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  /** Unique value for the accordion item */
  value: string;
  /** Icon displayed next to the section title */
  icon: LucideIcon;
  /** Section title */
  title: string;
  /** Optional description shown below the title */
  description?: string;
  /** Section content */
  children: React.ReactNode;
  /** Additional class names for the content wrapper */
  className?: string;
}

/**
 * SettingsSection
 *
 * Accordion item wrapper for settings page sections.
 * Renders an icon + title in the trigger with optional description,
 * and wraps children in AccordionContent with smooth height animation.
 */
export function SettingsSection({
  value,
  icon: Icon,
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <AccordionItem
      value={value}
      className="rounded-lg border border-border bg-card/50 px-6 data-[state=open]:shadow-card"
    >
      <AccordionTrigger className="py-5 hover:no-underline">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div className="text-left">
            <span className="text-heading-sm text-foreground">
              {title}
            </span>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className={cn("pl-8", className)}>
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
