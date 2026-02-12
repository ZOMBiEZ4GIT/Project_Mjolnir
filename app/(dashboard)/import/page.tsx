"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { FileUpload } from "@/components/import/file-upload";
import { ImportResults, type ImportError } from "@/components/import/import-results";
import { ImportProgress } from "@/components/import/import-progress";
import { ImportPreview } from "@/components/import/import-preview";
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

// Parse CSV text into headers and rows
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));
  return { headers, rows };
}

export const dynamic = "force-dynamic";

interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

interface PreviewData {
  headers: string[];
  rows: string[][];
  warnings: string[];
}

// Validate transaction preview rows for obvious issues
function validateTransactionPreview(headers: string[], _rows: string[][]): string[] {
  const warnings: string[] = [];
  const requiredHeaders = ["date", "symbol", "action", "quantity", "unit_price"];
  const missing = requiredHeaders.filter(
    (h) => !headers.map((x) => x.toLowerCase()).includes(h)
  );
  if (missing.length > 0) {
    warnings.push(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  }
  return warnings;
}

// Validate snapshot preview rows for obvious issues
function validateSnapshotPreview(headers: string[], _rows: string[][]): string[] {
  const warnings: string[] = [];
  const requiredHeaders = ["date", "fund_name", "balance"];
  const missing = requiredHeaders.filter(
    (h) => !headers.map((x) => x.toLowerCase()).includes(h)
  );
  if (missing.length > 0) {
    warnings.push(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  }
  return warnings;
}

export default function ImportPage() {
  // Transaction import state
  const [transactionFile, setTransactionFile] = React.useState<File | null>(null);
  const [transactionPreview, setTransactionPreview] = React.useState<PreviewData | null>(null);
  const [transactionResults, setTransactionResults] = React.useState<ImportSummary | null>(null);
  const [transactionLoading, setTransactionLoading] = React.useState(false);
  const [transactionRowCount, setTransactionRowCount] = React.useState<number | undefined>(undefined);

  // Snapshot import state
  const [snapshotFile, setSnapshotFile] = React.useState<File | null>(null);
  const [snapshotPreview, setSnapshotPreview] = React.useState<PreviewData | null>(null);
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
    fetchRecentImports();
  }, [fetchRecentImports]);

  // Handle file selection with preview parsing
  const handleTransactionFileSelect = async (file: File) => {
    setTransactionFile(file);
    setTransactionResults(null);
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    setTransactionRowCount(rows.length);
    const warnings = validateTransactionPreview(headers, rows);
    setTransactionPreview({ headers, rows, warnings });
  };

  const handleSnapshotFileSelect = async (file: File) => {
    setSnapshotFile(file);
    setSnapshotResults(null);
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    setSnapshotRowCount(rows.length);
    const warnings = validateSnapshotPreview(headers, rows);
    setSnapshotPreview({ headers, rows, warnings });
  };

  const handleTransactionImport = async () => {
    if (!transactionFile) return;

    setTransactionLoading(true);
    setTransactionResults(null);
    setTransactionPreview(null);

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
    setSnapshotPreview(null);

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
    setTransactionPreview(null);
    setTransactionResults(null);
    setTransactionRowCount(undefined);
  };

  const handleSnapshotFileClear = () => {
    setSnapshotFile(null);
    setSnapshotPreview(null);
    setSnapshotResults(null);
    setSnapshotRowCount(undefined);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-heading-lg text-foreground mb-2">Import Data</h1>
      <p className="text-body-sm text-muted-foreground mb-8">
        Import your historical data from CSV files. The import process is idempotent—re-running the same file won&apos;t create duplicates.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
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

            {/* Preview step */}
            {transactionPreview && !transactionResults && !transactionLoading && (
              <ImportPreview
                headers={transactionPreview.headers}
                rows={transactionPreview.rows}
                warnings={transactionPreview.warnings}
                onConfirm={handleTransactionImport}
                onCancel={handleTransactionFileClear}
                isLoading={transactionLoading}
                importType="Transactions"
              />
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

            {/* Preview step */}
            {snapshotPreview && !snapshotResults && !snapshotLoading && (
              <ImportPreview
                headers={snapshotPreview.headers}
                rows={snapshotPreview.rows}
                warnings={snapshotPreview.warnings}
                onConfirm={handleSnapshotImport}
                onCancel={handleSnapshotFileClear}
                isLoading={snapshotLoading}
                importType="Snapshots"
              />
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
        <h2 className="text-label uppercase text-muted-foreground mb-4">Recent Imports</h2>
        <RecentImports imports={recentImports} isLoading={recentImportsLoading} />
      </div>
    </div>
  );
}
