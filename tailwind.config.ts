import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        positive: {
          DEFAULT: "hsl(var(--positive))",
          foreground: "hsl(var(--positive-foreground))",
        },
        negative: {
          DEFAULT: "hsl(var(--negative))",
          foreground: "hsl(var(--negative-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      boxShadow: {
        "glow-sm": "0 0 8px 0 var(--accent-glow)",
        "glow-md": "0 0 16px 2px var(--accent-glow)",
        "glow-lg": "0 0 24px 4px var(--accent-glow)",
        "glow-positive": "0 0 16px 2px var(--positive-glow)",
        "glow-negative": "0 0 16px 2px var(--negative-glow)",
        "card": "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 4px 12px 0 rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
      },
      fontSize: {
        "display-xl": [
          "4rem",
          { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.02em" },
        ],
        "display-lg": [
          "3rem",
          { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.02em" },
        ],
        "display-md": [
          "2.25rem",
          { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.01em" },
        ],
        "heading-lg": [
          "1.5rem",
          { lineHeight: "1.3", fontWeight: "600" },
        ],
        "heading-md": [
          "1.25rem",
          { lineHeight: "1.4", fontWeight: "600" },
        ],
        "heading-sm": [
          "1rem",
          { lineHeight: "1.5", fontWeight: "600" },
        ],
        "body-lg": [
          "1rem",
          { lineHeight: "1.6", fontWeight: "400" },
        ],
        "body-md": [
          "0.875rem",
          { lineHeight: "1.5", fontWeight: "400" },
        ],
        "body-sm": [
          "0.75rem",
          { lineHeight: "1.5", fontWeight: "400" },
        ],
        label: [
          "0.75rem",
          { lineHeight: "1", fontWeight: "500", letterSpacing: "0.05em" },
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        shake: "shake 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
