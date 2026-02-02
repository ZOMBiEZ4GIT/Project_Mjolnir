"use client";

import { ErrorBoundary } from "@/components/error-boundary";

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
}

export function DashboardErrorBoundary({ children }: DashboardErrorBoundaryProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
