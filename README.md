# Mjolnir

Personal net worth tracking dashboard.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Neon (Serverless PostgreSQL)
- **ORM:** Drizzle ORM
- **Styling:** Tailwind CSS with shadcn/ui
- **Authentication:** Clerk
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A Neon database account
- A Clerk account

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd project_mjolnir
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Fill in the values in `.env`:
   - `DATABASE_URL`: Get from [Neon Console](https://console.neon.tech/)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Get from [Clerk Dashboard](https://dashboard.clerk.com/)
   - `CLERK_SECRET_KEY`: Get from [Clerk Dashboard](https://dashboard.clerk.com/)

4. Run database migrations:
   ```bash
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

npm run db:generate  # Generate Drizzle migration from schema
npm run db:migrate   # Run pending migrations
npm run db:push      # Push schema changes directly (dev only)
npm run db:studio    # Open Drizzle Studio
```

## Deployment

The app is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

## License

Private project.
