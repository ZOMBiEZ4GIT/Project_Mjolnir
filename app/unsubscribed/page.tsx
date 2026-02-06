import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Unsubscribed - Mjolnir",
  description: "Email preferences updated",
};

interface UnsubscribedPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function UnsubscribedPage({
  searchParams,
}: UnsubscribedPageProps) {
  const params = await searchParams;
  const success = params.success === "true";
  const error = params.error;

  // Determine the message based on status
  let title: string;
  let message: string;
  let Icon: typeof CheckCircle;
  let iconColor: string;

  if (success) {
    title = "Successfully Unsubscribed";
    message =
      "You've been unsubscribed from Mjolnir email reminders. You can re-enable them anytime in Settings.";
    Icon = CheckCircle;
    iconColor = "text-positive";
  } else if (error === "missing_token") {
    title = "Missing Token";
    message =
      "The unsubscribe link appears to be incomplete. Please use the full link from your email.";
    Icon = AlertTriangle;
    iconColor = "text-warning";
  } else if (error === "invalid_token") {
    title = "Invalid Link";
    message =
      "This unsubscribe link is invalid or has expired. Please try using a link from a more recent email.";
    Icon = XCircle;
    iconColor = "text-destructive";
  } else if (error === "user_not_found") {
    title = "User Not Found";
    message =
      "We couldn't find your account. You may have already unsubscribed or the link may be outdated.";
    Icon = AlertTriangle;
    iconColor = "text-warning";
  } else {
    title = "Something Went Wrong";
    message =
      "An unexpected error occurred. Please try again or contact support.";
    Icon = XCircle;
    iconColor = "text-destructive";
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center">
        {/* Icon */}
        <div className={`mb-6 ${iconColor}`}>
          <Icon className="h-16 w-16 mx-auto" />
        </div>

        {/* Title */}
        <h1 className="text-heading-lg text-foreground mb-4">{title}</h1>

        {/* Message */}
        <p className="text-muted-foreground mb-8">{message}</p>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/settings"
            className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-md transition-colors"
          >
            Go to Settings
          </Link>
          <Link
            href="/dashboard"
            className="block w-full bg-muted hover:bg-muted/80 text-foreground font-medium py-3 px-4 rounded-md transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-muted-foreground">
          If you have questions, please contact support.
        </p>
      </div>
    </div>
  );
}
