/**
 * Email service for sending transactional emails using Resend.
 *
 * Uses the Resend SDK to send emails for:
 * - Monthly check-in reminders
 * - Test emails
 *
 * Requires RESEND_API_KEY environment variable to be set.
 */

import { Resend } from "resend";

/**
 * Resend client instance, lazily initialized.
 * Will be null if RESEND_API_KEY is not set.
 */
let resendClient: Resend | null = null;

/**
 * Gets or creates the Resend client instance.
 * Throws an error if RESEND_API_KEY is not configured.
 */
function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new EmailError(
      "RESEND_API_KEY environment variable is not set. Email sending is disabled."
    );
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Custom error for email operations
 */
export class EmailError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "EmailError";
  }
}

/**
 * Email send options
 */
export interface SendEmailOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML content for the email body */
  html: string;
  /** Optional plain text version */
  text?: string;
  /** Optional sender name/email (defaults to noreply@... from Resend) */
  from?: string;
  /** Optional reply-to address */
  replyTo?: string;
}

/**
 * Email send result
 */
export interface SendEmailResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Resend message ID if successful */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Sends an email using Resend.
 *
 * @param options - Email options including recipient, subject, and content
 * @returns Promise<SendEmailResult> - Result with success status and message ID
 * @throws EmailError if RESEND_API_KEY is not configured
 *
 * @example
 * const result = await sendEmail({
 *   to: "user@example.com",
 *   subject: "Monthly Check-in Reminder",
 *   html: "<h1>Time to update your net worth!</h1>",
 * });
 *
 * if (result.success) {
 *   console.log("Email sent:", result.messageId);
 * } else {
 *   console.error("Failed to send:", result.error);
 * }
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const client = getResendClient();

  // Default from address - use Resend's testing domain or configure your own
  const fromAddress = options.from || "Mjolnir <onboarding@resend.dev>";

  try {
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    if (error instanceof EmailError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error sending email";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Checks if email sending is configured.
 *
 * @returns true if RESEND_API_KEY is set, false otherwise
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
