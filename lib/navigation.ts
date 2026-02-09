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
