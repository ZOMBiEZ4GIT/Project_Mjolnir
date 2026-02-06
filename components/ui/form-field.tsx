"use client"

import * as React from "react"
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { focusGlow } from "@/lib/animations"

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>
  label: string
  description?: string
  placeholder?: string
  type?: React.HTMLInputTypeAttribute
  className?: string
  disabled?: boolean
}

function FormFieldComponent<T extends FieldValues>({
  name,
  label,
  description,
  placeholder,
  type = "text",
  className,
  disabled,
}: FormFieldProps<T>) {
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
          <motion.input
            {...focusGlow}
            id={id}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            {...field}
            value={field.value ?? ""}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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

export { FormFieldComponent as FormField, type FormFieldProps }
