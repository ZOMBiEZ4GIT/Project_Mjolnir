"use client";

import { useRouter } from "next/navigation";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import type { CategorySummary } from "@/lib/hooks/use-budget-summary";
import { POSITIVE, NEGATIVE, CHART_TEXT } from "@/lib/chart-palette";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WARNING = "#F59E0B"; // amber-500

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryTreemapProps {
  categories: CategorySummary[];
  saverKey: string;
  progressPercent: number;
}

interface TreemapNode {
  [key: string]: string | number | boolean | null;
  name: string;
  categoryKey: string | null;
  size: number;
  amountDollars: number;
  budgetDollars: number;
  percentOfTotal: number;
  percentUsed: number;
  hasBudget: boolean;
  fill: string;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function getCategoryFill(
  cat: CategorySummary,
  progressPercent: number
): string {
  if (cat.budgetCents <= 0) return CHART_TEXT; // no budget = neutral
  const pacePercent = (cat.actualCents / cat.budgetCents) * 100;
  if (pacePercent > progressPercent) return NEGATIVE; // over pace
  if (pacePercent >= progressPercent * 0.85) return WARNING; // near pace
  return POSITIVE; // under pace
}

// ---------------------------------------------------------------------------
// Custom content renderer
// ---------------------------------------------------------------------------

interface ContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  percentOfTotal?: number;
  amountDollars?: number;
}

function TreemapContent(props: ContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, percentOfTotal, amountDollars } = props;

  if (width < 4 || height < 4) return null;

  const showLabel = width > 50 && height > 30;
  const showAmount = width > 60 && height > 48;
  const showPercent = width > 40 && height > 20;

  // Access the fill from the data node via root/index
  const fill = (props as Record<string, unknown>)["fill"] as string | undefined;
  const fillColor = fill ?? CHART_TEXT;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        ry={4}
        fill={fillColor}
        fillOpacity={0.75}
        stroke="hsl(240 6% 10%)"
        strokeWidth={2}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showAmount ? 10 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontSize={Math.min(12, width / 8)}
          fontWeight={500}
        >
          {name}
        </text>
      )}
      {showAmount && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.8)"
          fontSize={Math.min(11, width / 9)}
        >
          ${amountDollars?.toLocaleString()}
        </text>
      )}
      {showPercent && !showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.7)"
          fontSize={10}
        >
          {percentOfTotal}%
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function TreemapTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TreemapNode }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const node = payload[0].payload;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
      <p className="text-sm font-medium text-foreground mb-2">{node.name}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Spent</span>
          <span className="text-foreground font-medium">
            ${node.amountDollars.toLocaleString()}
          </span>
        </div>
        {node.hasBudget && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Budget</span>
            <span className="text-foreground font-medium">
              ${node.budgetDollars.toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">% of saver</span>
          <span className="text-foreground font-medium">
            {node.percentOfTotal}%
          </span>
        </div>
        {node.hasBudget && (
          <div className="flex justify-between gap-4 pt-1 border-t border-border">
            <span className="text-muted-foreground">Used</span>
            <span
              className={
                node.percentUsed > 100
                  ? "text-destructive font-medium"
                  : "text-foreground font-medium"
              }
            >
              {node.percentUsed}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CategoryTreemap({
  categories,
  saverKey,
  progressPercent,
}: CategoryTreemapProps) {
  const router = useRouter();

  // Only show categories with actual spend
  const withSpend = categories.filter((c) => c.actualCents > 0);

  if (withSpend.length === 0) return null;

  const totalActualCents = withSpend.reduce((s, c) => s + c.actualCents, 0);

  const data: TreemapNode[] = withSpend.map((cat) => ({
    name: cat.displayName,
    categoryKey: cat.categoryKey,
    size: cat.actualCents, // Treemap sizes by this
    amountDollars: Math.round(cat.actualCents / 100),
    budgetDollars: Math.round(cat.budgetCents / 100),
    percentOfTotal: Math.round((cat.actualCents / totalActualCents) * 100),
    percentUsed:
      cat.budgetCents > 0
        ? Math.round((cat.actualCents / cat.budgetCents) * 100)
        : 0,
    hasBudget: cat.budgetCents > 0,
    fill: getCategoryFill(cat, progressPercent),
  }));

  const handleClick = (node: TreemapNode) => {
    if (node.categoryKey) {
      router.push(
        `/budget/transactions?saver=${encodeURIComponent(saverKey)}&categoryKey=${encodeURIComponent(node.categoryKey)}`
      );
    }
  };

  return (
    <ChartCard title="Category Breakdown">
      <ResponsiveContainer width="100%" height={200}>
        <Treemap
          data={data}
          dataKey="size"
          stroke="none"
          content={<TreemapContent />}
          isAnimationActive={false}
          onClick={(node) => {
            if (node) handleClick(node as unknown as TreemapNode);
          }}
          style={{ cursor: "pointer" }}
        >
          <Tooltip content={<TreemapTooltip />} />
        </Treemap>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 sm:gap-4 mt-3 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: POSITIVE, opacity: 0.75 }}
          />
          Under pace
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: WARNING, opacity: 0.75 }}
          />
          Near budget
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: NEGATIVE, opacity: 0.75 }}
          />
          Over budget
        </span>
      </div>
    </ChartCard>
  );
}
