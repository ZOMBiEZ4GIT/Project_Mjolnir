"use client";

import dynamic from "next/dynamic";
import type { TVChartWrapperProps } from "./tv-chart-wrapper";

/**
 * SSR-safe TradingView Lightweight Charts wrapper.
 *
 * TradingView requires the DOM to function, so we use `next/dynamic`
 * with `ssr: false` to ensure it only renders on the client.
 */
const TVChart = dynamic<TVChartWrapperProps>(
  () =>
    import("./tv-chart-wrapper").then((mod) => mod.TVChartWrapper),
  { ssr: false },
);

export { TVChart };
export type { TVChartWrapperProps, TVDataPoint, TVCrosshairData } from "./tv-chart-wrapper";
