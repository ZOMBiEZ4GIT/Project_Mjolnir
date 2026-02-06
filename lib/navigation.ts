import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  Camera,
  Upload,
  Download,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
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
