"use client"

import * as React from "react"
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface SelectOption {
  value: string
  label: string
}

interface FormSelectFieldProps<T extends FieldValues> {
  name: Path<T>
  label: string
  description?: string
  placeholder?: string
  options: SelectOption[]
  className?: string
  disabled?: boolean
}

function FormSelectFieldComponent<T extends FieldValues>({
  name,
  label,
  description,
  placeholder,
  options,
  className,
  disabled,
}: FormSelectFieldProps<T>) {
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
          <Select
            value={field.value ?? ""}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={id}
              className={cn(
                error && "border-destructive focus:ring-destructive"
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

export { FormSelectFieldComponent as FormSelectField, type FormSelectFieldProps }
