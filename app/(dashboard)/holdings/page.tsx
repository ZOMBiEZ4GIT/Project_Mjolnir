"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { HoldingsTable } from "@/components/holdings/holdings-table";
import { AddHoldingDialog } from "@/components/holdings/add-holding-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Holding } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function fetchHoldings(includeDormant: boolean): Promise<Holding[]> {
  const url = includeDormant
    ? "/api/holdings?include_dormant=true"
    : "/api/holdings";
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch holdings");
  }
  return response.json();
}

export default function HoldingsPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const searchParams = useSearchParams();
  const router = useRouter();

  const showDormant = searchParams.get("show_dormant") === "true";

  const handleShowDormantChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("show_dormant", "true");
    } else {
      params.delete("show_dormant");
    }
    router.push(`/holdings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const {
    data: holdings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["holdings", { showDormant }],
    queryFn: () => fetchHoldings(showDormant),
    enabled: isLoaded && isSignedIn,
  });

  // Show loading while Clerk auth is loading
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-xl text-white">Sign in to view your holdings</h2>
          <p className="text-gray-400">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching holdings
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Holdings</h1>
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-gray-400">Loading holdings...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Holdings</h1>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2">
          <p className="text-red-400">Failed to load holdings</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!holdings || holdings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Holdings</h1>
          <AddHoldingDialog>
            <Button>Add Holding</Button>
          </AddHoldingDialog>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Switch
            id="show-dormant-empty"
            checked={showDormant}
            onCheckedChange={handleShowDormantChange}
          />
          <Label htmlFor="show-dormant-empty" className="text-gray-300 cursor-pointer">
            Show dormant holdings
          </Label>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 text-center">
          <div className="text-gray-400">
            <p className="text-lg">No holdings yet</p>
            <p className="text-sm mt-2">
              Add your first holding to start tracking your net worth.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show holdings list in grouped table
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Holdings</h1>
        <AddHoldingDialog>
          <Button>Add Holding</Button>
        </AddHoldingDialog>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Switch
          id="show-dormant"
          checked={showDormant}
          onCheckedChange={handleShowDormantChange}
        />
        <Label htmlFor="show-dormant" className="text-gray-300 cursor-pointer">
          Show dormant holdings
        </Label>
      </div>
      <HoldingsTable holdings={holdings} />
    </div>
  );
}
