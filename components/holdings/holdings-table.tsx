"use client";

import type { Holding } from "@/lib/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Display names for holding types
const HOLDING_TYPE_LABELS: Record<Holding["type"], string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  super: "Superannuation",
  cash: "Cash",
  debt: "Debt",
};

// Order in which types should be displayed
const HOLDING_TYPE_ORDER: Holding["type"][] = [
  "stock",
  "etf",
  "crypto",
  "super",
  "cash",
  "debt",
];

interface HoldingsTableProps {
  holdings: Holding[];
}

function groupHoldingsByType(holdings: Holding[]): Map<Holding["type"], Holding[]> {
  const groups = new Map<Holding["type"], Holding[]>();

  for (const holding of holdings) {
    const existing = groups.get(holding.type) || [];
    groups.set(holding.type, [...existing, holding]);
  }

  return groups;
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const groupedHoldings = groupHoldingsByType(holdings);

  return (
    <div className="space-y-8">
      {HOLDING_TYPE_ORDER.map((type) => {
        const typeHoldings = groupedHoldings.get(type);

        // Skip empty sections
        if (!typeHoldings || typeHoldings.length === 0) {
          return null;
        }

        return (
          <HoldingsTypeSection
            key={type}
            type={type}
            holdings={typeHoldings}
          />
        );
      })}
    </div>
  );
}

interface HoldingsTypeSectionProps {
  type: Holding["type"];
  holdings: Holding[];
}

function HoldingsTypeSection({ type, holdings }: HoldingsTypeSectionProps) {
  const label = HOLDING_TYPE_LABELS[type];
  const showSymbol = type === "stock" || type === "etf" || type === "crypto";

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-3">
        {label}{" "}
        <span className="text-gray-400 font-normal">({holdings.length})</span>
      </h2>
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              {showSymbol && (
                <TableHead className="text-gray-400">Symbol</TableHead>
              )}
              <TableHead className="text-gray-400">Currency</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => (
              <TableRow key={holding.id} className="border-gray-800">
                <TableCell className="text-white font-medium">
                  {holding.name}
                </TableCell>
                {showSymbol && (
                  <TableCell className="text-gray-300">
                    {holding.symbol || "—"}
                  </TableCell>
                )}
                <TableCell className="text-gray-300">
                  {holding.currency}
                </TableCell>
                <TableCell>
                  {holding.isDormant ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                      Dormant
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                      Active
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
