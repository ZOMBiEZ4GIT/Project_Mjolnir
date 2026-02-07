"use client";

import { useRef, useState, useEffect } from "react";
import { SankeyChart } from "./SankeyChart";
import type { BudgetSummary } from "@/lib/budget/summary";

const CHART_HEIGHT = 320;

interface SankeyChartContainerProps {
  summary: BudgetSummary;
}

export function SankeyChartContainer({ summary }: SankeyChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full hidden md:block">
      {width > 0 && (
        <SankeyChart summary={summary} width={width} height={CHART_HEIGHT} />
      )}
    </div>
  );
}
