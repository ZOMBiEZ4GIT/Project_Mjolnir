import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  Camera,
  Upload,
  Download,
  Settings,
  Receipt,
  PieChart,
  Cog,
  Workflow,
  HeartPulse,
  Scale,
  Moon,
  Activity,
  Utensils,
  Dumbbell,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "View net worth overview",
  },
  {
    href: "/health",
    label: "Health",
    icon: HeartPulse,
    description: "Apple Health dashboard",
    children: [
      {
        href: "/health",
        label: "Overview",
        icon: LayoutGrid,
        description: "Health overview and KPIs",
      },
      {
        href: "/health/body-comp",
        label: "Body Comp",
        icon: Scale,
        description: "Weight, body fat, lean mass",
      },
      {
        href: "/health/sleep",
        label: "Sleep",
        icon: Moon,
        description: "Sleep stages and quality",
      },
      {
        href: "/health/heart",
        label: "Heart",
        icon: Activity,
        description: "HRV, resting HR, VO2 max",
      },
      {
        href: "/health/nutrition",
        label: "Nutrition",
        icon: Utensils,
        description: "Calories, macros, protein",
      },
      {
        href: "/health/workouts",
        label: "Workouts",
        icon: Dumbbell,
        description: "Workout frequency and types",
      },
    ],
  },
  {
    href: "/holdings",
    label: "Holdings",
    icon: Wallet,
    description: "Manage your assets",
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: ArrowRightLeft,
    description: "View buy/sell history",
  },
  {
    href: "/snapshots",
    label: "Snapshots",
    icon: Camera,
    description: "Track balances over time",
  },
  {
    href: "/budget",
    label: "Budget",
    icon: PieChart,
    description: "Budget vs actual dashboard",
    children: [
      {
        href: "/budget",
        label: "Dashboard",
        icon: PieChart,
        description: "Budget vs actual dashboard",
      },
      {
        href: "/budget/transactions",
        label: "Transactions",
        icon: Receipt,
        description: "View categorised transactions",
      },
      {
        href: "/budget/setup",
        label: "Setup",
        icon: Cog,
        description: "Configure budget settings",
      },
    ],
  },
  {
    href: "/automations",
    label: "Automations",
    icon: Workflow,
    description: "Monitor n8n workflows",
  },
  {
    href: "/import",
    label: "Import",
    icon: Upload,
    description: "Import data from CSV",
  },
  {
    href: "/export",
    label: "Export",
    icon: Download,
    description: "Export data backup",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Configure preferences",
  },
];
