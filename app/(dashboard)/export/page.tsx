"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Archive, Loader2, BarChart3, ArrowRightLeft, Camera, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { staggerItem } from "@/lib/animations";

export const dynamic = "force-dynamic";

interface ExportCounts {
  holdings: number;
  transactions: number;
  snapshots: number;
}

type ExportKey = "holdings-csv" | "holdings-json" | "transactions-csv" | "transactions-json" | "snapshots-csv" | "snapshots-json" | "backup";
type ButtonState = "idle" | "downloading" | "success" | "error";

export default function ExportPage() {
  const [counts, setCounts] = useState<ExportCounts>({ holdings: 0, transactions: 0, snapshots: 0 });
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [buttonStates, setButtonStates] = useState<Map<ExportKey, ButtonState>>(new Map());
  const reducedMotion = useReducedMotion();

  const getButtonState = useCallback((key: ExportKey): ButtonState => {
    return (buttonStates.get(key) as ButtonState | undefined) ?? "idle";
  }, [buttonStates]);

  const setButtonState = useCallback((key: ExportKey, state: ButtonState) => {
    setButtonStates(prev => {
      const next = new Map(prev);
      next.set(key, state);
      return next;
    });
  }, []);

  const isAnyDownloading = Array.from(buttonStates.values()).some(s => s === "downloading");

  async function handleDownload(url: string, key: ExportKey, typeName: string, format: string) {
    setButtonState(key, "downloading");
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${typeName.toLowerCase()}-export.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      toast.success(`Exported ${typeName} as ${format.toUpperCase()} — ${filename}`);
      setButtonState(key, "success");
      setTimeout(() => setButtonState(key, "idle"), 1500);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(`Failed to export ${typeName}`);
      setButtonState(key, "error");
      setTimeout(() => setButtonState(key, "idle"), 2000);
    }
  }

  useEffect(() => {
    async function fetchCounts() {
      try {
        const holdingsRes = await fetch("/api/holdings?include_dormant=true");
        if (holdingsRes.ok) {
          const holdingsData = await holdingsRes.json();
          setCounts(prev => ({ ...prev, holdings: holdingsData.length }));
        }

        const transactionsRes = await fetch("/api/transactions");
        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json();
          setCounts(prev => ({ ...prev, transactions: transactionsData.length }));
        }

        const snapshotsRes = await fetch("/api/snapshots");
        if (snapshotsRes.ok) {
          const snapshotsData = await snapshotsRes.json();
          setCounts(prev => ({ ...prev, snapshots: snapshotsData.length }));
        }
      } catch (error) {
        console.error("Failed to fetch export counts:", error);
      } finally {
        setIsLoadingCounts(false);
      }
    }

    fetchCounts();
  }, []);

  const staggerContainerCustom = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08 },
    },
  };

  const exportCards = [
    {
      key: "holdings",
      icon: BarChart3,
      title: "Holdings",
      description: "All holdings including stocks, ETFs, crypto, super, cash, and debt.",
      count: counts.holdings,
      countLabel: "holding",
      csvKey: "holdings-csv" as ExportKey,
      jsonKey: "holdings-json" as ExportKey,
      csvUrl: "/api/export/holdings?format=csv",
      jsonUrl: "/api/export/holdings?format=json",
    },
    {
      key: "transactions",
      icon: ArrowRightLeft,
      title: "Transactions",
      description: "BUY, SELL, and DIVIDEND transaction history.",
      count: counts.transactions,
      countLabel: "transaction",
      csvKey: "transactions-csv" as ExportKey,
      jsonKey: "transactions-json" as ExportKey,
      csvUrl: "/api/export/transactions?format=csv",
      jsonUrl: "/api/export/transactions?format=json",
    },
    {
      key: "snapshots",
      icon: Camera,
      title: "Snapshots",
      description: "Balance snapshots for super, cash, and debt accounts.",
      count: counts.snapshots,
      countLabel: "snapshot",
      csvKey: "snapshots-csv" as ExportKey,
      jsonKey: "snapshots-json" as ExportKey,
      csvUrl: "/api/export/snapshots?format=csv",
      jsonUrl: "/api/export/snapshots?format=json",
    },
  ];

  function renderExportButton(
    key: ExportKey,
    url: string,
    typeName: string,
    format: string,
    disabled: boolean
  ) {
    const state = getButtonState(key);
    const isDownloading = state === "downloading";
    const isDisabled = disabled || isDownloading || isAnyDownloading;

    return (
      <motion.div
        animate={
          state === "success" && !reducedMotion
            ? { scale: [1, 1.05, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownload(url, key, typeName, format)}
          disabled={isDisabled}
          className={cn(
            state === "success" && "text-positive border-positive/30",
            state === "error" && "text-destructive border-destructive/30"
          )}
        >
          {state === "downloading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {state === "success" && <Check className="h-4 w-4" />}
          {state === "error" && <X className="h-4 w-4" />}
          {state === "idle" && <Download className="h-4 w-4" />}
          {state === "downloading" && "Downloading..."}
          {state === "success" && "Downloaded!"}
          {state === "error" && "Failed"}
          {state === "idle" && format.toUpperCase()}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-heading-lg text-foreground mb-2">Export Data</h1>
      <p className="text-body-sm text-muted-foreground mb-8">
        Download your data as CSV or JSON files for backup or external analysis.
      </p>

      <motion.div
        className="grid gap-6 lg:grid-cols-2"
        variants={reducedMotion ? undefined : staggerContainerCustom}
        initial="hidden"
        animate="visible"
      >
        {exportCards.map((card) => {
          const Icon = card.icon;
          const isCardDisabled = isLoadingCounts || card.count === 0;
          return (
            <motion.div
              key={card.key}
              variants={reducedMotion ? undefined : staggerItem}
              className="rounded-2xl border border-border bg-card p-4 sm:p-6 transition-shadow duration-150 hover:shadow-card-hover"
            >
              <div className="flex items-start gap-3 mb-3">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{card.title}</h3>
                  <p className="text-body-sm text-muted-foreground mt-1">{card.description}</p>
                </div>
                {!isLoadingCounts && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
                    {card.count} {card.count === 1 ? card.countLabel : `${card.countLabel}s`}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {renderExportButton(card.csvKey, card.csvUrl, card.title, "csv", isCardDisabled)}
                {renderExportButton(card.jsonKey, card.jsonUrl, card.title, "json", isCardDisabled)}
              </div>
            </motion.div>
          );
        })}

        {/* Full Backup Card */}
        <motion.div
          variants={reducedMotion ? undefined : staggerItem}
          className="rounded-2xl border border-accent/30 bg-card p-4 sm:p-6 transition-shadow duration-150 hover:shadow-card-hover"
        >
          <div className="flex items-start gap-3 mb-3">
            <Archive className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">Full Backup</h3>
              <p className="text-body-sm text-muted-foreground mt-1">
                Complete JSON backup of all your data including holdings, transactions, snapshots, and contributions.
              </p>
            </div>
          </div>
          {!isLoadingCounts && (
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {counts.holdings} {counts.holdings === 1 ? "holding" : "holdings"}
              </span>
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {counts.transactions} {counts.transactions === 1 ? "transaction" : "transactions"}
              </span>
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {counts.snapshots} {counts.snapshots === 1 ? "snapshot" : "snapshots"}
              </span>
            </div>
          )}
          {renderExportButton(
            "backup",
            "/api/export/backup",
            "Full Backup",
            "json",
            isLoadingCounts || (counts.holdings === 0 && counts.transactions === 0 && counts.snapshots === 0)
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
