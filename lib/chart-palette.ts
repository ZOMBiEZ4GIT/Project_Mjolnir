/**
 * Chart Palette — Named hex constants for Recharts / SVG rendering.
 *
 * Recharts SVG props (stroke, fill) require raw hex values — CSS variables
 * are not supported in SVG rendering.  This module centralises all chart
 * hex colours so they can be referenced by name instead of magic strings.
 *
 * TradingView chart constants live in tv-chart-wrapper.tsx because they
 * are specific to the Lightweight Charts API.
 */

// ---------------------------------------------------------------------------
// Chart axis & grid tokens
// ---------------------------------------------------------------------------
/** Grid lines / CartesianGrid stroke */
export const CHART_GRID = "#374151"; // gray-700

/** Axis text, tick labels */
export const CHART_TEXT = "#9CA3AF"; // gray-400

/** Axis line, tick line */
export const CHART_AXIS = "#4B5563"; // gray-600

// ---------------------------------------------------------------------------
// Semantic data colours
// ---------------------------------------------------------------------------
/** Positive trend / assets */
export const POSITIVE = "#22C55E"; // green-500

/** Negative trend / debt */
export const NEGATIVE = "#EF4444"; // red-500 / destructive

/** Net worth / balance line (on dark background) */
export const NET_WORTH = "#FFFFFF";

/** Accent / primary highlight */
export const ACCENT = "#8B5CF6"; // purple-500

// ---------------------------------------------------------------------------
// Category colours (asset types)
// ---------------------------------------------------------------------------
export const STOCK = "#3B82F6"; // blue-500
export const ETF = "#8B5CF6"; // purple-500
export const CRYPTO = "#F97316"; // orange-500
export const SUPER = "#10B981"; // emerald-500
export const CASH = "#06B6D4"; // cyan-500
export const CATEGORY_FALLBACK = "#6B7280"; // gray-500

// ---------------------------------------------------------------------------
// Super growth breakdown colours
// ---------------------------------------------------------------------------
export const EMPLOYER = "#3B82F6"; // blue-500
export const EMPLOYEE = "#10B981"; // emerald-500
export const RETURNS = "#8B5CF6"; // purple-500
