"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  sectionName?: string;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * A lightweight error boundary for individual dashboard sections.
 * Catches errors in one section without affecting other sections.
 */
export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const sectionName = this.props.sectionName || "Section";
    console.error(`SectionErrorBoundary (${sectionName}) caught an error:`, error);
    console.error("Error info:", errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const sectionName = this.props.sectionName || "This section";

      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-destructive">
              {sectionName} failed to load
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <p className="text-sm text-muted-foreground">
              Something went wrong. Try refreshing this section.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-2 max-h-24 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
          </CardContent>
          <CardFooter className="py-4">
            <Button onClick={this.handleReset} variant="outline" size="sm">
              Retry
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}
