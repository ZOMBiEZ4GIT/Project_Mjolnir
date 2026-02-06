"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency } from "@/lib/utils/currency";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { LineChart as LineChartIcon, BarChart3 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/animations";
import { AssetsVsDebtChart } from "./assets-vs-debt-chart";
import {
  ChartSkeleton,
  ChartError,
  ChartExportButton,
  TVChart,
  TimeRangeSelector,
  TIME_RANGE_OPTIONS,
  type TVDataPoint,
  type TVCrosshairData,
  type TimeRange,
} from "@/components/charts";
import type { Time } from "lightweight-charts";

interface HistoryPoint {
  date: string;
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
}

interface HistoryResponse {
  history: HistoryPoint[];
  generatedAt: string;
}

/**
 * Chart view modes.
 */
type ChartViewMode = "networth" | "assetsvsdebt";

const DEFAULT_TIME_RANGE: TimeRange = "1y";
const CHART_VIEW_STORAGE_KEY = "net-worth-chart-view";

async function fetchHistory(months: number): Promise<HistoryResponse> {
  const response = await fetch(`/api/net-worth/history?months=${months}`);
  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }
  return response.json();
}

/**
 * Formats a TradingView Time value for tooltip display (e.g., "January 2026").
 */
function formatTimeFull(time: Time): string {
  const str = String(time);
  const date = new Date(str);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

/**
 * Chart view toggle component.
 */
interface ChartViewToggleProps {
  viewMode: ChartViewMode;
  onChange: (mode: ChartViewMode) => void;
}

function ChartViewToggle({ viewMode, onChange }: ChartViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1" role="tablist" aria-label="Chart view">
      <button
        role="tab"
        aria-selected={viewMode === "networth"}
        onClick={() => onChange("networth")}
        className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-md text-sm font-medium transition-colors ${
          viewMode === "networth"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Net Worth only"
      >
        <LineChartIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Net Worth</span>
      </button>
      <button
        role="tab"
        aria-selected={viewMode === "assetsvsdebt"}
        onClick={() => onChange("assetsvsdebt")}
        className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-md text-sm font-medium transition-colors ${
          viewMode === "assetsvsdebt"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Assets vs Debt comparison"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="hidden sm:inline">Assets vs Debt</span>
      </button>
    </div>
  );
}

/**
 * Net Worth History Chart
 *
 * Displays a TradingView area chart for Net Worth view and Recharts for Assets vs Debt.
 * Features:
 * - TradingView Lightweight Charts with purple gradient fill for Net Worth view
 * - Time range selector: 3M, 6M, 1Y, All
 * - Default selection is 12 months (1Y)
 * - URL param ?range=3m persists selection
 * - Custom tooltip styled with design tokens
 * - Fade-in animation on mount (200ms)
 * - Keeps Recharts AssetsVsDebtChart for Assets vs Debt view
 * - Export button uses html2canvas on chart container
 */
export function NetWorthChart() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading, convert } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const chartRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Tooltip state for TradingView crosshair
  const [tooltipData, setTooltipData] = useState<TVCrosshairData | null>(null);

  // Chart view mode state with localStorage persistence
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("networth");

  // Load chart view preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CHART_VIEW_STORAGE_KEY);
    if (stored === "networth" || stored === "assetsvsdebt") {
      setChartViewMode(stored);
    }
  }, []);

  // Handle chart view mode change
  const handleChartViewChange = (mode: ChartViewMode) => {
    setChartViewMode(mode);
    localStorage.setItem(CHART_VIEW_STORAGE_KEY, mode);
  };

  // Get time range from URL param, default to 1Y
  const rangeParam = searchParams.get("range") as TimeRange | null;
  const selectedRange: TimeRange =
    rangeParam && TIME_RANGE_OPTIONS.some((opt) => opt.value === rangeParam)
      ? rangeParam
      : DEFAULT_TIME_RANGE;

  // Get months for the selected range
  const selectedOption = TIME_RANGE_OPTIONS.find((opt) => opt.value === selectedRange);
  const months = selectedOption?.months ?? 12;

  // Handle range change by updating URL param
  const handleRangeChange = useCallback(
    (newRange: TimeRange) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newRange === DEFAULT_TIME_RANGE) {
        params.delete("range");
      } else {
        params.set("range", newRange);
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const {
    data: historyData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["net-worth-history", months],
    queryFn: () => fetchHistory(months),
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000,
  });

  // Retry handler
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["net-worth-history", months] });
  }, [queryClient, months]);

  // Transform data for TradingView — sorted by date ascending, time as YYYY-MM-DD string
  const tvData: TVDataPoint[] = useMemo(() => {
    if (!historyData?.history) return [];
    return historyData.history.map((point) => ({
      time: point.date as Time,
      value: convert(point.netWorth, "AUD"),
    }));
  }, [historyData, convert]);

  // Handle crosshair move from TradingView chart
  const handleCrosshairMove = useCallback((data: TVCrosshairData | null) => {
    setTooltipData(data);
  }, []);

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return (
      <ChartSkeleton
        title="Net Worth History"
        variant="line"
        withContainer
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <ChartError
        message="Failed to load net worth history"
        onRetry={handleRetry}
        withContainer
      />
    );
  }

  // No data available
  if (!historyData || !historyData.history) {
    return (
      <ChartSkeleton
        title="Net Worth History"
        variant="line"
        withContainer
      />
    );
  }

  // Empty state
  if (tvData.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-label uppercase text-muted-foreground">
            Net Worth History
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <ChartViewToggle
              viewMode={chartViewMode}
              onChange={handleChartViewChange}
            />
            <TimeRangeSelector
              value={selectedRange}
              onChange={handleRangeChange}
            />
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            No historical data available yet.
            <br />
            Data will appear after your first month of tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      {...(reducedMotion ? {} : fadeIn)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h3 className="text-label uppercase text-muted-foreground">
          Net Worth History
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <ChartExportButton
            chartRef={chartRef}
            filename="net-worth-history"
          />
          <ChartViewToggle
            viewMode={chartViewMode}
            onChange={handleChartViewChange}
          />
          <TimeRangeSelector
            value={selectedRange}
            onChange={handleRangeChange}
          />
        </div>
      </div>

      <div ref={chartRef} className="h-[264px]" role="img" aria-label="Net worth history chart">
        <AnimatePresence mode="wait">
          {chartViewMode === "networth" ? (
            <motion.div
              key="networth"
              className="relative h-[264px]"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
            >
              <TVChart
                data={tvData}
                height={264}
                onCrosshairMove={handleCrosshairMove}
              />
              {/* Custom tooltip overlay */}
              {tooltipData && (
                <div
                  className="pointer-events-none absolute z-10 bg-card border border-border rounded-lg p-3 shadow-lg"
                  style={{
                    left: Math.min(
                      tooltipData.x + 12,
                      (chartRef.current?.clientWidth ?? 400) - 180
                    ),
                    top: Math.max(tooltipData.y - 60, 0),
                  }}
                >
                  <p className="text-muted-foreground text-sm mb-1">
                    {formatTimeFull(tooltipData.time)}
                  </p>
                  <p className="text-foreground font-semibold text-lg">
                    {formatCurrency(tooltipData.value, displayCurrency)}
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="assetsvsdebt"
              className="h-[264px]"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
            >
              <AssetsVsDebtChart data={historyData.history} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
