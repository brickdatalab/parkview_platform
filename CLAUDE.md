# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Internal dashboard for Parkview Advance MCA/business loan brokerage. Tracks funded deals, commission calculations, and payment status. See README.md for full documentation.

## Commands

```bash
# Development (use port 3456)
PORT=3456 npm run dev

# Build & production
npm run build
npm start

# Lint
npm run lint
```

## Tech Stack

- **Framework:** Next.js 16 App Router with React 19
- **Styling:** Tailwind CSS 4 with shadcn/ui (new-york style)
- **Database:** Supabase (PostgreSQL)
- **Tables:** TanStack React Table for data grids
- **Build:** Turbopack (built into Next.js)

## Architecture

### Path Aliases
Use `@/*` for imports from `./src/*`:
```typescript
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
```

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   └── dashboard/          # Main dashboard routes
├── components/
│   ├── ui/                 # shadcn/ui primitives (do not modify directly)
│   ├── layout/             # AppSidebar, SiteHeader
│   ├── dashboard/          # Funded deals components
│   └── commissions/        # Commission tracking components
├── lib/
│   ├── supabase/           # Supabase client utilities
│   │   ├── client.ts       # Browser client (use in Client Components)
│   │   ├── server.ts       # Server client (use in Server Components)
│   │   └── middleware.ts   # Middleware helper for route protection
│   ├── queries.ts          # Data fetching functions
│   ├── table-utils.ts      # Table sorting/filtering logic
│   └── utils.ts            # cn() classname utility
├── types/
│   └── database.ts         # Supabase schema types
└── hooks/
    └── use-mobile.ts       # Responsive breakpoint hook
```

### Layout Hierarchy
```
RootLayout → DashboardLayout → SidebarProvider → AppSidebar + SidebarInset → Page
```

Sidebar collapse state persists via `sidebar_state` cookie.

## Key Patterns

### Supabase Client
Use the appropriate client based on context:

**Browser/Client Components:**
```typescript
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()
```

**Server Components/Route Handlers:**
```typescript
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()
```

### Authentication
- Uses `@supabase/ssr` for cookie-based sessions
- Middleware in `middleware.ts` protects `/dashboard/*` routes
- Redirects unauthenticated users to `/login`
- User metadata (first_name, last_name) stored in `raw_user_meta_data`

### Adding shadcn/ui Components
```bash
npx shadcn@latest add <component-name>
```

### Styling Utilities
Use `cn()` for conditional classnames:
```typescript
import { cn } from "@/lib/utils"
cn("base-class", isActive && "active-class")
```

## Database

Supabase project: `irssizfmrqeqcxwdvkhx` (us-east-1)

Primary table: `funded_deals` (~3,760 rows)
- Contains all funded deal data with denormalized rep/lender names
- Key fields: `deal_name`, `funded_amount`, `rep`, `lender`, `commission`, `parkview_rep_paid`

Related tables: `reps`, `lenders`, `commission_payout_reps`, `internal_funded_form`

**Important:** The fetch functions in `queries.ts` paginate to bypass Supabase's 1000-row default limit.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Copy from `.env.example` and fill with Supabase credentials.

## Current Limitations

1. **Commission updates not persisted** - Mark Paid/Clawback only updates UI state
2. **Submit page** - Placeholder, not implemented
3. **Chat page** - Placeholder, not implemented
4. **Invite-only auth** - No public signup; users must be added via Supabase dashboard
