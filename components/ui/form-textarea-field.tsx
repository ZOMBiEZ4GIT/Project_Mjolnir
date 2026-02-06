"use client"

import * as React from "react"
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { focusGlow } from "@/lib/animations"

interface FormTextareaFieldProps<T extends FieldValues> {
  name: Path<T>
  label: string
  description?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  rows?: number
}

function FormTextareaFieldComponent<T extends FieldValues>({
  name,
  label,
  description,
  placeholder,
  className,
  disabled,
  rows = 3,
}: FormTextareaFieldProps<T>) {
  const { control } = useFormContext<T>()
  const id = React.useId()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={cn("space-y-2", className)}>
          <Label htmlFor={id} className={cn(error && "text-destructive")}>
            {label}
          </Label>
          <motion.textarea
            {...focusGlow}
            id={id}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            {...field}
            value={field.value ?? ""}
            className={cn(
              "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {description && !error && (
            <p className="text-[0.8rem] text-muted-foreground">{description}</p>
          )}
          {error?.message && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}
        </div>
      )}
    />
  )
}

export { FormTextareaFieldComponent as FormTextareaField, type FormTextareaFieldProps }
