"use client";

import { CurrencyDisplay } from "@/components/ui/currency-display";

/**
 * Test page for CurrencyDisplay component.
 * This page is temporary and will be removed after verification.
 */
export default function TestCurrencyPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        CurrencyDisplay Component Test
      </h1>

      {/* Basic usage */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Basic Usage</h2>
        <div className="space-y-2 text-lg">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground w-32">AUD:</span>
            <CurrencyDisplay
              amount={1234.56}
              currency="AUD"
              data-testid="basic-aud"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground w-32">NZD:</span>
            <CurrencyDisplay
              amount={1234.56}
              currency="NZD"
              data-testid="basic-nzd"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground w-32">USD:</span>
            <CurrencyDisplay
              amount={1234.56}
              currency="USD"
              data-testid="basic-usd"
            />
          </div>
        </div>
      </section>

      {/* Native currency indicator */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          With Native Currency Indicator
        </h2>
        <div className="space-y-2 text-lg">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground w-32">Converted:</span>
            <CurrencyDisplay
              amount={1890.0}
              currency="AUD"
              showNative={true}
              nativeCurrency="USD"
              nativeAmount={1234.56}
              data-testid="with-native"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground w-32">Same currency:</span>
            <CurrencyDisplay
              amount={1234.56}
              currency="AUD"
              showNative={true}
              nativeCurrency="AUD"
              nativeAmount={1234.56}
              data-testid="same-currency"
            />
          </div>
        </div>
      </section>

      {/* Loading state */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Loading State</h2>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground w-32">Loading:</span>
          <CurrencyDisplay
            amount={0}
            currency="AUD"
            isLoading
            data-testid="loading"
          />
        </div>
      </section>

      {/* Compact notation */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Compact Notation</h2>
        <div className="space-y-2 text-lg">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground w-32">Thousands:</span>
            <CurrencyDisplay
              amount={50000}
              currency="AUD"
              compact
              data-testid="compact-thousands"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground w-32">Millions:</span>
            <CurrencyDisplay
              amount={1234567}
              currency="AUD"
              compact
              data-testid="compact-millions"
            />
          </div>
        </div>
      </section>

      {/* Negative numbers */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Negative Numbers</h2>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground w-32">Negative:</span>
          <CurrencyDisplay
            amount={-1234.56}
            currency="AUD"
            data-testid="negative"
          />
        </div>
      </section>

      <p className="text-sm text-muted-foreground mt-8">
        Hover over any value to see the tooltip with full currency details.
      </p>
    </div>
  );
}
