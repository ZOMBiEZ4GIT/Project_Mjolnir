import { currentUser } from "@clerk/nextjs/server";
import { CheckInPromptCard } from "@/components/check-in/check-in-prompt-card";
import { NetWorthHero } from "@/components/dashboard/net-worth-hero";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AssetAllocation } from "@/components/dashboard/asset-allocation";

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

      {/* Summary Cards: Total Assets and Total Debt */}
      <div className="mb-6">
        <SummaryCards />
      </div>

      {/* Asset Allocation Breakdown */}
      <div className="mb-6">
        <AssetAllocation />
      </div>

      <CheckInPromptCard />
    </div>
  );
}
