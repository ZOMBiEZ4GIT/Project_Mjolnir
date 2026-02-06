"use client"

import { Loader2 } from "lucide-react"
import {
  AnimatedAlertDialog,
  AnimatedAlertDialogAction,
  AnimatedAlertDialogCancel,
  AnimatedAlertDialogContent,
  AnimatedAlertDialogDescription,
  AnimatedAlertDialogFooter,
  AnimatedAlertDialogHeader,
  AnimatedAlertDialogTitle,
} from "@/components/ui/animated-alert-dialog"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AnimatedAlertDialog open={open} onOpenChange={onOpenChange}>
      <AnimatedAlertDialogContent>
        <AnimatedAlertDialogHeader>
          <AnimatedAlertDialogTitle>{title}</AnimatedAlertDialogTitle>
          <AnimatedAlertDialogDescription>
            {description}
          </AnimatedAlertDialogDescription>
        </AnimatedAlertDialogHeader>
        <AnimatedAlertDialogFooter>
          <AnimatedAlertDialogCancel disabled={loading}>
            {cancelLabel}
          </AnimatedAlertDialogCancel>
          <AnimatedAlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-destructive hover:bg-destructive/90 text-foreground"
                : undefined
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </AnimatedAlertDialogAction>
        </AnimatedAlertDialogFooter>
      </AnimatedAlertDialogContent>
    </AnimatedAlertDialog>
  )
}
