"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Palette, Type, Layers, Zap, Grid3X3 } from "lucide-react";
import {
  fadeIn,
  slideUp,
  scaleIn,
  staggerContainer,
  staggerItem,
  numberSpring,
} from "@/lib/animations";
import { spacing } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Colour palette data
// ---------------------------------------------------------------------------

const colourGroups = [
  {
    label: "Backgrounds",
    colours: [
      { name: "background", class: "bg-background", cssVar: "--background" },
      { name: "card", class: "bg-card", cssVar: "--card" },
      { name: "popover", class: "bg-popover", cssVar: "--popover" },
      { name: "muted", class: "bg-muted", cssVar: "--muted" },
      { name: "secondary", class: "bg-secondary", cssVar: "--secondary" },
    ],
  },
  {
    label: "Accent & Status",
    colours: [
      { name: "primary", class: "bg-primary", cssVar: "--primary" },
      { name: "accent", class: "bg-accent", cssVar: "--accent" },
      { name: "positive", class: "bg-positive", cssVar: "--positive" },
      { name: "destructive", class: "bg-destructive", cssVar: "--destructive" },
      { name: "negative", class: "bg-negative", cssVar: "--negative" },
    ],
  },
  {
    label: "Text",
    colours: [
      { name: "foreground", class: "bg-foreground", cssVar: "--foreground" },
      { name: "card-foreground", class: "bg-card-foreground", cssVar: "--card-foreground" },
      { name: "muted-foreground", class: "bg-muted-foreground", cssVar: "--muted-foreground" },
      { name: "primary-foreground", class: "bg-primary-foreground", cssVar: "--primary-foreground" },
    ],
  },
  {
    label: "Borders & Inputs",
    colours: [
      { name: "border", class: "bg-border", cssVar: "--border" },
      { name: "input", class: "bg-input", cssVar: "--input" },
      { name: "ring", class: "bg-ring", cssVar: "--ring" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Typography scale data
// ---------------------------------------------------------------------------

const typographyScale = [
  { name: "display-xl", class: "text-display-xl", spec: "4rem / 1 · 700 · -0.02em", sample: "$1,234,567" },
  { name: "display-lg", class: "text-display-lg", spec: "3rem / 1.1 · 700 · -0.02em", sample: "Net Worth" },
  { name: "display-md", class: "text-display-md", spec: "2.25rem / 1.2 · 600 · -0.01em", sample: "Portfolio" },
  { name: "heading-lg", class: "text-heading-lg", spec: "1.5rem / 1.3 · 600", sample: "Holdings Overview" },
  { name: "heading-md", class: "text-heading-md", spec: "1.25rem / 1.4 · 600", sample: "Asset Allocation" },
  { name: "heading-sm", class: "text-heading-sm", spec: "1rem / 1.5 · 600", sample: "Transaction History" },
  { name: "body-lg", class: "text-body-lg", spec: "1rem / 1.6 · 400", sample: "Your net worth increased by 2.4% this month, driven by strong equity performance." },
  { name: "body-md", class: "text-body-md", spec: "0.875rem / 1.5 · 400", sample: "Last updated 5 minutes ago. Prices may be delayed by up to 15 minutes." },
  { name: "body-sm", class: "text-body-sm", spec: "0.75rem / 1.5 · 400", sample: "Data sourced from CoinGecko and Yahoo Finance. Not financial advice." },
  { name: "label", class: "text-label", spec: "0.75rem / 1 · 500 · 0.05em", sample: "TOTAL ASSETS" },
];

// ---------------------------------------------------------------------------
// Shadow data
// ---------------------------------------------------------------------------

const shadows = [
  { name: "shadow-card", class: "shadow-card", desc: "Default card elevation" },
  { name: "shadow-card-hover", class: "shadow-card-hover", desc: "Hovered card elevation" },
  { name: "shadow-glow-sm", class: "shadow-glow-sm", desc: "Small accent glow" },
  { name: "shadow-glow-md", class: "shadow-glow-md", desc: "Medium accent glow" },
  { name: "shadow-glow-lg", class: "shadow-glow-lg", desc: "Large accent glow" },
  { name: "shadow-glow-positive", class: "shadow-glow-positive", desc: "Positive (green) glow" },
  { name: "shadow-glow-negative", class: "shadow-glow-negative", desc: "Negative (red) glow" },
];

// ---------------------------------------------------------------------------
// Spacing data
// ---------------------------------------------------------------------------

const spacingEntries = Object.entries(spacing) as [string, number][];

// ---------------------------------------------------------------------------
// Animation demo component
// ---------------------------------------------------------------------------

function AnimationDemo({
  label,
  desc,
  preset,
}: {
  label: string;
  desc: string;
  preset: Record<string, unknown>;
}) {
  const [key, setKey] = useState(0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-heading-sm text-foreground">{label}</p>
          <p className="text-body-sm text-muted-foreground">{desc}</p>
        </div>
        <button
          onClick={() => setKey((k) => k + 1)}
          className="rounded-md border border-border bg-muted px-3 py-1.5 text-body-sm text-foreground hover:bg-card transition-colors"
        >
          Replay
        </button>
      </div>
      <motion.div
        key={key}
        {...preset}
        className="h-16 rounded-lg border border-border bg-primary/20 flex items-center justify-center"
      >
        <span className="text-body-md text-primary">{label}</span>
      </motion.div>
    </div>
  );
}

function NumberSpringDemo() {
  const [value, setValue] = useState(0);
  const targets = [0, 1234567, 42069, 987654];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-heading-sm text-foreground">numberSpring</p>
          <p className="text-body-sm text-muted-foreground">Spring transition for numeric values</p>
        </div>
        <button
          onClick={() => setValue((v) => (v + 1) % targets.length)}
          className="rounded-md border border-border bg-muted px-3 py-1.5 text-body-sm text-foreground hover:bg-card transition-colors"
        >
          Change Value
        </button>
      </div>
      <div className="h-16 rounded-lg border border-border bg-primary/20 flex items-center justify-center">
        <motion.span
          className="text-display-md text-primary"
          animate={{ opacity: 1 }}
          transition={numberSpring}
          key={targets[value]}
          initial={{ opacity: 0 }}
        >
          ${targets[value].toLocaleString()}
        </motion.span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-12"
      >
        {/* Page Header */}
        <motion.div variants={staggerItem} className="space-y-2">
          <h1 className="text-display-md text-foreground">Design System</h1>
          <p className="text-body-lg text-muted-foreground">
            Mjolnir design tokens, typography, shadows, animations, and spacing reference.
          </p>
        </motion.div>

        {/* ---- Colour Palette ---- */}
        <motion.section variants={staggerItem} className="space-y-6">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-heading-lg text-foreground">Colour Palette</h2>
          </div>

          {colourGroups.map((group) => (
            <div key={group.label} className="space-y-3">
              <h3 className="text-heading-sm text-muted-foreground">{group.label}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {group.colours.map((c) => (
                  <div
                    key={c.name}
                    className="rounded-lg border border-border bg-card/50 p-3 space-y-2"
                  >
                    <div
                      className={`h-12 rounded-md ${c.class} border border-border`}
                    />
                    <p className="text-body-sm text-foreground font-medium truncate">
                      {c.name}
                    </p>
                    <p className="text-body-sm text-muted-foreground font-mono truncate">
                      {c.cssVar}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.section>

        {/* ---- Typography ---- */}
        <motion.section variants={staggerItem} className="space-y-6">
          <div className="flex items-center gap-3">
            <Type className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-heading-lg text-foreground">Typography Scale</h2>
          </div>

          <div className="space-y-6">
            {typographyScale.map((t) => (
              <div
                key={t.name}
                className="rounded-lg border border-border bg-card/50 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-label text-primary">{t.name}</span>
                  <span className="text-body-sm text-muted-foreground font-mono">
                    {t.spec}
                  </span>
                </div>
                <p className={`${t.class} text-foreground`}>{t.sample}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ---- Shadows & Glows ---- */}
        <motion.section variants={staggerItem} className="space-y-6">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-heading-lg text-foreground">Shadows & Glows</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shadows.map((s) => (
              <div
                key={s.name}
                className={`rounded-lg border border-border bg-card p-6 ${s.class}`}
              >
                <p className="text-heading-sm text-foreground">{s.name}</p>
                <p className="text-body-sm text-muted-foreground mt-1">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ---- Animations ---- */}
        <motion.section variants={staggerItem} className="space-y-6">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-heading-lg text-foreground">Animation Presets</h2>
          </div>
          <p className="text-body-md text-muted-foreground">
            Click &quot;Replay&quot; to trigger each animation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <AnimationDemo
                label="fadeIn"
                desc="Opacity 0 → 1, 0.2s"
                preset={fadeIn}
              />
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <AnimationDemo
                label="slideUp"
                desc="Opacity 0 → 1, y 20 → 0, 0.3s easeOut"
                preset={slideUp}
              />
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <AnimationDemo
                label="scaleIn"
                desc="Opacity 0 → 1, scale 0.95 → 1, 0.2s"
                preset={scaleIn}
              />
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <NumberSpringDemo />
            </div>
          </div>
        </motion.section>

        {/* ---- Spacing ---- */}
        <motion.section variants={staggerItem} className="space-y-6">
          <div className="flex items-center gap-3">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-heading-lg text-foreground">Spacing (8pt Grid)</h2>
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-6 space-y-4">
            {spacingEntries.map(([name, px]) => (
              <div key={name} className="flex items-center gap-4">
                <span className="text-label text-muted-foreground w-12 text-right">
                  {name}
                </span>
                <span className="text-body-sm text-muted-foreground w-12 text-right font-mono">
                  {px}px
                </span>
                <div className="flex-1 flex items-center">
                  <div
                    className="h-4 rounded-sm bg-primary/40"
                    style={{ width: px * 4 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
