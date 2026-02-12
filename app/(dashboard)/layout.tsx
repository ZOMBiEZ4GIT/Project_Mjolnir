import { DashboardErrorBoundary } from "@/components/dashboard/dashboard-error-boundary";
import { AppShell } from "@/components/layout/app-shell";
import { PageWrapper } from "@/components/layout/page-wrapper";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <DashboardErrorBoundary>
        <PageWrapper>{children}</PageWrapper>
      </DashboardErrorBoundary>
    </AppShell>
  );
}
