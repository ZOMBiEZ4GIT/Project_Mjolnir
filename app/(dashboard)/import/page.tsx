"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { FileUpload } from "@/components/import/file-upload";
import { ImportResults, type ImportError } from "@/components/import/import-results";
import { ImportProgress } from "@/components/import/import-progress";
import { RecentImports, type ImportHistoryRecord } from "@/components/import/recent-imports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// CSV template content
const TRANSACTIONS_TEMPLATE = `date,symbol,action,quantity,unit_price,fees,currency,exchange,notes
2024-03-15,VAS.AX,BUY,10,95.50,9.50,AUD,ASX,Initial purchase`;

const SNAPSHOTS_TEMPLATE = `date,fund_name,balance,employer_contrib,employee_contrib,currency
2024-03-31,AustralianSuper,185000,1200,500,AUD`;

// Helper to trigger CSV download
function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const dynamic = "force-dynamic";

interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export default function ImportPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();

  // Transaction import state
  const [transactionFile, setTransactionFile] = React.useState<File | null>(null);
  const [transactionResults, setTransactionResults] = React.useState<ImportSummary | null>(null);
  const [transactionLoading, setTransactionLoading] = React.useState(false);
  const [transactionRowCount, setTransactionRowCount] = React.useState<number | undefined>(undefined);

  // Snapshot import state
  const [snapshotFile, setSnapshotFile] = React.useState<File | null>(null);
  const [snapshotResults, setSnapshotResults] = React.useState<ImportSummary | null>(null);
  const [snapshotLoading, setSnapshotLoading] = React.useState(false);
  const [snapshotRowCount, setSnapshotRowCount] = React.useState<number | undefined>(undefined);

  // Recent imports state
  const [recentImports, setRecentImports] = React.useState<ImportHistoryRecord[]>([]);
  const [recentImportsLoading, setRecentImportsLoading] = React.useState(true);

  // Fetch recent imports
  const fetchRecentImports = React.useCallback(async () => {
    try {
      const response = await fetch("/api/import/history?limit=5");
      if (response.ok) {
        const data = await response.json();
        setRecentImports(data.imports);
      }
    } catch (error) {
      console.error("Failed to fetch recent imports:", error);
    } finally {
      setRecentImportsLoading(false);
    }
  }, []);

  // Fetch recent imports on mount and after successful imports
  React.useEffect(() => {
    if (isSignedIn) {
      fetchRecentImports();
    }
  }, [isSignedIn, fetchRecentImports]);

  // Helper to count CSV rows (excluding header)
  const countCsvRows = async (file: File): Promise<number> => {
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim().length > 0);
    // Subtract 1 for header row
    return Math.max(0, lines.length - 1);
  };

  // Handle file selection with row counting
  const handleTransactionFileSelect = async (file: File) => {
    setTransactionFile(file);
    setTransactionResults(null);
    const rowCount = await countCsvRows(file);
    setTransactionRowCount(rowCount);
  };

  const handleSnapshotFileSelect = async (file: File) => {
    setSnapshotFile(file);
    setSnapshotResults(null);
    const rowCount = await countCsvRows(file);
    setSnapshotRowCount(rowCount);
  };

  const handleTransactionImport = async () => {
    if (!transactionFile) return;

    setTransactionLoading(true);
    setTransactionResults(null);

    try {
      const formData = new FormData();
      formData.append("file", transactionFile);

      const response = await fetch("/api/import/transactions", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to import transactions");
        return;
      }

      setTransactionResults(data);

      if (data.imported > 0 && data.errors.length === 0) {
        toast.success(`Successfully imported ${data.imported} transaction${data.imported === 1 ? "" : "s"}`);
      } else if (data.imported > 0) {
        toast.warning(`Imported ${data.imported} transaction${data.imported === 1 ? "" : "s"} with ${data.errors.length} error${data.errors.length === 1 ? "" : "s"}`);
      } else {
        toast.error("No transactions were imported");
      }

      // Refresh recent imports list
      fetchRecentImports();
    } catch (error) {
      toast.error("Failed to import transactions");
      console.error("Transaction import error:", error);
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleSnapshotImport = async () => {
    if (!snapshotFile) return;

    setSnapshotLoading(true);
    setSnapshotResults(null);

    try {
      const formData = new FormData();
      formData.append("file", snapshotFile);

      const response = await fetch("/api/import/snapshots", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to import snapshots");
        return;
      }

      setSnapshotResults(data);

      if (data.imported > 0 && data.errors.length === 0) {
        toast.success(`Successfully imported ${data.imported} snapshot${data.imported === 1 ? "" : "s"}`);
      } else if (data.imported > 0) {
        toast.warning(`Imported ${data.imported} snapshot${data.imported === 1 ? "" : "s"} with ${data.errors.length} error${data.errors.length === 1 ? "" : "s"}`);
      } else {
        toast.error("No snapshots were imported");
      }

      // Refresh recent imports list
      fetchRecentImports();
    } catch (error) {
      toast.error("Failed to import snapshots");
      console.error("Snapshot import error:", error);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleTransactionFileClear = () => {
    setTransactionFile(null);
    setTransactionResults(null);
    setTransactionRowCount(undefined);
  };

  const handleSnapshotFileClear = () => {
    setSnapshotFile(null);
    setSnapshotResults(null);
    setSnapshotRowCount(undefined);
  };

  // Show loading while Clerk auth is loading
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-xl text-foreground">Sign in to import data</h2>
          <p className="text-muted-foreground">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Import Data</h1>
      <p className="text-muted-foreground mb-8">
        Import your historical data from CSV files. The import process is idempotent—re-running the same file won&apos;t create duplicates.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Transaction Import Section */}
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Import Transactions</CardTitle>
            <CardDescription>
              Import BUY, SELL, and DIVIDEND transactions for stocks, ETFs, and crypto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onFileSelect={handleTransactionFileSelect}
              onFileClear={handleTransactionFileClear}
              disabled={transactionLoading}
            />

            {transactionFile && !transactionResults && !transactionLoading && (
              <Button
                onClick={handleTransactionImport}
                disabled={transactionLoading}
                className="w-full"
              >
                Import Transactions
              </Button>
            )}

            <ImportProgress
              isLoading={transactionLoading}
              rowCount={transactionRowCount}
            />

            {transactionResults && (
              <ImportResults
                imported={transactionResults.imported}
                skipped={transactionResults.skipped}
                errors={transactionResults.errors}
              />
            )}

            {/* CSV Format Example */}
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">CSV Format</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => downloadCsv(TRANSACTIONS_TEMPLATE, "transactions-template.csv")}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Template
                </Button>
              </div>
              <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
{`date,symbol,action,quantity,unit_price,fees,currency,exchange,notes
2024-03-15,VAS.AX,BUY,10,95.50,9.50,AUD,ASX,
2024-03-20,BTC,BUY,0.5,65000,0,USD,,DCA purchase
2024-04-01,VAS.AX,DIVIDEND,10,0.85,0,AUD,ASX,Quarterly dividend`}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                Required: date, symbol, action, quantity, unit_price. Optional: fees, currency, exchange, notes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Snapshot Import Section */}
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Import Snapshots</CardTitle>
            <CardDescription>
              Import balance snapshots for super, cash, and debt accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onFileSelect={handleSnapshotFileSelect}
              onFileClear={handleSnapshotFileClear}
              disabled={snapshotLoading}
            />

            {snapshotFile && !snapshotResults && !snapshotLoading && (
              <Button
                onClick={handleSnapshotImport}
                disabled={snapshotLoading}
                className="w-full"
              >
                Import Snapshots
              </Button>
            )}

            <ImportProgress
              isLoading={snapshotLoading}
              rowCount={snapshotRowCount}
            />

            {snapshotResults && (
              <ImportResults
                imported={snapshotResults.imported}
                skipped={snapshotResults.skipped}
                errors={snapshotResults.errors}
              />
            )}

            {/* CSV Format Example */}
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">CSV Format</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => downloadCsv(SNAPSHOTS_TEMPLATE, "snapshots-template.csv")}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Template
                </Button>
              </div>
              <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
{`date,fund_name,balance,employer_contrib,employee_contrib,currency
2024-03-31,AustralianSuper,185000,1200,500,AUD
2024-03-31,Savings Account,25000,,,AUD
2024-03-31,Credit Card,-3500,,,AUD`}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                Required: date, fund_name, balance. Optional: employer_contrib, employee_contrib, currency.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Imports Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Imports</h2>
        <RecentImports imports={recentImports} isLoading={recentImportsLoading} />
      </div>
    </div>
  );
}
