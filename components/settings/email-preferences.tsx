"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Mail, Calendar, Send, Loader2 } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Response from the preferences API
 */
interface PreferencesResponse {
  displayCurrency: string;
  showNativeCurrency: boolean;
  emailReminders: boolean;
  reminderDay: number;
  updatedAt: string;
}

/**
 * Fetches user preferences from the API.
 */
async function fetchPreferences(): Promise<PreferencesResponse> {
  const response = await fetch("/api/preferences");
  if (!response.ok) {
    throw new Error(`Failed to fetch preferences: ${response.status}`);
  }
  return response.json();
}

/**
 * Updates user preferences via the API.
 */
async function updatePreferences(
  updates: { emailReminders?: boolean; reminderDay?: number }
): Promise<PreferencesResponse> {
  const response = await fetch("/api/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error(`Failed to update preferences: ${response.status}`);
  }
  return response.json();
}

/**
 * Response from the test email API
 */
interface TestEmailResponse {
  success: boolean;
  message: string;
  needsCheckIn: boolean;
  holdingsToUpdate: number;
  messageId?: string;
  error?: string;
}

/**
 * Sends a test email to the current user.
 */
async function sendTestEmail(): Promise<TestEmailResponse> {
  const response = await fetch("/api/email/test", {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? `Failed to send test email: ${response.status}`);
  }
  return data;
}

/**
 * Generate day options 1-28
 */
const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}${getDaySuffix(i + 1)}`,
}));

/**
 * Get ordinal suffix for a day number
 */
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Props for the EmailPreferences component.
 */
export interface EmailPreferencesProps {
  className?: string;
}

/**
 * EmailPreferences Component
 *
 * Allows the user to manage their email reminder settings:
 * - Toggle email reminders on/off
 * - Select which day of the month to receive reminders (1-28)
 * - Displays the user's email address from Clerk
 *
 * @example
 * <EmailPreferences />
 */
export function EmailPreferences({ className }: EmailPreferencesProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const queryClient = useQueryClient();

  // Fetch preferences using the same query key as CurrencyProvider
  const {
    data: preferences,
    isLoading: isPreferencesLoading,
  } = useQuery({
    queryKey: ["preferences"],
    queryFn: fetchPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Mutation for updating email reminders toggle
  const updateRemindersMutation = useMutation({
    mutationFn: (emailReminders: boolean) => updatePreferences({ emailReminders }),
    onMutate: async (emailReminders) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["preferences"] });
      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<PreferencesResponse>(["preferences"]);
      // Optimistically update
      if (previousPreferences) {
        queryClient.setQueryData<PreferencesResponse>(["preferences"], {
          ...previousPreferences,
          emailReminders,
        });
      }
      return { previousPreferences };
    },
    onSuccess: () => {
      toast.success("Email preferences updated");
    },
    onError: (_err, _newValue, context) => {
      // Revert on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(["preferences"], context.previousPreferences);
      }
      toast.error("Failed to update email preferences");
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });

  // Mutation for updating reminder day
  const updateReminderDayMutation = useMutation({
    mutationFn: (reminderDay: number) => updatePreferences({ reminderDay }),
    onMutate: async (reminderDay) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["preferences"] });
      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<PreferencesResponse>(["preferences"]);
      // Optimistically update
      if (previousPreferences) {
        queryClient.setQueryData<PreferencesResponse>(["preferences"], {
          ...previousPreferences,
          reminderDay,
        });
      }
      return { previousPreferences };
    },
    onSuccess: () => {
      toast.success("Reminder day updated");
    },
    onError: (_err, _newValue, context) => {
      // Revert on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(["preferences"], context.previousPreferences);
      }
      toast.error("Failed to update reminder day");
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });

  // Mutation for sending test email
  const sendTestEmailMutation = useMutation({
    mutationFn: sendTestEmail,
    onSuccess: (data) => {
      if (data.needsCheckIn) {
        toast.success("Test email sent successfully! Check your inbox.");
      } else {
        toast.info("No email sent: all holdings are up to date for this month.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send test email");
    },
  });

  const isLoading = !isUserLoaded || isPreferencesLoading;

  // Get user's primary email address
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  // Handle toggle change
  const handleRemindersToggle = (checked: boolean) => {
    updateRemindersMutation.mutate(checked);
  };

  // Handle day change
  const handleDayChange = (value: string) => {
    const day = parseInt(value, 10);
    if (!isNaN(day) && day >= 1 && day <= 28) {
      updateReminderDayMutation.mutate(day);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className ?? ""}`}>
        <div className="flex items-center gap-3">
          <span className="h-6 w-6 rounded bg-gray-700 animate-pulse" />
          <span className="h-5 w-48 rounded bg-gray-700 animate-pulse" />
        </div>
        <div className="space-y-4 pl-9">
          <div className="flex items-center gap-3">
            <span className="h-5 w-9 rounded-full bg-gray-700 animate-pulse" />
            <span className="h-4 w-32 rounded bg-gray-700 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <span className="h-9 w-24 rounded bg-gray-700 animate-pulse" />
            <span className="h-4 w-40 rounded bg-gray-700 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const emailReminders = preferences?.emailReminders ?? true;
  const reminderDay = preferences?.reminderDay ?? 1;

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      {/* Email address display */}
      <div className="flex items-center gap-3 text-gray-300">
        <Mail className="h-5 w-5 text-gray-400" />
        <span className="text-sm">
          Reminders will be sent to{" "}
          <span className="font-medium text-white">{userEmail ?? "your email"}</span>
        </span>
      </div>

      {/* Settings container */}
      <div className="space-y-4 pl-8">
        {/* Email reminders toggle */}
        <div className="flex items-center gap-3">
          <Switch
            id="email-reminders"
            checked={emailReminders}
            onCheckedChange={handleRemindersToggle}
            disabled={updateRemindersMutation.isPending}
          />
          <Label
            htmlFor="email-reminders"
            className="text-gray-300 cursor-pointer text-sm"
          >
            Enable monthly check-in reminders
          </Label>
        </div>

        {/* Reminder day selector */}
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-gray-400" />
          <Label htmlFor="reminder-day" className="text-gray-300 text-sm">
            Send reminder on the
          </Label>
          <Select
            value={String(reminderDay)}
            onValueChange={handleDayChange}
            disabled={!emailReminders || updateReminderDayMutation.isPending}
          >
            <SelectTrigger
              id="reminder-day"
              className="w-[100px]"
              aria-label="Select reminder day"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-gray-300 text-sm">of each month</span>
        </div>

        {/* Helper text */}
        {emailReminders && (
          <p className="text-xs text-gray-500 pl-7">
            You&apos;ll receive an email reminder when your super, cash, or debt balances need updating.
          </p>
        )}

        {/* Test email button */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendTestEmailMutation.mutate()}
            disabled={sendTestEmailMutation.isPending}
            className="gap-2"
          >
            {sendTestEmailMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-1">
            Send a test reminder email to verify your email configuration.
          </p>
        </div>
      </div>
    </div>
  );
}
