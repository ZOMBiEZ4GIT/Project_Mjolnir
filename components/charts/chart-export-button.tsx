"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface ChartExportButtonProps {
  /**
   * Ref to the chart container element to export.
   */
  chartRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Base filename for the exported image (without extension).
   * Date will be appended automatically.
   */
  filename: string;
  /**
   * Optional className for the button.
   */
  className?: string;
}

/**
 * Generates a filename with current date.
 * Format: {filename}-YYYY-MM-DD.png
 */
function generateFilename(baseName: string): string {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  return `${baseName}-${dateStr}.png`;
}

/**
 * ChartExportButton - Downloads a chart as a PNG image.
 *
 * Usage:
 * 1. Create a ref for the chart container: const chartRef = useRef<HTMLDivElement>(null)
 * 2. Wrap the chart in a div with the ref: <div ref={chartRef}>...</div>
 * 3. Add the button: <ChartExportButton chartRef={chartRef} filename="net-worth" />
 */
export function ChartExportButton({
  chartRef,
  filename,
  className,
}: ChartExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!chartRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#18181b", // matches --card (zinc-900)
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
      });

      // Create download link
      const link = document.createElement("a");
      link.download = generateFilename(filename);
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to export chart:", error);
    } finally {
      setIsExporting(false);
    }
  }, [chartRef, filename, isExporting]);

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-md text-sm font-medium
        transition-colors bg-muted/50 hover:bg-muted
        text-muted-foreground hover:text-foreground disabled:opacity-50
        disabled:cursor-not-allowed
        ${className ?? ""}
      `}
      title="Download chart as PNG"
      aria-label="Download chart as PNG"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Export</span>
    </button>
  );
}
