import { DashboardErrorBoundary } from "@/components/dashboard/dashboard-error-boundary";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
    </AppShell>
  );
}
