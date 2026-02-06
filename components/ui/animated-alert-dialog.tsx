"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { modalAnimation, reducedMotionOverride } from "@/lib/animations"

const AnimatedAlertDialog = AlertDialogPrimitive.Root

const AnimatedAlertDialogTrigger = AlertDialogPrimitive.Trigger

const AnimatedAlertDialogPortal = AlertDialogPrimitive.Portal

const AnimatedAlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
AnimatedAlertDialogOverlay.displayName = "AnimatedAlertDialogOverlay"

const AnimatedAlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatedAlertDialogPortal>
      <AnimatedAlertDialogOverlay />
      <AlertDialogPrimitive.Content asChild {...props}>
        <motion.div
          ref={ref}
          {...modalAnimation}
          {...(shouldReduceMotion ? reducedMotionOverride : {})}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
            className
          )}
          style={{ x: "-50%", y: "-50%" }}
        >
          {children}
        </motion.div>
      </AlertDialogPrimitive.Content>
    </AnimatedAlertDialogPortal>
  )
})
AnimatedAlertDialogContent.displayName = "AnimatedAlertDialogContent"

const AnimatedAlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AnimatedAlertDialogHeader.displayName = "AnimatedAlertDialogHeader"

const AnimatedAlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AnimatedAlertDialogFooter.displayName = "AnimatedAlertDialogFooter"

const AnimatedAlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AnimatedAlertDialogTitle.displayName = "AnimatedAlertDialogTitle"

const AnimatedAlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AnimatedAlertDialogDescription.displayName = "AnimatedAlertDialogDescription"

const AnimatedAlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AnimatedAlertDialogAction.displayName = "AnimatedAlertDialogAction"

const AnimatedAlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
AnimatedAlertDialogCancel.displayName = "AnimatedAlertDialogCancel"

export {
  AnimatedAlertDialog,
  AnimatedAlertDialogPortal,
  AnimatedAlertDialogOverlay,
  AnimatedAlertDialogTrigger,
  AnimatedAlertDialogContent,
  AnimatedAlertDialogHeader,
  AnimatedAlertDialogFooter,
  AnimatedAlertDialogTitle,
  AnimatedAlertDialogDescription,
  AnimatedAlertDialogAction,
  AnimatedAlertDialogCancel,
}
