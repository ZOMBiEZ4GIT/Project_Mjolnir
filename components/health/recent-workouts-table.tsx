"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
interface Workout {
  id: string;
  workoutDate: string;
  startTime: string;
  workoutType: string;
  durationMinutes: number | null;
  caloriesKcal: number | null;
  avgHr: number | null;
  isIndoor: boolean | null;
}

interface RecentWorkoutsTableProps {
  data: Workout[];
}

/**
 * Table showing recent workout sessions.
 */
export function RecentWorkoutsTable({ data }: RecentWorkoutsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            <TableHead className="text-right">Calories</TableHead>
            <TableHead className="text-right">Avg HR</TableHead>
            <TableHead className="text-right">Indoor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((w) => (
            <TableRow key={w.id}>
              <TableCell className="font-medium tabular-nums whitespace-nowrap">
                {new Date(w.workoutDate + "T00:00:00").toLocaleDateString(
                  "en-AU",
                  { day: "numeric", month: "short", year: "numeric" }
                )}
              </TableCell>
              <TableCell>{w.workoutType}</TableCell>
              <TableCell className="text-right tabular-nums">
                {w.durationMinutes !== null
                  ? `${Math.round(w.durationMinutes)} min`
                  : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {w.caloriesKcal !== null
                  ? `${w.caloriesKcal.toLocaleString()} kcal`
                  : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {w.avgHr !== null ? `${Math.round(w.avgHr)} bpm` : "—"}
              </TableCell>
              <TableCell className="text-right">
                {w.isIndoor === true && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Indoor
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
