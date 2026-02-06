"use client";

import { Settings, Globe, Bell, Keyboard, Info } from "lucide-react";
import { EmailPreferences } from "@/components/settings/email-preferences";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";
import { SettingsSection } from "@/components/settings/settings-section";
import { CurrencySelector } from "@/components/ui/currency-selector";
import { useCurrency } from "@/components/providers/currency-provider";
import { Accordion } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/**
 * SettingsPage
 *
 * User settings page for configuring app preferences:
 * - Currency display preferences (display currency, show native currency toggle)
 * - Email reminder preferences (enable/disable, reminder day)
 * - Keyboard shortcuts reference
 * - About section with app info
 */
export default function SettingsPage() {
  const { showNativeCurrency, setShowNativeCurrency, isLoading } = useCurrency();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-7 w-7 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Show skeleton while preferences are loading */}
      {isLoading ? (
        <SettingsSkeleton />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={["currency"]}
          className="space-y-4 max-w-2xl"
        >
          {/* Currency Preferences Section */}
          <SettingsSection
            value="currency"
            icon={Globe}
            title="Currency Preferences"
            description="Control how values are displayed across the dashboard"
          >
            <div className="space-y-6">
              {/* Display Currency */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="display-currency" className="text-muted-foreground text-sm font-medium">
                    Display Currency
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    All values will be converted to this currency
                  </p>
                </div>
                <CurrencySelector
                  compact={false}
                  showLoadingState={true}
                  className="w-[220px]"
                />
              </div>

              {/* Show Native Currency Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-native" className="text-muted-foreground text-sm font-medium">
                    Show Native Currency
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Display values in their original currency instead of converting
                  </p>
                </div>
                {isLoading ? (
                  <div className="h-5 w-9 rounded-full bg-muted animate-pulse" />
                ) : (
                  <Switch
                    id="show-native"
                    checked={showNativeCurrency}
                    onCheckedChange={setShowNativeCurrency}
                  />
                )}
              </div>
            </div>
          </SettingsSection>

          {/* Email Preferences Section */}
          <SettingsSection
            value="email"
            icon={Bell}
            title="Email Reminders"
            description="Configure monthly check-in reminder emails"
          >
            <EmailPreferences />
          </SettingsSection>

          {/* Keyboard Shortcuts Section */}
          <SettingsSection
            value="shortcuts"
            icon={Keyboard}
            title="Keyboard Shortcuts"
            description="Quick access keys for common actions"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Open Command Menu
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quick navigation to any page
                  </p>
                </div>
                <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Close Dialog
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Close any open modal or dialog
                  </p>
                </div>
                <kbd className="inline-flex items-center rounded border border-border bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
                  Esc
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Submit Form
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submit focused form (standard browser behavior)
                  </p>
                </div>
                <kbd className="inline-flex items-center rounded border border-border bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
                  Enter
                </kbd>
              </div>

              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                On Windows/Linux, use <kbd className="inline rounded border border-border bg-muted px-1 text-xs font-mono">Ctrl</kbd> instead of <kbd className="inline rounded border border-border bg-muted px-1 text-xs font-mono">⌘</kbd>
              </p>
            </div>
          </SettingsSection>

          {/* About Section */}
          <SettingsSection
            value="about"
            icon={Info}
            title="About"
            description="Application information"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Application</span>
                <span className="text-sm text-foreground font-medium">Mjolnir</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Purpose</span>
                <span className="text-sm text-foreground">Net Worth Tracker</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Framework</span>
                <span className="text-sm text-foreground">Next.js + TypeScript</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Theme</span>
                <span className="text-sm text-foreground">Dark Mode Only</span>
              </div>
            </div>
          </SettingsSection>
        </Accordion>
      )}
    </div>
  );
}
