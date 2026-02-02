/**
 * Email template for monthly check-in reminders.
 *
 * Uses React Email components for consistent email rendering.
 * Dark mode styling to match the app's design.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/**
 * Holdings summary passed to the email template
 */
export interface HoldingsSummary {
  /** Number of super holdings needing update */
  superCount: number;
  /** Number of cash holdings needing update */
  cashCount: number;
  /** Number of debt holdings needing update */
  debtCount: number;
  /** Total holdings needing update */
  totalCount: number;
}

/**
 * Props for the check-in reminder email
 */
export interface CheckInReminderEmailProps {
  /** User's first name for personalized greeting */
  userName?: string;
  /** Current month formatted (e.g., "February 2026") */
  currentMonth: string;
  /** Summary of holdings needing updates */
  holdings: HoldingsSummary;
  /** URL to the check-in page */
  checkInUrl: string;
  /** Optional unsubscribe URL */
  unsubscribeUrl?: string;
}

/**
 * Dark mode color palette matching the app
 */
const colors = {
  background: "#111827", // gray-900
  cardBackground: "#1f2937", // gray-800
  border: "#374151", // gray-700
  text: "#f9fafb", // gray-50
  textMuted: "#9ca3af", // gray-400
  primary: "#3b82f6", // blue-500
  primaryHover: "#2563eb", // blue-600
};

/**
 * Monthly check-in reminder email template
 */
export function CheckInReminderEmail({
  userName,
  currentMonth,
  holdings,
  checkInUrl,
  unsubscribeUrl,
}: CheckInReminderEmailProps) {
  const greeting = userName ? `Hi ${userName}` : "Hi";
  const previewText = `Time to update your ${currentMonth} balances in Mjolnir`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>Mjolnir</Heading>
          </Section>

          {/* Main Content */}
          <Section style={styles.content}>
            <Heading style={styles.heading}>{greeting},</Heading>

            <Text style={styles.text}>
              It&apos;s time for your monthly check-in! Your {currentMonth}{" "}
              balances are ready to be updated.
            </Text>

            {/* Holdings Summary Card */}
            <Section style={styles.summaryCard}>
              <Heading as="h3" style={styles.summaryHeading}>
                Holdings to Update
              </Heading>

              {holdings.superCount > 0 && (
                <Text style={styles.summaryItem}>
                  <span style={styles.bullet}>•</span> Superannuation:{" "}
                  {holdings.superCount} account
                  {holdings.superCount !== 1 ? "s" : ""}
                </Text>
              )}

              {holdings.cashCount > 0 && (
                <Text style={styles.summaryItem}>
                  <span style={styles.bullet}>•</span> Cash:{" "}
                  {holdings.cashCount} account
                  {holdings.cashCount !== 1 ? "s" : ""}
                </Text>
              )}

              {holdings.debtCount > 0 && (
                <Text style={styles.summaryItem}>
                  <span style={styles.bullet}>•</span> Debt:{" "}
                  {holdings.debtCount} balance
                  {holdings.debtCount !== 1 ? "s" : ""}
                </Text>
              )}

              <Text style={styles.totalText}>
                Total: {holdings.totalCount} holding
                {holdings.totalCount !== 1 ? "s" : ""} need
                {holdings.totalCount === 1 ? "s" : ""} your attention
              </Text>
            </Section>

            {/* CTA Button */}
            <Section style={styles.buttonContainer}>
              <Link href={checkInUrl} style={styles.button}>
                Complete Check-in
              </Link>
            </Section>

            <Text style={styles.textSmall}>
              Keeping your balances up to date ensures accurate net worth
              tracking and helps you stay on top of your financial goals.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              This email was sent by Mjolnir, your personal net worth tracker.
            </Text>
            {unsubscribeUrl && (
              <Text style={styles.footerText}>
                <Link href={unsubscribeUrl} style={styles.footerLink}>
                  Unsubscribe from reminders
                </Link>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Styles for the email template
 */
const styles = {
  body: {
    backgroundColor: colors.background,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: colors.background,
    margin: "0 auto",
    maxWidth: "600px",
    padding: "20px",
  },
  header: {
    borderBottom: `1px solid ${colors.border}`,
    paddingBottom: "20px",
    marginBottom: "20px",
  },
  logo: {
    color: colors.text,
    fontSize: "24px",
    fontWeight: "bold" as const,
    margin: 0,
    textAlign: "center" as const,
  },
  content: {
    padding: "0 20px",
  },
  heading: {
    color: colors.text,
    fontSize: "20px",
    fontWeight: "600" as const,
    marginBottom: "16px",
  },
  text: {
    color: colors.textMuted,
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "24px",
  },
  textSmall: {
    color: colors.textMuted,
    fontSize: "14px",
    lineHeight: "20px",
    marginTop: "24px",
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
  },
  summaryHeading: {
    color: colors.text,
    fontSize: "16px",
    fontWeight: "600" as const,
    marginTop: 0,
    marginBottom: "16px",
  },
  summaryItem: {
    color: colors.textMuted,
    fontSize: "14px",
    lineHeight: "24px",
    margin: "8px 0",
  },
  bullet: {
    color: colors.primary,
    marginRight: "8px",
  },
  totalText: {
    color: colors.text,
    fontSize: "14px",
    fontWeight: "500" as const,
    marginTop: "16px",
    paddingTop: "12px",
    borderTop: `1px solid ${colors.border}`,
  },
  buttonContainer: {
    textAlign: "center" as const,
    marginBottom: "24px",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "600" as const,
    padding: "12px 32px",
    textDecoration: "none",
  },
  footer: {
    borderTop: `1px solid ${colors.border}`,
    marginTop: "40px",
    paddingTop: "20px",
    textAlign: "center" as const,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "8px 0",
  },
  footerLink: {
    color: colors.textMuted,
    textDecoration: "underline",
  },
};

/**
 * Default export for React Email preview
 */
export default CheckInReminderEmail;
