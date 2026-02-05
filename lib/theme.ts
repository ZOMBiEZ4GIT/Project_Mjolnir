/** Layout constants for the Mjolnir dashboard */
export const layout = {
  sidebarWidth: 240,
  rightPanelWidth: 320,
  maxContentWidth: 1400,
  cardRadius: 16,
  buttonRadius: 8,
  inputRadius: 8,
} as const;

/** Spacing constants following an 8pt grid system */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

/** Type helpers for consuming the constants */
export type LayoutKey = keyof typeof layout;
export type SpacingKey = keyof typeof spacing;
