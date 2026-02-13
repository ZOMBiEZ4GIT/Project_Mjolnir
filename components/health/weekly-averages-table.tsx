"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WeeklyRow {
  weekStart: string;
  avgCaloriesKcal: number | null;
  avgProteinG: number | null;
  avgWeightKg: number | null;
  daysWithData: number;
}

interface WeeklyAveragesTableProps {
  data: WeeklyRow[];
}

/**
 * Table showing weekly average nutritional metrics.
 */
export function WeeklyAveragesTable({ data }: WeeklyAveragesTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week</TableHead>
            <TableHead className="text-right">Avg Calories</TableHead>
            <TableHead className="text-right">Avg Protein</TableHead>
            <TableHead className="text-right">Days</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.weekStart}>
              <TableCell className="font-medium tabular-nums">
                {new Date(row.weekStart + "T00:00:00").toLocaleDateString(
                  "en-AU",
                  { day: "numeric", month: "short" }
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.avgCaloriesKcal !== null
                  ? `${Number(row.avgCaloriesKcal).toLocaleString()} kcal`
                  : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.avgProteinG !== null
                  ? `${Number(row.avgProteinG)}g`
                  : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.daysWithData}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
