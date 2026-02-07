"use client";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="fixed top-4 left-4 z-[100] rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground -translate-y-full opacity-0 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 outline-none"
    >
      Skip to main content
    </a>
  );
}
