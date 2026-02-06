"use client";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="fixed top-4 left-4 z-[100] rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground -translate-y-full opacity-0 focus:translate-y-0 focus:opacity-100 transition-all duration-150 outline-none"
    >
      Skip to main content
    </a>
  );
}
