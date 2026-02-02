"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { FileUpload } from "@/components/import/file-upload";
import { ImportResults, type ImportError } from "@/components/import/import-results";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  // Snapshot import state
  const [snapshotFile, setSnapshotFile] = React.useState<File | null>(null);
  const [snapshotResults, setSnapshotResults] = React.useState<ImportSummary | null>(null);
  const [snapshotLoading, setSnapshotLoading] = React.useState(false);

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
  };

  const handleSnapshotFileClear = () => {
    setSnapshotFile(null);
    setSnapshotResults(null);
  };

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
          <h2 className="text-xl text-white">Sign in to import data</h2>
          <p className="text-gray-400">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Import Data</h1>
      <p className="text-gray-400 mb-8">
        Import your historical data from CSV files. The import process is idempotent—re-running the same file won&apos;t create duplicates.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Transaction Import Section */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Import Transactions</CardTitle>
            <CardDescription>
              Import BUY, SELL, and DIVIDEND transactions for stocks, ETFs, and crypto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onFileSelect={setTransactionFile}
              onFileClear={handleTransactionFileClear}
              disabled={transactionLoading}
            />

            {transactionFile && !transactionResults && (
              <Button
                onClick={handleTransactionImport}
                disabled={transactionLoading}
                className="w-full"
              >
                {transactionLoading ? "Importing..." : "Import Transactions"}
              </Button>
            )}

            {transactionResults && (
              <ImportResults
                imported={transactionResults.imported}
                skipped={transactionResults.skipped}
                errors={transactionResults.errors}
              />
            )}

            {/* CSV Format Example */}
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">CSV Format</h4>
              <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
{`date,symbol,action,quantity,unit_price,fees,currency,exchange,notes
2024-03-15,VAS.AX,BUY,10,95.50,9.50,AUD,ASX,
2024-03-20,BTC,BUY,0.5,65000,0,USD,,DCA purchase
2024-04-01,VAS.AX,DIVIDEND,10,0.85,0,AUD,ASX,Quarterly dividend`}
              </pre>
              <p className="text-xs text-gray-500 mt-2">
                Required: date, symbol, action, quantity, unit_price. Optional: fees, currency, exchange, notes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Snapshot Import Section */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Import Snapshots</CardTitle>
            <CardDescription>
              Import balance snapshots for super, cash, and debt accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onFileSelect={setSnapshotFile}
              onFileClear={handleSnapshotFileClear}
              disabled={snapshotLoading}
            />

            {snapshotFile && !snapshotResults && (
              <Button
                onClick={handleSnapshotImport}
                disabled={snapshotLoading}
                className="w-full"
              >
                {snapshotLoading ? "Importing..." : "Import Snapshots"}
              </Button>
            )}

            {snapshotResults && (
              <ImportResults
                imported={snapshotResults.imported}
                skipped={snapshotResults.skipped}
                errors={snapshotResults.errors}
              />
            )}

            {/* CSV Format Example */}
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">CSV Format</h4>
              <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
{`date,fund_name,balance,employer_contrib,employee_contrib,currency
2024-03-31,AustralianSuper,185000,1200,500,AUD
2024-03-31,Savings Account,25000,,,AUD
2024-03-31,Credit Card,-3500,,,AUD`}
              </pre>
              <p className="text-xs text-gray-500 mt-2">
                Required: date, fund_name, balance. Optional: employer_contrib, employee_contrib, currency.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
