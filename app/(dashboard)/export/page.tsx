"use client";

import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ExportPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();

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
          <CardContent>
            {/* US-010: Holdings export buttons and count will be added here */}
            <p className="text-sm text-gray-500">Export options coming soon...</p>
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
          <CardContent>
            {/* US-011: Transactions export buttons and count will be added here */}
            <p className="text-sm text-gray-500">Export options coming soon...</p>
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
          <CardContent>
            {/* US-012: Snapshots export buttons and count will be added here */}
            <p className="text-sm text-gray-500">Export options coming soon...</p>
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
          <CardContent>
            {/* US-013: Full backup button and counts will be added here */}
            <p className="text-sm text-gray-500">Export options coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
