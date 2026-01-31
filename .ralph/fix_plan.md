# Ralph Fix Plan

**FIRST STEP:** This is a blank project. Start by running:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

## High Priority
- [ ] Next.js 14+ installed with App Router enabled
- [ ] TypeScript configured with strict mode
- [ ] `tsconfig.json` includes appropriate compiler options
- [ ] Project runs with `npm run dev` on localhost
- [ ] No TypeScript compilation errors
- [ ] `package.json` includes all necessary Next.js dependencies
- [ ] Tailwind CSS installed and configured
- [ ] `tailwind.config.ts` includes dark mode configuration (`class` strategy)
- [ ] Global CSS file imports Tailwind directives
- [ ] Tailwind styles apply correctly to test elements
- [ ] CSS utilities work in components (verify with test div using Tailwind classes)
- [ ] Verify in browser using dev-browser skill
- [ ] shadcn/ui CLI initialized with appropriate configuration
- [ ] `components.json` created with correct paths
- [ ] Base components installed: Button, Card, Dialog, Input, Label, Form, Select, Tabs
- [ ] `lib/utils.ts` exists with `cn()` helper function
- [ ] Button component renders without errors
- [ ] Verify Button component in browser using dev-browser skill
- [ ] Drizzle ORM installed (`drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`)
- [ ] `drizzle.config.ts` created with placeholder connection string
- [ ] Schema file created at `lib/db/schema.ts`
- [ ] `users` table schema defined (references Clerk user ID)
- [ ] `holdings` table schema defined with all fields from data model
- [ ] `transactions` table schema defined with foreign key to holdings
- [ ] `snapshots` table schema defined with unique constraint (holding_id + date)
- [ ] `contributions` table schema defined with foreign key to holdings
- [ ] `price_cache` table schema defined
- [ ] All enums defined (HoldingType, Currency, TransactionAction, Exchange)
- [ ] TypeScript types exported from schema
- [ ] No migration generated yet (out of scope)


## Medium Priority


## Low Priority


## Completed
- [x] Project enabled for Ralph

## Notes
- Focus on MVP functionality first
- Ensure each feature is properly tested
- Update this file after each major milestone
