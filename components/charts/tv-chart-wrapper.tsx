"use client";

import {
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type DeepPartial,
  type ChartOptions,
  type AreaSeriesPartialOptions,
  ColorType,
  CrosshairMode,
  type Time,
  type MouseEventParams,
} from "lightweight-charts";

// ---------------------------------------------------------------------------
// Design token hex values (derived from CSS variables in globals.css)
// ---------------------------------------------------------------------------
const CHART_BG = "#09090b"; // page background
const GRID_COLOR = "#27272a"; // --border
const TEXT_COLOR = "#a1a1aa"; // --muted-foreground
const CROSSHAIR_COLOR = "#8b5cf6"; // --accent (purple)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TVDataPoint {
  time: Time;
  value: number;
}

/** Crosshair move event data passed to onCrosshairMove callback */
export interface TVCrosshairData {
  time: Time;
  value: number;
  /** Logical x position relative to chart container (pixels) */
  x: number;
  /** Logical y position relative to chart container (pixels) */
  y: number;
}

export interface TVChartWrapperProps {
  data: TVDataPoint[];
  height?: number;
  className?: string;
  /** Area fill options — defaults to purple gradient */
  areaStyle?: AreaSeriesPartialOptions;
  /** Additional chart options to merge */
  chartOptions?: DeepPartial<ChartOptions>;
  /** Callback fired on crosshair move — null when cursor leaves */
  onCrosshairMove?: (data: TVCrosshairData | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TVChartWrapper({
  data,
  height = 264,
  className,
  areaStyle,
  chartOptions,
  onCrosshairMove,
}: TVChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  // Stable callback to build the chart
  const initChart = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dispose previous instance if exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: TEXT_COLOR,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: GRID_COLOR },
        horzLines: { color: GRID_COLOR },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: CROSSHAIR_COLOR, width: 1, labelBackgroundColor: CROSSHAIR_COLOR },
        horzLine: { color: CROSSHAIR_COLOR, width: 1, labelBackgroundColor: CROSSHAIR_COLOR },
      },
      rightPriceScale: {
        borderColor: GRID_COLOR,
      },
      timeScale: {
        borderColor: GRID_COLOR,
      },
      handleScroll: false,
      handleScale: false,
      ...chartOptions,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: CROSSHAIR_COLOR,
      topColor: "rgba(139, 92, 246, 0.3)",
      bottomColor: "rgba(139, 92, 246, 0.02)",
      lineWidth: 2,
      ...areaStyle,
    });

    series.setData(data);
    chart.timeScale().fitContent();

    // Subscribe to crosshair move for custom tooltip
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      const cb = onCrosshairMoveRef.current;
      if (!cb) return;

      if (!param.time || !param.point) {
        cb(null);
        return;
      }

      const seriesData = param.seriesData.get(series);
      if (!seriesData || !("value" in seriesData)) {
        cb(null);
        return;
      }

      cb({
        time: param.time,
        value: (seriesData as { value: number }).value,
        x: param.point.x,
        y: param.point.y,
      });
    });

    chartRef.current = chart;
    seriesRef.current = series;
  }, [height, areaStyle, chartOptions, data]);

  // Create / recreate chart when dependencies change
  useEffect(() => {
    initChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [initChart]);

  // Resize on container dimension changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (chartRef.current && width > 0) {
          chartRef.current.applyOptions({ width });
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const style: CSSProperties = { height };

  return <div ref={containerRef} className={className} style={style} role="img" aria-label="Interactive price chart" />;
}
