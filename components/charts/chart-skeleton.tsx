"use client";

interface ChartSkeletonProps {
  /**
   * Optional title to display above the skeleton.
   */
  title?: string;
  /**
   * Height of the skeleton chart area. Defaults to "h-64".
   */
  height?: string;
  /**
   * Whether to show in a card container with border. Defaults to false.
   */
  withContainer?: boolean;
  /**
   * Type of chart skeleton to show. Defaults to "bar".
   */
  variant?: "bar" | "pie" | "line";
}

/**
 * Loading skeleton for chart components.
 *
 * Provides consistent loading states across all chart components.
 * Supports different chart type variants: bar, pie, and line.
 */
export function ChartSkeleton({
  title,
  height = "h-64",
  withContainer = false,
  variant = "bar",
}: ChartSkeletonProps) {
  const content = (
    <div className="animate-pulse">
      {title && <div className="h-5 w-48 bg-gray-700 rounded mb-6" />}
      <div
        className={`${height} bg-gray-700/50 rounded flex items-center justify-center`}
      >
        {variant === "bar" && <BarSkeleton />}
        {variant === "pie" && <PieSkeleton />}
        {variant === "line" && <LineSkeleton />}
      </div>
    </div>
  );

  if (withContainer) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Bar chart skeleton pattern.
 */
function BarSkeleton() {
  // Generate varying heights for visual interest
  const heights = [40, 60, 45, 70, 55, 80, 65, 90, 75, 85, 70, 95];

  return (
    <div className="w-full h-full flex items-end justify-around px-4 pb-4">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-4 bg-gray-600 rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Pie chart skeleton pattern.
 */
function PieSkeleton() {
  return <div className="w-48 h-48 bg-gray-600 rounded-full" />;
}

/**
 * Line chart skeleton pattern.
 */
function LineSkeleton() {
  return (
    <div className="w-full h-full flex items-center px-4">
      <svg
        viewBox="0 0 300 100"
        className="w-full h-3/4"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 L25,70 L50,75 L75,50 L100,60 L125,40 L150,45 L175,30 L200,35 L225,20 L250,25 L275,15 L300,20"
          fill="none"
          stroke="#4B5563"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
