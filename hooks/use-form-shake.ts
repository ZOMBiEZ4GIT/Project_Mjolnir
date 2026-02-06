"use client";

import { useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Hook that provides an error shake animation on a form container
 * when validation fails on submit. After the shake, focus moves to
 * the first field with an error.
 *
 * Usage:
 * ```tsx
 * const { formRef, triggerShake } = useFormShake();
 *
 * const onSubmit = form.handleSubmit(onValid, () => {
 *   triggerShake();
 * });
 *
 * <form ref={formRef} className={shakeClassName}>...</form>
 * ```
 */
export function useFormShake() {
  const formRef = useRef<HTMLDivElement | HTMLFormElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const triggerShake = useCallback(() => {
    const el = formRef.current;

    if (!shouldReduceMotion) {
      // Apply shake via CSS class
      if (el) {
        el.classList.add("animate-shake");
        const handleEnd = () => {
          el.classList.remove("animate-shake");
          el.removeEventListener("animationend", handleEnd);
        };
        el.addEventListener("animationend", handleEnd);
      }
    }

    // Focus first error field after a tick (let validation UI render)
    requestAnimationFrame(() => {
      if (!el) return;
      // Look for inputs/textareas/selects inside elements with error styling
      const firstError = el.querySelector(
        '[aria-invalid="true"], .border-destructive, [data-invalid]'
      );
      if (firstError) {
        const focusable = firstError.matches("input, textarea, select, [tabindex]")
          ? (firstError as HTMLElement)
          : (firstError.querySelector("input, textarea, select, [tabindex]") as HTMLElement | null);
        focusable?.focus();
      }
    });
  }, [shouldReduceMotion]);

  return { formRef, triggerShake } as const;
}
