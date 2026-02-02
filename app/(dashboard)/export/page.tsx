"use client";

import { useEffect, useState } from "react";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Archive } from "lucide-react";

export const dynamic = "force-dynamic";

interface ExportCounts {
  holdings: number;
  transactions: number;
  snapshots: number;
}

function downloadFile(url: string) {
  // Create a temporary anchor element to trigger the download
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ExportPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const [counts, setCounts] = useState<ExportCounts>({ holdings: 0, transactions: 0, snapshots: 0 });
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  // Fetch counts when user is signed in
  useEffect(() => {
    async function fetchCounts() {
      if (!isSignedIn) return;

      try {
        // Fetch holdings count (include dormant for export)
        const holdingsRes = await fetch("/api/holdings?include_dormant=true");
        if (holdingsRes.ok) {
          const holdingsData = await holdingsRes.json();
          setCounts(prev => ({ ...prev, holdings: holdingsData.length }));
        }

        // Fetch transactions count
        const transactionsRes = await fetch("/api/transactions");
        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json();
          setCounts(prev => ({ ...prev, transactions: transactionsData.length }));
        }

        // Fetch snapshots count
        const snapshotsRes = await fetch("/api/snapshots");
        if (snapshotsRes.ok) {
          const snapshotsData = await snapshotsRes.json();
          setCounts(prev => ({ ...prev, snapshots: snapshotsData.length }));
        }
      } catch (error) {
        console.error("Failed to fetch export counts:", error);
      } finally {
        setIsLoadingCounts(false);
      }
    }

    if (isLoaded && isSignedIn) {
      fetchCounts();
    }
  }, [isLoaded, isSignedIn]);

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
          <h2 className="text-xl text-white">Sign in to export data</h2>
          <p className="text-gray-400">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Export Data</h1>
      <p className="text-gray-400 mb-8">
        Download your data as CSV or JSON files for backup or external analysis.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Holdings Export Section */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Holdings Export</CardTitle>
            <CardDescription>
              Export all your holdings including stocks, ETFs, crypto, super, cash, and debt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">
              {isLoadingCounts ? (
                "Loading..."
              ) : (
                <>
                  <span className="font-semibold text-white">{counts.holdings}</span>{" "}
                  {counts.holdings === 1 ? "holding" : "holdings"} to export
                </>
              )}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("/api/export/holdings?format=csv")}
                disabled={isLoadingCounts || counts.holdings === 0}
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("/api/export/holdings?format=json")}
                disabled={isLoadingCounts || counts.holdings === 0}
              >
                <Download className="h-4 w-4" />
                Download JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Export Section */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Transactions Export</CardTitle>
            <CardDescription>
              Export your BUY, SELL, and DIVIDEND transaction history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">
              {isLoadingCounts ? (
                "Loading..."
              ) : (
                <>
                  <span className="font-semibold text-white">{counts.transactions}</span>{" "}
                  {counts.transactions === 1 ? "transaction" : "transactions"} to export
                </>
              )}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("/api/export/transactions?format=csv")}
                disabled={isLoadingCounts || counts.transactions === 0}
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("/api/export/transactions?format=json")}
                disabled={isLoadingCounts || counts.transactions === 0}
              >
                <Download className="h-4 w-4" />
                Download JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Snapshots Export Section */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Snapshots Export</CardTitle>
            <CardDescription>
              Export balance snapshots for super, cash, and debt accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">
              {isLoadingCounts ? (
                "Loading..."
              ) : (
                <>
                  <span className="font-semibold text-white">{counts.snapshots}</span>{" "}
                  {counts.snapshots === 1 ? "snapshot" : "snapshots"} to export
                </>
              )}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("/api/export/snapshots?format=csv")}
                disabled={isLoadingCounts || counts.snapshots === 0}
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("/api/export/snapshots?format=json")}
                disabled={isLoadingCounts || counts.snapshots === 0}
              >
                <Download className="h-4 w-4" />
                Download JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Full Backup Section */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Full Backup</CardTitle>
            <CardDescription>
              Download a complete JSON backup of all your data including holdings, transactions, snapshots, and contributions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-400">
              {isLoadingCounts ? (
                "Loading..."
              ) : (
                <div className="space-y-1">
                  <p>
                    <span className="font-semibold text-white">{counts.holdings}</span>{" "}
                    {counts.holdings === 1 ? "holding" : "holdings"}
                  </p>
                  <p>
                    <span className="font-semibold text-white">{counts.transactions}</span>{" "}
                    {counts.transactions === 1 ? "transaction" : "transactions"}
                  </p>
                  <p>
                    <span className="font-semibold text-white">{counts.snapshots}</span>{" "}
                    {counts.snapshots === 1 ? "snapshot" : "snapshots"}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile("/api/export/backup")}
              disabled={isLoadingCounts || (counts.holdings === 0 && counts.transactions === 0 && counts.snapshots === 0)}
            >
              <Archive className="h-4 w-4" />
              Download Backup
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
