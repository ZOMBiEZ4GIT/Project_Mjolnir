# PRD: W-10 Email Reminders

## Introduction

Email reminders help Roland stay on top of monthly check-ins by sending a reminder email when it's time to update snapshot holdings. The system uses Vercel Cron for scheduling and Resend for email delivery. Users can configure their preferred reminder day and opt out if desired. A welcome email is sent on signup to confirm email setup.

## Goals

- Send monthly reminder emails prompting check-in
- Allow user to configure reminder day of month
- Include holdings summary and net worth change in reminder
- Provide snooze/skip option for the current month
- Send welcome email on signup
- Use Vercel Cron for scheduling and Resend for delivery
- Robust error handling with retry logic

## User Stories

### US-001: Create email preferences schema
**Description:** As a developer, I need to store user email preferences.

**Acceptance Criteria:**
- [ ] Add email fields to `user_preferences` table (or create if not exists)
- [ ] Fields: reminder_enabled (boolean, default true), reminder_day (integer 1-28, default 1), last_reminder_sent (timestamp, nullable), reminder_snoozed_until (date, nullable)
- [ ] Generate migration with `npm run db:generate`
- [ ] Run migration with `npm run db:migrate`
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### US-002: Create email preferences API endpoints
**Description:** As a developer, I need API endpoints to manage email preferences.

**Acceptance Criteria:**
- [ ] Update `app/api/preferences/route.ts` to include email fields
- [ ] GET returns: { reminderEnabled, reminderDay, lastReminderSent }
- [ ] PATCH accepts: { reminderEnabled?, reminderDay? }
- [ ] Validates reminderDay is 1-28
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-003: Create Resend email service
**Description:** As a developer, I need a service to send emails via Resend.

**Acceptance Criteria:**
- [ ] Create `lib/services/email.ts`
- [ ] Function `sendEmail(to, subject, html, text?): Promise<{ success, messageId?, error? }>`
- [ ] Uses RESEND_API_KEY environment variable
- [ ] Handles rate limiting gracefully
- [ ] Returns structured result (not throws on failure)
- [ ] Logs email attempts for debugging
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create email templates
**Description:** As a developer, I need HTML email templates for reminders.

**Acceptance Criteria:**
- [ ] Create `lib/emails/templates/` directory
- [ ] Create `reminder.tsx` - monthly reminder template (React Email or HTML)
- [ ] Create `welcome.tsx` - welcome email template
- [ ] Templates include: Mjolnir branding, dark-friendly design
- [ ] Reminder includes: greeting, holdings needing update, net worth change, CTA button
- [ ] Welcome includes: greeting, getting started tips, link to dashboard
- [ ] Templates render to HTML string
- [ ] Typecheck passes
- [ ] Lint passes

### US-005: Create reminder email content generator
**Description:** As a developer, I need to generate personalized reminder content.

**Acceptance Criteria:**
- [ ] Create `lib/emails/reminder-content.ts`
- [ ] Function `generateReminderContent(userId): Promise<ReminderData>`
- [ ] Returns: { userName, holdingsNeedingUpdate[], lastNetWorth, currentNetWorth, netWorthChange }
- [ ] Fetches holdings without current month snapshot
- [ ] Calculates net worth change since last check-in
- [ ] Typecheck passes
- [ ] Lint passes

### US-006: Create send reminder API endpoint
**Description:** As a developer, I need an API endpoint to trigger reminder emails.

**Acceptance Criteria:**
- [ ] Create `app/api/emails/send-reminder/route.ts` with POST handler
- [ ] Accepts optional `userId` param (for testing single user)
- [ ] Without param: sends to all users due for reminder today
- [ ] Checks: reminder_enabled, reminder_day matches today, not snoozed, not already sent this month
- [ ] Updates last_reminder_sent on success
- [ ] Returns: { sent: number, failed: number, skipped: number }
- [ ] Requires API secret or Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-007: Create Vercel Cron job configuration
**Description:** As a developer, I need to configure Vercel Cron to trigger daily reminder checks.

**Acceptance Criteria:**
- [ ] Create `vercel.json` cron configuration
- [ ] Cron runs daily at 8:00 AM UTC (configurable)
- [ ] Cron calls POST /api/emails/send-reminder
- [ ] Document cron setup in README
- [ ] Include CRON_SECRET for secure endpoint access
- [ ] Typecheck passes
- [ ] Lint passes

### US-008: Create welcome email sender
**Description:** As a developer, I need to send welcome emails on user signup.

**Acceptance Criteria:**
- [ ] Create `app/api/emails/send-welcome/route.ts` with POST handler
- [ ] Accepts: { userId, email, name }
- [ ] Sends welcome email using template
- [ ] Called from Clerk webhook or after first sign-in
- [ ] Idempotent: doesn't resend if already welcomed
- [ ] Typecheck passes
- [ ] Lint passes

### US-009: Create Clerk webhook for new users
**Description:** As a developer, I need to handle new user signups to send welcome email.

**Acceptance Criteria:**
- [ ] Create `app/api/webhooks/clerk/route.ts`
- [ ] Handles `user.created` event
- [ ] Extracts user email and name from webhook payload
- [ ] Calls welcome email sender
- [ ] Creates default user_preferences record
- [ ] Verifies webhook signature (CLERK_WEBHOOK_SECRET)
- [ ] Typecheck passes
- [ ] Lint passes

### US-010: Create email preferences UI
**Description:** As Roland, I want to configure my email reminder preferences.

**Acceptance Criteria:**
- [ ] Add "Email Preferences" section to profile/settings page
- [ ] Toggle: "Enable monthly reminders"
- [ ] Dropdown: "Reminder day" (1-28)
- [ ] Shows last reminder sent date
- [ ] Save button updates preferences via API
- [ ] Success toast on save
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-011: Create snooze reminder functionality
**Description:** As Roland, I want to snooze the reminder for this month.

**Acceptance Criteria:**
- [ ] Add "Snooze" link in reminder email
- [ ] Link goes to `/api/emails/snooze?token=...`
- [ ] Snooze sets reminder_snoozed_until to end of current month
- [ ] Redirects to dashboard with success message
- [ ] Token is signed/encrypted to prevent abuse
- [ ] Typecheck passes
- [ ] Lint passes

### US-012: Create skip month functionality
**Description:** As Roland, I want to skip the check-in for this month entirely.

**Acceptance Criteria:**
- [ ] Add "Skip this month" link in reminder email
- [ ] Marks current month as intentionally skipped (no reminder resend)
- [ ] Different from snooze: snooze delays, skip acknowledges
- [ ] Redirects to dashboard with confirmation
- [ ] Typecheck passes
- [ ] Lint passes

### US-013: Create unsubscribe functionality
**Description:** As Roland, I want to unsubscribe from reminder emails.

**Acceptance Criteria:**
- [ ] Add "Unsubscribe" link in email footer
- [ ] Link goes to `/api/emails/unsubscribe?token=...`
- [ ] Sets reminder_enabled to false
- [ ] Redirects to confirmation page
- [ ] Confirmation page offers re-subscribe option
- [ ] Token is signed to prevent abuse
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-014: Create email sending retry logic
**Description:** As a developer, I need retry logic for failed email sends.

**Acceptance Criteria:**
- [ ] Create `lib/services/email-queue.ts` (or add to email.ts)
- [ ] Function `sendEmailWithRetry(params, maxRetries = 3): Promise<Result>`
- [ ] Exponential backoff: 1s, 4s, 16s
- [ ] Logs each attempt
- [ ] Returns final result after all retries exhausted
- [ ] Typecheck passes
- [ ] Lint passes

### US-015: Create email sending logs
**Description:** As a developer, I need to track email sending for debugging.

**Acceptance Criteria:**
- [ ] Create `email_logs` table
- [ ] Fields: id, user_id, email_type (reminder/welcome), status (sent/failed/bounced), sent_at, error_message, resend_message_id
- [ ] Log each email attempt
- [ ] Useful for debugging delivery issues
- [ ] Generate and run migration
- [ ] Typecheck passes
- [ ] Lint passes

### US-016: Create email preview/test endpoint
**Description:** As a developer, I need to preview emails during development.

**Acceptance Criteria:**
- [ ] Create `app/api/emails/preview/route.ts` with GET handler
- [ ] Supports `?template=reminder|welcome`
- [ ] Returns rendered HTML (not sent)
- [ ] Only available in development environment
- [ ] Uses mock data for preview
- [ ] Typecheck passes
- [ ] Lint passes

### US-017: Update environment variables documentation
**Description:** As a developer, I need documentation for email-related env vars.

**Acceptance Criteria:**
- [ ] Update `.env.example` with RESEND_API_KEY
- [ ] Update `.env.example` with CRON_SECRET
- [ ] Update `.env.example` with CLERK_WEBHOOK_SECRET
- [ ] Add comments explaining where to get each key
- [ ] Document email sender address configuration
- [ ] Typecheck passes
- [ ] Lint passes

### US-018: Create email dashboard/status page (optional)
**Description:** As Roland, I want to see my email history and status.

**Acceptance Criteria:**
- [ ] Add "Email History" section to settings
- [ ] Shows recent emails sent (from email_logs)
- [ ] Shows next scheduled reminder date
- [ ] Shows current preferences
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

## Functional Requirements

- FR-1: Monthly reminder emails sent via Resend
- FR-2: Vercel Cron triggers daily check for users due reminders
- FR-3: User can configure reminder day (1-28)
- FR-4: User can enable/disable reminders
- FR-5: Reminder includes: holdings needing update, net worth change
- FR-6: Welcome email sent on signup via Clerk webhook
- FR-7: Snooze delays reminder for current month
- FR-8: Skip acknowledges month without reminder resend
- FR-9: Unsubscribe link in all emails
- FR-10: Email sending has retry logic (3 attempts)
- FR-11: Email logs stored for debugging

## Non-Goals

- No weekly summary emails (keep it simple)
- No real-time notifications (push, SMS)
- No email marketing or promotional content
- No digest of multiple users (single-user app)
- No custom email templates by user

## Design Considerations

- Email design: clean, minimal, dark-mode friendly when possible
- Mjolnir branding: hammer icon, consistent colors
- Mobile-friendly email layout
- Clear CTA button: "Update Now" or "Open Mjolnir"
- Footer with unsubscribe and preferences links

## Technical Considerations

- Resend free tier: 100 emails/day, 3000/month (sufficient for single user)
- Vercel Cron free tier: runs in serverless functions
- Webhook signature verification critical for security
- Email tokens should be JWT or signed with expiry
- Consider react-email for template development
- Test emails with Resend test mode before production

## Success Metrics

- Reminder emails delivered successfully
- < 1% email bounce rate
- User can configure preferences without issues
- Cron job runs reliably daily
- No TypeScript errors, lint passes

## Open Questions

- Should we add email verification for non-Clerk email addresses?
- Should we support multiple email addresses per user?
- Should reminder time be configurable (not just day)?
