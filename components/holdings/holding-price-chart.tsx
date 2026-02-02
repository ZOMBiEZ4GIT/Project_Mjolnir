"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
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
 * Loading skeleton for the chart.
 */
function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-gray-700/50 rounded flex items-end justify-around px-4 pb-4">
        {[40, 60, 45, 70, 55, 80, 65, 90, 75, 85, 70, 95].map((h, i) => (
          <div
            key={i}
            className="w-4 bg-gray-600 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
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
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-gray-400 text-sm mb-2">{formatDateFull(data.date)}</p>
      <div className="space-y-1">
        <p className="text-white font-medium">
          <span className="text-gray-400">Price: </span>
          {formatCurrency(data.price, currency)}
        </p>
        <p className="text-white font-medium">
          <span className="text-gray-400">Quantity: </span>
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
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { isLoading: currencyLoading } = useCurrency();

  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transactions", holdingId],
    queryFn: () => fetchTransactions(holdingId),
    enabled: isLoaded && isSignedIn && !!holdingId,
  });

  // Show skeleton while loading
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return <ChartSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-4">
        <p className="text-red-400 text-sm">Failed to load transaction history</p>
      </div>
    );
  }

  // No transactions available
  if (!transactions || transactions.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-500 text-center">
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
        <p className="text-gray-400 text-sm">Single transaction recorded:</p>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-gray-400 text-sm">
            {formatDateFull(chartData[0].date)}
          </p>
          <p className="text-white text-lg font-semibold">
            {formatCurrency(chartData[0].price, holdingCurrency)}
          </p>
          <p className="text-gray-300 text-sm">
            Quantity: {chartData[0].quantity.toLocaleString("en-AU")}
          </p>
        </div>
        <p className="text-gray-500 text-xs">
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
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            vertical={false}
          />
          <XAxis
            dataKey="displayDate"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickLine={{ stroke: "#4B5563" }}
            axisLine={{ stroke: "#4B5563" }}
          />
          <YAxis
            yAxisId="price"
            orientation="left"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickLine={{ stroke: "#4B5563" }}
            axisLine={{ stroke: "#4B5563" }}
            tickFormatter={formatPriceCompact}
            domain={[priceMin, priceMax]}
            width={70}
          />
          <YAxis
            yAxisId="quantity"
            orientation="right"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickLine={{ stroke: "#4B5563" }}
            axisLine={{ stroke: "#4B5563" }}
            tickFormatter={formatQuantityCompact}
            domain={[qtyMin, qtyMax]}
            width={50}
          />
          <Tooltip content={<CustomTooltip currency={holdingCurrency} />} />
          <Legend
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => (
              <span className="text-gray-400 text-sm">{value}</span>
            )}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            name="Price"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: "#3B82F6", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }}
          />
          <Line
            yAxisId="quantity"
            type="stepAfter"
            dataKey="quantity"
            name="Quantity"
            stroke="#8B5CF6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: "#8B5CF6", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#8B5CF6", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
