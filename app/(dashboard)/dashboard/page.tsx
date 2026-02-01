import { currentUser } from "@clerk/nextjs/server";
import { CheckInPromptCard } from "@/components/check-in/check-in-prompt-card";
import { NetWorthHero } from "@/components/dashboard/net-worth-hero";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AssetAllocation } from "@/components/dashboard/asset-allocation";
import { NetWorthChart } from "@/components/dashboard/net-worth-chart";
import { TopPerformers } from "@/components/dashboard/top-performers";
import { StaleDataWarning } from "@/components/dashboard/stale-data-warning";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-4">
        Welcome{user?.firstName ? `, ${user.firstName}` : ""}
      </h1>

      {/* Net Worth Hero Card */}
      <div className="mb-6">
        <NetWorthHero />
      </div>

      {/* Stale Data Warning Banner */}
      <div className="mb-6">
        <StaleDataWarning />
      </div>

      {/* Summary Cards: Total Assets and Total Debt */}
      <div className="mb-6">
        <SummaryCards />
      </div>

      {/* Asset Allocation Breakdown */}
      <div className="mb-6">
        <AssetAllocation />
      </div>

      {/* Net Worth History Chart */}
      <div className="mb-6">
        <NetWorthChart />
      </div>

      {/* Top Performers: Gainers and Losers */}
      <div className="mb-6">
        <TopPerformers />
      </div>

      <CheckInPromptCard />
    </div>
  );
}
