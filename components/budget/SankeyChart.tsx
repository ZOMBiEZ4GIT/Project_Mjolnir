"use client";

import { useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Group } from "@visx/group";
import { Sankey, sankeyJustify } from "@visx/sankey";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import type { SankeyNode, SankeyLink } from "@visx/sankey";
import type { BudgetSummary } from "@/lib/budget/summary";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NodeExtra {
  name: string;
  colour: string;
  type: "income" | "category" | "savings";
  categoryId?: string;
}

interface LinkExtra {
  isOver: boolean;
}

type SNode = SankeyNode<NodeExtra, LinkExtra>;
type SLink = SankeyLink<NodeExtra, LinkExtra>;

interface TooltipData {
  name: string;
  amount: number;
  percent: number;
}

interface SankeyChartProps {
  summary: BudgetSummary;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INCOME_COLOUR = "#8b5cf6";
const SAVINGS_POSITIVE_COLOUR = "#22c55e";
const SAVINGS_NEGATIVE_COLOUR = "#ef4444";
const NODE_WIDTH = 16;
const NODE_PADDING = 14;

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

function buildGraph(summary: BudgetSummary) {
  const income = summary.income.actualCents;
  if (income <= 0) return null;

  // Only include categories that actually have spending (so every node has a link)
  const spentCategories = summary.categories.filter(
    (c) => c.spentCents > 0
  );

  if (spentCategories.length === 0) return null;

  const savingsAmount = summary.totals.savingsCents;
  const includeSavings = savingsAmount > 0;

  // Build nodes: 0=Income, 1..N=categories, optionally N+1=Savings
  const nodes: NodeExtra[] = [
    { name: "Income", colour: INCOME_COLOUR, type: "income" },
  ];

  for (const cat of spentCategories) {
    nodes.push({
      name: cat.categoryName,
      colour: cat.colour,
      type: "category",
      categoryId: cat.categoryId,
    });
  }

  if (includeSavings) {
    nodes.push({
      name: "Savings",
      colour: SAVINGS_POSITIVE_COLOUR,
      type: "savings",
    });
  }

  // Build links: Income → each category (by spent amount), Income → Savings
  const links: Array<{ source: number; target: number; value: number } & LinkExtra> = [];

  spentCategories.forEach((cat, i) => {
    links.push({
      source: 0,
      target: i + 1, // offset by 1 for income node
      value: cat.spentCents,
      isOver: cat.status === "over",
    });
  });

  // Savings link (income → savings)
  if (includeSavings) {
    links.push({
      source: 0,
      target: nodes.length - 1,
      value: savingsAmount,
      isOver: false,
    });
  }

  return { nodes, links };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SankeyChart({ summary, width, height }: SankeyChartProps) {
  const router = useRouter();
  const containerRef = useRef<SVGSVGElement>(null);
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    showTooltip,
    hideTooltip,
  } = useTooltip<TooltipData>();

  const graph = useMemo(() => buildGraph(summary), [summary]);
  const income = summary.income.actualCents;

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      router.push(
        `/budget/transactions?category=${categoryId}&from=${summary.startDate}&to=${summary.endDate}`
      );
    },
    [router, summary.startDate, summary.endDate]
  );

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No budget data to display
      </div>
    );
  }

  const margin = { top: 10, right: 120, bottom: 10, left: 120 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  if (innerWidth <= 0 || innerHeight <= 0) return null;

  return (
    <div className="relative">
      <svg ref={containerRef} width={width} height={height}>
        <Sankey<NodeExtra, LinkExtra>
          root={graph}
          size={[innerWidth, innerHeight]}
          nodeWidth={NODE_WIDTH}
          nodePadding={NODE_PADDING}
          nodeAlign={sankeyJustify}
          nodeId={(d) => d.index?.toString() ?? "0"}
        >
          {({ graph: computed, createPath }) => (
            <Group top={margin.top} left={margin.left}>
              {/* Links */}
              {computed.links.map((link, i) => {
                const linkData = link as SLink;
                const targetNode = linkData.target as SNode;
                const isOver = (linkData as unknown as LinkExtra).isOver;
                const targetColour = (targetNode as SNode).colour ?? "#666";
                const strokeColour = isOver ? "#ef4444" : targetColour;

                return (
                  <path
                    key={`link-${i}`}
                    d={createPath(link) ?? ""}
                    fill="none"
                    stroke={strokeColour}
                    strokeWidth={Math.max(1, link.width ?? 0)}
                    strokeOpacity={0.4}
                    style={{ cursor: targetNode.type === "category" ? "pointer" : "default" }}
                    onMouseMove={(e) => {
                      const amount = link.value ?? 0;
                      const percent = income > 0 ? Math.round((amount / income) * 100) : 0;
                      const svgRect = containerRef.current?.getBoundingClientRect();
                      if (svgRect) {
                        showTooltip({
                          tooltipData: {
                            name: targetNode.name ?? "",
                            amount,
                            percent,
                          },
                          tooltipLeft: e.clientX - svgRect.left,
                          tooltipTop: e.clientY - svgRect.top - 10,
                        });
                      }
                    }}
                    onMouseLeave={hideTooltip}
                    onClick={() => {
                      if (targetNode.type === "category" && targetNode.categoryId) {
                        handleCategoryClick(targetNode.categoryId);
                      }
                    }}
                  />
                );
              })}

              {/* Nodes */}
              {computed.nodes.map((node, i) => {
                const n = node as SNode;
                const x0 = n.x0 ?? 0;
                const x1 = n.x1 ?? 0;
                const y0 = n.y0 ?? 0;
                const y1 = n.y1 ?? 0;
                const nodeHeight = y1 - y0;
                const nodeWidth = x1 - x0;

                if (nodeHeight <= 0) return null;

                const isLeft = n.type === "income";
                const isRight = n.type === "savings";

                return (
                  <g key={`node-${i}`}>
                    <rect
                      x={x0}
                      y={y0}
                      width={nodeWidth}
                      height={nodeHeight}
                      fill={n.colour}
                      rx={3}
                      style={{
                        cursor: n.type === "category" ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (n.type === "category" && n.categoryId) {
                          handleCategoryClick(n.categoryId);
                        }
                      }}
                    />
                    {/* Label */}
                    <text
                      x={isLeft ? x0 - 8 : isRight ? x1 + 8 : x1 + 8}
                      y={y0 + nodeHeight / 2}
                      textAnchor={isLeft ? "end" : "start"}
                      dominantBaseline="middle"
                      className="fill-foreground text-xs"
                      style={{ fontSize: 11 }}
                    >
                      {n.name}
                    </text>
                    <text
                      x={isLeft ? x0 - 8 : isRight ? x1 + 8 : x1 + 8}
                      y={y0 + nodeHeight / 2 + 14}
                      textAnchor={isLeft ? "end" : "start"}
                      dominantBaseline="middle"
                      className="fill-muted-foreground"
                      style={{ fontSize: 10 }}
                    >
                      {formatCents(n.value ?? 0)}
                    </text>
                  </g>
                );
              })}
            </Group>
          )}
        </Sankey>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            backgroundColor: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            pointerEvents: "none",
          }}
        >
          <p className="font-medium">{tooltipData.name}</p>
          <p className="text-muted-foreground">
            {formatCents(tooltipData.amount)} · {tooltipData.percent}% of income
          </p>
        </TooltipWithBounds>
      )}
    </div>
  );
}
