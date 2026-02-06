"use client";

/**
 * SettingsSkeleton
 *
 * Loading skeleton for the settings page. Displays placeholder
 * content matching the accordion section layout.
 * Uses animate-pulse for loading animation.
 */
export function SettingsSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl">
      {/* Currency Preferences Section Skeleton */}
      <div className="rounded-lg border border-border bg-card/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <span className="block h-4 w-40 rounded bg-muted animate-pulse" />
            <span className="block h-3 w-64 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* Email Preferences Section Skeleton */}
      <div className="rounded-lg border border-border bg-card/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <span className="block h-4 w-32 rounded bg-muted animate-pulse" />
            <span className="block h-3 w-56 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Section Skeleton */}
      <div className="rounded-lg border border-border bg-card/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <span className="block h-4 w-36 rounded bg-muted animate-pulse" />
            <span className="block h-3 w-48 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* About Section Skeleton */}
      <div className="rounded-lg border border-border bg-card/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <span className="block h-4 w-16 rounded bg-muted animate-pulse" />
            <span className="block h-3 w-40 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
