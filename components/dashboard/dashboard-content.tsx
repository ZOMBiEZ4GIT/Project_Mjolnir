"use client";

import { CheckInPromptCard } from "@/components/check-in/check-in-prompt-card";
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

interface DashboardContentProps {
  userName?: string | null;
}

export function DashboardContent({ userName }: DashboardContentProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader userName={userName} />

      {/* Net Worth Hero Card */}
      <div className="mb-6">
        <SectionErrorBoundary sectionName="Net Worth">
          <NetWorthHero />
        </SectionErrorBoundary>
      </div>

      {/* Stale Data Warning Banner */}
      <div className="mb-6">
        <SectionErrorBoundary sectionName="Stale Data Warning">
          <StaleDataWarning />
        </SectionErrorBoundary>
      </div>

      {/* Summary Cards: Total Assets and Total Debt */}
      <div className="mb-6">
        <SectionErrorBoundary sectionName="Summary Cards">
          <SummaryCards />
        </SectionErrorBoundary>
      </div>

      {/* Asset Allocation and Currency Exposure side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SectionErrorBoundary sectionName="Asset Allocation">
          <AssetAllocation />
        </SectionErrorBoundary>
        <SectionErrorBoundary sectionName="Currency Exposure">
          <CurrencyExposure />
        </SectionErrorBoundary>
      </div>

      {/* Superannuation Growth Breakdown - only shows if user has super holdings */}
      <div className="mb-6">
        <SectionErrorBoundary sectionName="Super Breakdown">
          <SuperBreakdownSection />
        </SectionErrorBoundary>
      </div>

      {/* Net Worth History Chart */}
      <div className="mb-6">
        <SectionErrorBoundary sectionName="Net Worth Chart">
          <NetWorthChart />
        </SectionErrorBoundary>
      </div>

      {/* Top Performers: Gainers and Losers */}
      <div className="mb-6">
        <SectionErrorBoundary sectionName="Top Performers">
          <TopPerformers />
        </SectionErrorBoundary>
      </div>

      <SectionErrorBoundary sectionName="Check-in Prompt">
        <CheckInPromptCard />
      </SectionErrorBoundary>
    </div>
  );
}
