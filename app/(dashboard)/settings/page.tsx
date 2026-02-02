"use client";

import { Settings, Globe, Bell, Keyboard } from "lucide-react";
import { EmailPreferences } from "@/components/settings/email-preferences";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";
import { CurrencySelector } from "@/components/ui/currency-selector";
import { useCurrency } from "@/components/providers/currency-provider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/**
 * SettingsPage
 *
 * User settings page for configuring app preferences:
 * - Currency display preferences (display currency, show native currency toggle)
 * - Email reminder preferences (enable/disable, reminder day)
 */
export default function SettingsPage() {
  const { showNativeCurrency, setShowNativeCurrency, isLoading } = useCurrency();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-7 w-7 text-gray-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Show skeleton while preferences are loading */}
      {isLoading ? (
        <SettingsSkeleton />
      ) : (
      <div className="space-y-8 max-w-2xl">
        {/* Currency Preferences Section */}
        <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Currency Preferences</h2>
          </div>

          <div className="space-y-6 pl-8">
            {/* Display Currency */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="display-currency" className="text-gray-300 text-sm font-medium">
                  Display Currency
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  All values will be converted to this currency
                </p>
              </div>
              <CurrencySelector
                compact={false}
                showLoadingState={true}
                className="w-[180px]"
              />
            </div>

            {/* Show Native Currency Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-native" className="text-gray-300 text-sm font-medium">
                  Show Native Currency
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Display values in their original currency instead of converting
                </p>
              </div>
              {isLoading ? (
                <div className="h-5 w-9 rounded-full bg-gray-700 animate-pulse" />
              ) : (
                <Switch
                  id="show-native"
                  checked={showNativeCurrency}
                  onCheckedChange={setShowNativeCurrency}
                />
              )}
            </div>
          </div>
        </section>

        {/* Email Preferences Section */}
        <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Email Reminders</h2>
          </div>

          <EmailPreferences />
        </section>

        {/* Keyboard Shortcuts Section */}
        <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Keyboard className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          </div>

          <div className="space-y-4 pl-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-medium">
                  Open Command Menu
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Quick navigation to any page
                </p>
              </div>
              <kbd className="inline-flex items-center gap-1 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs font-mono text-gray-300">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-medium">
                  Close Dialog
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Close any open modal or dialog
                </p>
              </div>
              <kbd className="inline-flex items-center rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs font-mono text-gray-300">
                Esc
              </kbd>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-medium">
                  Submit Form
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Submit focused form (standard browser behavior)
                </p>
              </div>
              <kbd className="inline-flex items-center rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs font-mono text-gray-300">
                Enter
              </kbd>
            </div>

            <p className="text-xs text-gray-500 pt-2 border-t border-gray-700">
              On Windows/Linux, use <kbd className="inline rounded border border-gray-600 bg-gray-700 px-1 text-xs font-mono">Ctrl</kbd> instead of <kbd className="inline rounded border border-gray-600 bg-gray-700 px-1 text-xs font-mono">⌘</kbd>
            </p>
          </div>
        </section>
      </div>
      )}
    </div>
  );
}
