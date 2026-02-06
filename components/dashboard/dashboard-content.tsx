"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { CheckinPrompt } from "@/components/dashboard/checkin-prompt";
import { NetWorthHero } from "@/components/dashboard/net-worth-hero";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AssetAllocation } from "@/components/dashboard/asset-allocation";
import { CurrencyExposure } from "@/components/dashboard/currency-exposure";
import { NetWorthChart } from "@/components/dashboard/net-worth-chart";
import { TopPerformers } from "@/components/dashboard/top-performers";
import { StaleDataWarning } from "@/components/dashboard/stale-data-warning";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SuperBreakdownSection } from "@/components/dashboard/super-breakdown-section";
import { SectionErrorBoundary } from "@/components/dashboard/section-error-boundary";

const sectionStaggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08, // 80ms between sections
    },
  },
};

const sectionStaggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

interface DashboardContentProps {
  userName?: string | null;
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = shouldReduceMotion ? undefined : sectionStaggerContainer;
  const itemVariants = shouldReduceMotion ? undefined : sectionStaggerItem;

  return (
    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      <DashboardHeader userName={userName} />

      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial={shouldReduceMotion ? undefined : "hidden"}
        animate={shouldReduceMotion ? undefined : "visible"}
      >
        {/* Check-in Prompt Card */}
        <motion.div variants={itemVariants}>
          <SectionErrorBoundary sectionName="Check-in Prompt">
            <CheckinPrompt />
          </SectionErrorBoundary>
        </motion.div>

        {/* Net Worth Hero Card */}
        <motion.div variants={itemVariants}>
          <SectionErrorBoundary sectionName="Net Worth">
            <NetWorthHero />
          </SectionErrorBoundary>
        </motion.div>

        {/* Stale Data Warning Banner */}
        <motion.div variants={itemVariants}>
          <SectionErrorBoundary sectionName="Stale Data Warning">
            <StaleDataWarning />
          </SectionErrorBoundary>
        </motion.div>

        {/* Summary Cards: Total Assets and Total Debt */}
        <motion.div variants={itemVariants}>
          <SectionErrorBoundary sectionName="Summary Cards">
            <SummaryCards />
          </SectionErrorBoundary>
        </motion.div>

        {/* Asset Allocation and Currency Exposure side by side */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionErrorBoundary sectionName="Asset Allocation">
            <AssetAllocation />
          </SectionErrorBoundary>
          <SectionErrorBoundary sectionName="Currency Exposure">
            <CurrencyExposure />
          </SectionErrorBoundary>
        </motion.div>

        {/* Superannuation Growth Breakdown */}
        <motion.div variants={itemVariants}>
          <SectionErrorBoundary sectionName="Super Breakdown">
            <SuperBreakdownSection />
          </SectionErrorBoundary>
        </motion.div>

        {/* Net Worth History Chart */}
        <motion.div variants={itemVariants}>
          <SectionErrorBoundary sectionName="Net Worth Chart">
            <NetWorthChart />
          </SectionErrorBoundary>
        </motion.div>

        {/* Top Performers: Gainers and Losers */}
        <motion.div variants={itemVariants}>
          <SectionErrorBoundary sectionName="Top Performers">
            <TopPerformers />
          </SectionErrorBoundary>
        </motion.div>
      </motion.div>
    </div>
  );
}
