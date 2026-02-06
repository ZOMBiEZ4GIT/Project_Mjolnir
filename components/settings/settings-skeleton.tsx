"use client";

/**
 * SettingsSkeleton
 *
 * Loading skeleton for the settings page. Displays placeholder
 * content matching the layout of the currency and email preferences sections.
 * Uses animate-pulse for loading animation.
 */
export function SettingsSkeleton() {
  return (
    <div className="space-y-8 max-w-2xl">
      {/* Currency Preferences Section Skeleton */}
      <section className="rounded-lg border border-border bg-card/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-5 w-5 rounded bg-muted animate-pulse" />
          <span className="h-5 w-40 rounded bg-muted animate-pulse" />
        </div>

        <div className="space-y-6 pl-8">
          {/* Display Currency row skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="block h-4 w-28 rounded bg-muted animate-pulse" />
              <span className="block h-3 w-56 rounded bg-muted animate-pulse" />
            </div>
            <span className="h-9 w-[180px] rounded bg-muted animate-pulse" />
          </div>

          {/* Show Native Currency row skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="block h-4 w-36 rounded bg-muted animate-pulse" />
              <span className="block h-3 w-72 rounded bg-muted animate-pulse" />
            </div>
            <span className="h-5 w-9 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </section>

      {/* Email Preferences Section Skeleton */}
      <section className="rounded-lg border border-border bg-card/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-5 w-5 rounded bg-muted animate-pulse" />
          <span className="h-5 w-32 rounded bg-muted animate-pulse" />
        </div>

        <div className="space-y-6">
          {/* Email address row skeleton */}
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 rounded bg-muted animate-pulse" />
            <span className="h-4 w-48 rounded bg-muted animate-pulse" />
          </div>

          {/* Settings container skeleton */}
          <div className="space-y-4 pl-8">
            {/* Email reminders toggle skeleton */}
            <div className="flex items-center gap-3">
              <span className="h-5 w-9 rounded-full bg-muted animate-pulse" />
              <span className="h-4 w-52 rounded bg-muted animate-pulse" />
            </div>

            {/* Reminder day selector skeleton */}
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded bg-muted animate-pulse" />
              <span className="h-4 w-32 rounded bg-muted animate-pulse" />
              <span className="h-9 w-[100px] rounded bg-muted animate-pulse" />
              <span className="h-4 w-24 rounded bg-muted animate-pulse" />
            </div>

            {/* Helper text skeleton */}
            <span className="block h-3 w-80 rounded bg-muted animate-pulse pl-7" />

            {/* Test email button skeleton */}
            <div className="pt-2">
              <span className="block h-8 w-32 rounded bg-muted animate-pulse" />
              <span className="block h-3 w-64 rounded bg-muted animate-pulse mt-1" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
