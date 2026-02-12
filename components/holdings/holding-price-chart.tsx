"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency } from "@/lib/utils/currency";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartSkeleton, ChartError, ChartExportButton } from "@/components/charts";
import { CHART_GRID, CHART_TEXT, CHART_AXIS, STOCK, ACCENT, NET_WORTH } from "@/lib/chart-palette";
import { useCallback, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

interface Transaction {
  id: string;
  holdingId: string;
  date: string;
  action: "BUY" | "SELL" | "DIVIDEND" | "SPLIT";
  quantity: string;
  unitPrice: string;
  fees: string;
  currency: string;
  notes: string | null;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  price: number;
  quantity: number;
}

interface HoldingPriceChartProps {
  holdingId: string;
  holdingCurrency: Currency;
}

async function fetchTransactions(holdingId: string): Promise<Transaction[]> {
  const response = await fetch(`/api/transactions?holding_id=${holdingId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }
  return response.json();
}

/**
 * Formats a date string to a short display format (e.g., "Jan 24").
 */
function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", { month: "short", day: "2-digit" });
}

/**
 * Formats a date string for tooltip display (e.g., "15 January 2026").
 */
function formatDateFull(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}


/**
 * Custom tooltip component for the chart.
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: ChartDataPoint;
  }>;
  currency: Currency;
}

function CustomTooltip({ active, payload, currency }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-muted-foreground text-sm mb-2">{formatDateFull(data.date)}</p>
      <div className="space-y-1">
        <p className="text-foreground font-medium">
          <span className="text-muted-foreground">Price: </span>
          {formatCurrency(data.price, currency)}
        </p>
        <p className="text-foreground font-medium">
          <span className="text-muted-foreground">Quantity: </span>
          {data.quantity.toLocaleString("en-AU", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })}
        </p>
      </div>
    </div>
  );
}

/**
 * Holding Price Chart Component
 *
 * Displays historical price and quantity data for tradeable holdings (stock/etf/crypto).
 * Data is derived from transaction history.
 *
 * Features:
 * - Shows price history from transactions (unit_price at each buy/sell)
 * - Shows quantity changes over time as a secondary line
 * - X-axis: transaction dates
 * - Y-axis (left): price values
 * - Y-axis (right): quantity held
 * - Hover shows exact values for that date
 * - Dark mode styling
 */
export function HoldingPriceChart({
  holdingId,
  holdingCurrency,
}: HoldingPriceChartProps) {
  const { isLoading: currencyLoading } = useCurrency();
  const queryClient = useQueryClient();
  const chartRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.transactions.byHolding(holdingId),
    queryFn: () => fetchTransactions(holdingId),
    enabled: !!holdingId,
  });

  // Retry handler
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byHolding(holdingId) });
  }, [queryClient, holdingId]);

  // Show skeleton while loading
  if (isLoading || currencyLoading) {
    return <ChartSkeleton variant="line" />;
  }

  // Show error state
  if (error) {
    return (
      <ChartError
        message="Failed to load transaction history"
        onRetry={handleRetry}
      />
    );
  }

  // No transactions available
  if (!transactions || transactions.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          No transaction history available.
          <br />
          Add transactions to see price and quantity history.
        </p>
      </div>
    );
  }

  // Sort transactions by date (ascending)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Build chart data: for each transaction, calculate running quantity and record price
  let runningQuantity = 0;
  const chartData: ChartDataPoint[] = sortedTransactions.map((tx) => {
    const qty = Number(tx.quantity);
    const price = Number(tx.unitPrice);

    // Update running quantity based on action
    if (tx.action === "BUY") {
      runningQuantity += qty;
    } else if (tx.action === "SELL") {
      runningQuantity -= qty;
    }
    // DIVIDEND and SPLIT don't change quantity in the same way
    // For now, we'll ignore them for quantity tracking

    return {
      date: tx.date,
      displayDate: formatDateShort(tx.date),
      price,
      quantity: runningQuantity,
    };
  });

  // If we only have 1 data point, we can't draw a meaningful line
  // Add a slight visual indication
  if (chartData.length === 1) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-sm">Single transaction recorded:</p>
        <div className="bg-card rounded-lg p-4 text-center">
          <p className="text-muted-foreground text-sm">
            {formatDateFull(chartData[0].date)}
          </p>
          <p className="text-foreground text-lg font-semibold">
            {formatCurrency(chartData[0].price, holdingCurrency)}
          </p>
          <p className="text-muted-foreground text-sm">
            Quantity: {chartData[0].quantity.toLocaleString("en-AU")}
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          Add more transactions to see a chart.
        </p>
      </div>
    );
  }

  // Calculate Y-axis domains
  const prices = chartData.map((d) => d.price);
  const quantities = chartData.map((d) => d.quantity);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1 || maxPrice * 0.1 || 1;
  const priceMin = Math.max(0, minPrice - pricePadding);
  const priceMax = maxPrice + pricePadding;

  const minQty = Math.min(...quantities);
  const maxQty = Math.max(...quantities);
  const qtyRange = maxQty - minQty;
  const qtyPadding = qtyRange * 0.1 || maxQty * 0.1 || 1;
  const qtyMin = Math.max(0, minQty - qtyPadding);
  const qtyMax = maxQty + qtyPadding;

  // Format functions for axes
  const formatPriceCompact = (value: number): string => {
    return formatCurrency(value, holdingCurrency, { compact: true });
  };

  const formatQuantityCompact = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toLocaleString("en-AU", { maximumFractionDigits: 2 });
  };

  return (
    <motion.div {...(reducedMotion ? {} : fadeIn)}>
      <div className="flex justify-end mb-4">
        <ChartExportButton
          chartRef={chartRef}
          filename="holding-price-history"
        />
      </div>
      <div ref={chartRef} className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_GRID}
              vertical={false}
            />
            <XAxis
              dataKey="displayDate"
              stroke={CHART_TEXT}
              tick={{ fill: CHART_TEXT, fontSize: 12 }}
              tickLine={{ stroke: CHART_AXIS }}
              axisLine={{ stroke: CHART_AXIS }}
            />
            <YAxis
              yAxisId="price"
              orientation="left"
              stroke={CHART_TEXT}
              tick={{ fill: CHART_TEXT, fontSize: 12 }}
              tickLine={{ stroke: CHART_AXIS }}
              axisLine={{ stroke: CHART_AXIS }}
              tickFormatter={formatPriceCompact}
              domain={[priceMin, priceMax]}
              width={70}
            />
            <YAxis
              yAxisId="quantity"
              orientation="right"
              stroke={CHART_TEXT}
              tick={{ fill: CHART_TEXT, fontSize: 12 }}
              tickLine={{ stroke: CHART_AXIS }}
              axisLine={{ stroke: CHART_AXIS }}
              tickFormatter={formatQuantityCompact}
              domain={[qtyMin, qtyMax]}
              width={50}
            />
            <Tooltip content={<CustomTooltip currency={holdingCurrency} />} />
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => (
                <span className="text-muted-foreground text-sm">{value}</span>
              )}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              name="Price"
              stroke={STOCK}
              strokeWidth={2}
              dot={{ fill: STOCK, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: STOCK, stroke: NET_WORTH, strokeWidth: 2 }}
            />
            <Line
              yAxisId="quantity"
              type="stepAfter"
              dataKey="quantity"
              name="Quantity"
              stroke={ACCENT}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: ACCENT, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: ACCENT, stroke: NET_WORTH, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
