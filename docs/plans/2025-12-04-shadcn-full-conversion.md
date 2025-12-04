# Parkview Dashboard - Full shadcn Conversion

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete design system conversion from custom styling to 100% shadcn components and patterns. No mixing - full replacement.

**Architecture:** Replace custom sidebar/layout with shadcn's SidebarProvider pattern from dashboard-01. Rebuild all pages using shadcn component patterns. Keep existing business logic (data fetching, state management) but wrap in shadcn UI.

**Tech Stack:** Next.js 16, React 19, shadcn/ui (new-york style), @tanstack/react-table, Tailwind CSS 4, lucide-react

---

## Phase 1: Install shadcn Components

### Task 1.1: Install Core Layout Components

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/sidebar.tsx`
- Create: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/scroll-area.tsx`
- Create: `src/hooks/use-mobile.tsx`

**Step 1: Install shadcn sidebar and dependencies**

Run:
```bash
cd /Users/vitolo/clean3/parkview-dashboard && npx shadcn@latest add sidebar avatar skeleton tooltip scroll-area
```

Expected: Components added to `src/components/ui/`, hook added to `src/hooks/`

**Step 2: Verify installation**

Run:
```bash
ls -la src/components/ui/sidebar.tsx src/components/ui/avatar.tsx src/components/ui/skeleton.tsx
```

Expected: All files exist

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: install shadcn sidebar, avatar, skeleton, tooltip, scroll-area"
```

---

### Task 1.2: Install Additional UI Components

**Files:**
- Create: `src/components/ui/drawer.tsx`
- Create: `src/components/ui/sheet.tsx`
- Create: `src/components/ui/collapsible.tsx`
- Create: `src/components/ui/breadcrumb.tsx`

**Step 1: Install remaining components**

Run:
```bash
cd /Users/vitolo/clean3/parkview-dashboard && npx shadcn@latest add drawer sheet collapsible breadcrumb sonner
```

Expected: Components added

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: install shadcn drawer, sheet, collapsible, breadcrumb, sonner"
```

---

## Phase 2: Create New Layout Structure

### Task 2.1: Create AppSidebar Component

**Files:**
- Create: `src/components/layout/app-sidebar.tsx`

**Step 1: Create the new AppSidebar**

Create `src/components/layout/app-sidebar.tsx`:

```tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  DollarSign,
  MessageSquare,
  Settings,
  HelpCircle,
  LogOut,
  Bird,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const navMain = [
  { title: "Funded Deals", href: "/dashboard", icon: BarChart3 },
  { title: "Commissions", href: "/dashboard/commissions", icon: DollarSign },
  { title: "Chat", href: "/dashboard/chat", icon: MessageSquare },
]

const navSecondary = [
  { title: "Settings", href: "#", icon: Settings },
  { title: "Help", href: "#", icon: HelpCircle },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bird className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Database</span>
                  <span className="truncate text-xs text-muted-foreground">Birdseye</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">AF</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Alex Figueroa</span>
                    <span className="truncate text-xs text-muted-foreground">Admin</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
```

**Step 2: Verify file created**

Run:
```bash
cat src/components/layout/app-sidebar.tsx | head -20
```

Expected: File content visible

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: create AppSidebar component using shadcn sidebar"
```

---

### Task 2.2: Create Site Header Component

**Files:**
- Create: `src/components/layout/site-header.tsx`

**Step 1: Create the site header**

Create `src/components/layout/site-header.tsx`:

```tsx
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface SiteHeaderProps {
  title: string
  breadcrumbs?: { label: string; href?: string }[]
}

export function SiteHeader({ title, breadcrumbs }: SiteHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={index}>
                {index < breadcrumbs.length - 1 ? (
                  <>
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      ) : (
        <h1 className="text-base font-medium">{title}</h1>
      )}
    </header>
  )
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: create SiteHeader component with breadcrumbs"
```

---

### Task 2.3: Replace Dashboard Layout

**Files:**
- Modify: `src/app/dashboard/layout.tsx`
- Delete: `src/components/layout/sidebar.tsx` (old custom sidebar)

**Step 1: Update dashboard layout to use SidebarProvider**

Replace `src/app/dashboard/layout.tsx` with:

```tsx
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { cookies } from "next/headers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

**Step 2: Delete old sidebar**

Run:
```bash
rm src/components/layout/sidebar.tsx
```

**Step 3: Verify build works**

Run:
```bash
cd /Users/vitolo/clean3/parkview-dashboard && npm run build 2>&1 | head -50
```

Expected: Build succeeds or shows expected errors for pages not yet updated

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: replace layout with SidebarProvider pattern, remove old sidebar"
```

---

## Phase 3: Update Dashboard Pages

### Task 3.1: Create Section Cards Component (shadcn style)

**Files:**
- Replace: `src/components/dashboard/summary-cards.tsx`

**Step 1: Rewrite summary cards using shadcn patterns**

Replace `src/components/dashboard/summary-cards.tsx` with:

```tsx
import { DollarSign, TrendingUp, FileText, Percent } from "lucide-react"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardSummary } from "@/lib/queries"
import { formatLargeNumber, formatCurrency, formatNumber, formatFactorRate } from "@/lib/queries"

interface SummaryCardsProps {
  summary: DashboardSummary
  isLoading?: boolean
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardFooter>
        <Skeleton className="h-4 w-20" />
      </CardFooter>
    </Card>
  )
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>Total Funded</CardDescription>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardTitle className="px-6 text-2xl font-bold">
          {formatLargeNumber(summary.totalFunded)}
        </CardTitle>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(summary.totalFunded)}
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>Total Commission</CardDescription>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardTitle className="px-6 text-2xl font-bold">
          {formatLargeNumber(summary.totalCommission)}
        </CardTitle>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Commission + PSF</p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>Deal Count</CardDescription>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardTitle className="px-6 text-2xl font-bold">
          {formatNumber(summary.dealCount)}
        </CardTitle>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Funded deals</p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>Avg Factor Rate</CardDescription>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardTitle className="px-6 text-2xl font-bold">
          {formatFactorRate(summary.avgFactorRate)}
        </CardTitle>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Across all deals</p>
        </CardFooter>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "refactor: rewrite SummaryCards with shadcn patterns and skeleton"
```

---

### Task 3.2: Update Dashboard Page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Update dashboard page to use SiteHeader**

Replace `src/app/dashboard/page.tsx` with:

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { FundedDealsTable } from '@/components/dashboard/funded-deals-table'
import { fetchFundedDeals } from '@/lib/queries'
import type { FundedDeal } from '@/types/database'
import type { DashboardSummary } from '@/lib/queries'

export default function DashboardPage() {
  const [allDeals, setAllDeals] = useState<FundedDeal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)
        const dealsData = await fetchFundedDeals()
        setAllDeals(dealsData)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('Failed to load dashboard data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const summary = useMemo<DashboardSummary>(() => {
    if (allDeals.length === 0) {
      return { totalFunded: 0, totalCommission: 0, dealCount: 0, avgFactorRate: 0 }
    }
    const totalFunded = allDeals.reduce((sum, deal) => sum + (deal.funded_amount ?? 0), 0)
    const totalCommission = allDeals.reduce((sum, deal) => sum + (deal.commission ?? 0) + (deal.psf ?? 0), 0)
    const dealCount = allDeals.length
    const factorRates = allDeals.map(deal => deal.factor_rate).filter((rate): rate is number => rate !== null && rate > 0)
    const avgFactorRate = factorRates.length > 0 ? factorRates.reduce((sum, rate) => sum + rate, 0) / factorRates.length : 0
    return { totalFunded, totalCommission, dealCount, avgFactorRate }
  }, [allDeals])

  if (error) {
    return (
      <>
        <SiteHeader title="Funded Deals" />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <SiteHeader title="Funded Deals" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Funded Deals</h1>
          <p className="text-sm text-muted-foreground">
            View and analyze funded deals from Master Funded
          </p>
        </div>
        <SummaryCards summary={summary} isLoading={isLoading} />
        <FundedDealsTable data={allDeals} totalCount={allDeals.length} isLoading={isLoading} />
      </div>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "refactor: update dashboard page with SiteHeader"
```

---

### Task 3.3: Update Commissions Page

**Files:**
- Modify: `src/app/dashboard/commissions/page.tsx`

**Step 1: Update commissions page to use SiteHeader and sonner for toasts**

Replace the toast div with sonner integration. Update imports and use SiteHeader:

```tsx
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { SiteHeader } from '@/components/layout/site-header'
import { fetchFundedDeals } from '@/lib/queries'
import { CommissionsTable } from '@/components/commissions/commissions-table'
import { ActionBar } from '@/components/commissions/action-bar'
import { Skeleton } from '@/components/ui/skeleton'
import type { FundedDeal, DealWithPayment, PaymentStatus } from '@/types/database'

export default function CommissionsPage() {
  const [deals, setDeals] = useState<DealWithPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadDeals() {
      try {
        setLoading(true)
        setError(null)
        const allDeals = await fetchFundedDeals()
        const dealsWithPayment: DealWithPayment[] = allDeals.map((deal: FundedDeal) => ({
          ...deal,
          payment_status: (deal.parkview_rep_paid ? 'Paid' : 'Pending') as PaymentStatus,
          paid_date: null,
        }))
        setDeals(dealsWithPayment)
      } catch (err) {
        console.error('Error fetching deals:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch deals')
      } finally {
        setLoading(false)
      }
    }
    loadDeals()
  }, [])

  const handleSelectId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === deals.length) return new Set()
      return new Set(deals.map((d) => d.id))
    })
  }, [deals])

  const handleMarkPaid = useCallback(() => {
    setDeals((prev) =>
      prev.map((deal) =>
        selectedIds.has(deal.id)
          ? { ...deal, payment_status: 'Paid' as PaymentStatus, paid_date: new Date().toISOString() }
          : deal
      )
    )
    const count = selectedIds.size
    setSelectedIds(new Set())
    toast.success(`${count} deal${count > 1 ? 's' : ''} marked as paid`)
  }, [selectedIds])

  const handleMarkClawback = useCallback(() => {
    setDeals((prev) =>
      prev.map((deal) =>
        selectedIds.has(deal.id)
          ? { ...deal, payment_status: 'Clawback' as PaymentStatus }
          : deal
      )
    )
    const count = selectedIds.size
    setSelectedIds(new Set())
    toast.success(`${count} deal${count > 1 ? 's' : ''} marked as clawback`)
  }, [selectedIds])

  const summaryStats = useMemo(() => {
    const pending = deals.filter((d) => d.payment_status === 'Pending')
    const paid = deals.filter((d) => d.payment_status === 'Paid')
    const clawback = deals.filter((d) => d.payment_status === 'Clawback')
    const totalCommission = deals.reduce((sum, d) => sum + (d.rep_commission || 0), 0)
    const pendingCommission = pending.reduce((sum, d) => sum + (d.rep_commission || 0), 0)
    return {
      total: deals.length,
      pending: pending.length,
      paid: paid.length,
      clawback: clawback.length,
      totalCommission,
      pendingCommission,
    }
  }, [deals])

  if (loading) {
    return (
      <>
        <SiteHeader title="Commissions" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <span className="text-muted-foreground">Loading all deals...</span>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <SiteHeader title="Commissions" />
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading deals</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <SiteHeader title="Commission Tracking" />
      <div className="flex flex-1 flex-col">
        <div className="border-b px-6 py-6">
          <h1 className="text-2xl font-bold">Commission Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage commission payments for funded deals
          </p>
        </div>

        <ActionBar
          selectedCount={selectedIds.size}
          totalCount={deals.length}
          allSelected={selectedIds.size === deals.length && deals.length > 0}
          onSelectAll={handleSelectAll}
          onMarkPaid={handleMarkPaid}
          onMarkClawback={handleMarkClawback}
        />

        <div className="flex-1 overflow-auto px-6 py-2">
          <CommissionsTable
            data={deals}
            totalCount={deals.length}
            isLoading={loading}
            selectedIds={selectedIds}
            onSelectId={handleSelectId}
            onSelectAll={handleSelectAll}
          />
        </div>

        <div className="border-t bg-muted/50 px-6 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-6">
              <span className="text-muted-foreground">
                Total: <span className="font-medium text-foreground">{summaryStats.total}</span>
              </span>
              <span className="text-muted-foreground">
                Pending: <span className="font-medium text-amber-600">{summaryStats.pending}</span>
              </span>
              <span className="text-muted-foreground">
                Paid: <span className="font-medium text-green-600">{summaryStats.paid}</span>
              </span>
              <span className="text-muted-foreground">
                Clawback: <span className="font-medium text-red-600">{summaryStats.clawback}</span>
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">
                Pending: <span className="font-mono font-medium text-amber-600">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summaryStats.pendingCommission)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
```

**Step 2: Add Toaster to root layout**

Modify `src/app/layout.tsx` to add Toaster:

```tsx
import { Toaster } from "@/components/ui/sonner"

// In the body, add before closing:
<Toaster />
```

**Step 3: Commit**

```bash
git add -A && git commit -m "refactor: update commissions page with SiteHeader and sonner toasts"
```

---

### Task 3.4: Update Chat Page

**Files:**
- Modify: `src/app/dashboard/chat/page.tsx`

**Step 1: Update chat page with SiteHeader**

Read current chat page and update with SiteHeader pattern.

**Step 2: Commit**

```bash
git add -A && git commit -m "refactor: update chat page with SiteHeader"
```

---

## Phase 4: Final Cleanup

### Task 4.1: Remove Old Unused Files

**Files:**
- Verify deleted: `src/components/layout/sidebar.tsx`

**Step 1: Verify no imports to old sidebar**

Run:
```bash
grep -r "from.*layout/sidebar" src/
```

Expected: No results

**Step 2: Commit if any cleanup needed**

```bash
git add -A && git commit -m "chore: cleanup old sidebar imports"
```

---

### Task 4.2: Verify Build and Test

**Step 1: Run build**

```bash
cd /Users/vitolo/clean3/parkview-dashboard && npm run build
```

Expected: Build succeeds

**Step 2: Run dev server and test**

```bash
cd /Users/vitolo/clean3/parkview-dashboard && npm run dev
```

Test manually:
- [ ] Sidebar opens/closes
- [ ] Navigation works
- [ ] Dashboard loads with data
- [ ] Commissions page loads
- [ ] Toast notifications work
- [ ] Mobile responsive

**Step 3: Final commit**

```bash
git add -A && git commit -m "chore: verify build passes after shadcn conversion"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1.1-1.2 | Install shadcn components (sidebar, avatar, skeleton, etc.) |
| 2 | 2.1-2.3 | Create new layout structure (AppSidebar, SiteHeader, SidebarProvider) |
| 3 | 3.1-3.4 | Update all dashboard pages to use new components |
| 4 | 4.1-4.2 | Cleanup and verify |

**Total estimated tasks:** 9 discrete tasks with ~25 individual steps

**Key files created:**
- `src/components/layout/app-sidebar.tsx`
- `src/components/layout/site-header.tsx`

**Key files modified:**
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/commissions/page.tsx`
- `src/components/dashboard/summary-cards.tsx`

**Key files deleted:**
- `src/components/layout/sidebar.tsx`
