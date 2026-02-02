"use client";

import { useEffect, useState } from "react";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

interface ExportCounts {
  holdings: number;
  transactions: number;
  snapshots: number;
}

// Track which export is currently downloading
type ExportKey = "holdings-csv" | "holdings-json" | "transactions-csv" | "transactions-json" | "snapshots-csv" | "snapshots-json" | "backup";

export default function ExportPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const [counts, setCounts] = useState<ExportCounts>({ holdings: 0, transactions: 0, snapshots: 0 });
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [downloadingKey, setDownloadingKey] = useState<ExportKey | null>(null);

  // Download file with loading state and toast notifications
  async function handleDownload(url: string, key: ExportKey, successMessage: string) {
    setDownloadingKey(key);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get filename from Content-Disposition header or generate default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "export";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      toast.success(successMessage);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setDownloadingKey(null);
    }
  }

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
                onClick={() => handleDownload("/api/export/holdings?format=csv", "holdings-csv", "Holdings exported as CSV")}
                disabled={isLoadingCounts || counts.holdings === 0 || downloadingKey !== null}
              >
                {downloadingKey === "holdings-csv" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingKey === "holdings-csv" ? "Exporting..." : "Download CSV"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("/api/export/holdings?format=json", "holdings-json", "Holdings exported as JSON")}
                disabled={isLoadingCounts || counts.holdings === 0 || downloadingKey !== null}
              >
                {downloadingKey === "holdings-json" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingKey === "holdings-json" ? "Exporting..." : "Download JSON"}
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
                onClick={() => handleDownload("/api/export/transactions?format=csv", "transactions-csv", "Transactions exported as CSV")}
                disabled={isLoadingCounts || counts.transactions === 0 || downloadingKey !== null}
              >
                {downloadingKey === "transactions-csv" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingKey === "transactions-csv" ? "Exporting..." : "Download CSV"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("/api/export/transactions?format=json", "transactions-json", "Transactions exported as JSON")}
                disabled={isLoadingCounts || counts.transactions === 0 || downloadingKey !== null}
              >
                {downloadingKey === "transactions-json" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingKey === "transactions-json" ? "Exporting..." : "Download JSON"}
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
                onClick={() => handleDownload("/api/export/snapshots?format=csv", "snapshots-csv", "Snapshots exported as CSV")}
                disabled={isLoadingCounts || counts.snapshots === 0 || downloadingKey !== null}
              >
                {downloadingKey === "snapshots-csv" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingKey === "snapshots-csv" ? "Exporting..." : "Download CSV"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("/api/export/snapshots?format=json", "snapshots-json", "Snapshots exported as JSON")}
                disabled={isLoadingCounts || counts.snapshots === 0 || downloadingKey !== null}
              >
                {downloadingKey === "snapshots-json" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingKey === "snapshots-json" ? "Exporting..." : "Download JSON"}
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
              onClick={() => handleDownload("/api/export/backup", "backup", "Full backup downloaded successfully")}
              disabled={isLoadingCounts || (counts.holdings === 0 && counts.transactions === 0 && counts.snapshots === 0) || downloadingKey !== null}
            >
              {downloadingKey === "backup" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {downloadingKey === "backup" ? "Exporting..." : "Download Backup"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
