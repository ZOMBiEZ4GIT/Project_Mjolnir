import { useCallback, useRef } from "react";

/**
 * Roving tabindex hook for keyboard navigation within tablists and radiogroups.
 *
 * Handles Left/Right/Home/End arrow key navigation per WAI-ARIA patterns:
 * - ArrowRight/ArrowDown: focus next item (wraps)
 * - ArrowLeft/ArrowUp: focus previous item (wraps)
 * - Home: focus first item
 * - End: focus last item
 *
 * Active item gets tabIndex={0}, inactive items get tabIndex={-1}.
 */
export function useRovingTabIndex<T>(
  items: readonly T[],
  activeValue: T,
  onChange: (value: T) => void
) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = items.indexOf(activeValue);
      if (currentIndex === -1) return;

      let nextIndex: number | null = null;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (currentIndex + 1) % items.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (currentIndex - 1 + items.length) % items.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = items.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      onChange(items[nextIndex]);

      // Focus the newly activated button
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"], [role="radio"]'
      );
      buttons?.[nextIndex]?.focus();
    },
    [items, activeValue, onChange]
  );

  const getTabIndex = useCallback(
    (value: T) => (value === activeValue ? 0 : -1),
    [activeValue]
  );

  return { containerRef, handleKeyDown, getTabIndex };
}
