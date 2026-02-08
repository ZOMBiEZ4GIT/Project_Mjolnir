"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaySplitItem {
  saverName: string;
  percentage: number;
  amountCents: number;
}

interface PaySplitConfigProps {
  paySplitConfig: PaySplitItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPercentage(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaySplitConfig({ paySplitConfig }: PaySplitConfigProps) {
  const [copied, setCopied] = useState(false);

  const totalPercentage = paySplitConfig.reduce(
    (sum, item) => sum + item.percentage,
    0
  );
  const spendingPercentage = Math.max(0, 100 - totalPercentage);

  async function handleCopy() {
    const lines = paySplitConfig.map(
      (item) =>
        `${item.saverName}: ${formatPercentage(item.percentage)} (${formatCents(item.amountCents)})`
    );
    if (spendingPercentage > 0) {
      lines.push(
        `Spending: ${formatPercentage(spendingPercentage)} (remainder)`
      );
    }
    const text = `UP Pay Split Config\n${lines.join("\n")}`;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (paySplitConfig.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Recommended Pay Split
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                Saver
              </th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                Percentage
              </th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {paySplitConfig.map((item) => (
              <tr
                key={item.saverName}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-2 text-foreground">
                  {item.saverName}
                </td>
                <td className="px-3 py-2 text-right text-foreground font-medium tabular-nums">
                  {formatPercentage(item.percentage)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                  {formatCents(item.amountCents)}
                </td>
              </tr>
            ))}
            {spendingPercentage > 0 && (
              <tr className="bg-muted/20">
                <td className="px-3 py-2 text-muted-foreground italic">
                  Spending
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground font-medium tabular-nums">
                  {formatPercentage(spendingPercentage)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums italic">
                  remainder
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        Total allocated: {formatPercentage(totalPercentage)} — remaining{" "}
        {formatPercentage(spendingPercentage)} goes to your spending account.
      </p>
    </section>
  );
}
