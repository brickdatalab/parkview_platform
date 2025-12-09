# Low-Hanging Fruit Optimizations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 6 safe performance and UX optimizations that enhance the Parkview Dashboard without breaking existing functionality.

**Architecture:** Each optimization is isolated and independent - they can be implemented in parallel by separate sub-agents. No optimization modifies database operations, auth flow, or n8n workflows. All changes are additive UI/UX improvements.

**Tech Stack:** Next.js 16, React 19, SWR, shadcn/ui (Skeleton, Badge, Card components already installed)

**Branch:** `feat/low-hanging-fruit-optimizations`

---

## Parallel Execution Strategy

These 6 tasks are designed to run concurrently with ZERO conflicts:

| Task | Agent Type | Files Modified | Dependencies |
|------|------------|----------------|--------------|
| 1. SWR for Funded Deals | `react-component-developer` | `hooks/use-funded-deals.ts` (NEW), `app/dashboard/page.tsx` | None |
| 2. Prefetch Funded Deals | `Frontend Developer` | `hooks/use-funded-deals.ts`, `components/layout/app-sidebar.tsx` | Task 1 must complete first |
| 3. Summary Cards on Commissions | `react-component-developer` | `components/commissions/commission-summary-cards.tsx` (NEW), `app/dashboard/commissions/reps/page.tsx`, `app/dashboard/commissions/iso/page.tsx` | None |
| 4. URL Filter Persistence | `Frontend Developer` | `app/dashboard/page.tsx`, `lib/url-filters.ts` (NEW) | None |
| 5. Empty State Design | `UI Designer` + `react-component-developer` | `components/ui/empty-state.tsx` (NEW), integrate into tables | None |
| 6. Loading Skeletons | `react-component-developer` | `components/dashboard/table-skeleton.tsx` (NEW), `app/dashboard/page.tsx` | None |

**Execution Order:**
- Wave 1 (Parallel): Tasks 1, 3, 4, 5, 6
- Wave 2 (After Task 1): Task 2

---

## Task 1: SWR Caching for Funded Deals Page

**Agent:** `react-component-developer`

**Files:**
- Create: `src/hooks/use-funded-deals.ts`
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Create the SWR hook for funded deals**

Create `src/hooks/use-funded-deals.ts`:
```typescript
'use client'

import useSWR, { preload } from 'swr'
import { fetchFundedDeals } from '@/lib/queries'
import type { FundedDeal } from '@/types/database'

// Cache key
export const FUNDED_DEALS_KEY = 'funded-deals'

// SWR configuration matching commission pages
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 minute
  keepPreviousData: true,
}

/**
 * Hook for fetching Funded Deals with client-side caching
 * - First load: fetches from Supabase
 * - Subsequent loads: instant from cache, background refresh
 */
export function useFundedDeals() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<FundedDeal[]>(
    FUNDED_DEALS_KEY,
    fetchFundedDeals,
    swrConfig
  )

  return {
    data: data ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

/**
 * Prefetch funded deals data - call on sidebar hover
 */
export function prefetchFundedDeals() {
  preload(FUNDED_DEALS_KEY, fetchFundedDeals)
}
```

**Step 2: Update dashboard page to use SWR hook**

Modify `src/app/dashboard/page.tsx`:

Replace the current useState/useEffect pattern:
```typescript
// OLD CODE TO REMOVE:
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
      setFilteredDeals(dealsData)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  loadData()
}, [])
```

With the SWR hook:
```typescript
// NEW CODE:
import { useFundedDeals } from '@/hooks/use-funded-deals'

// Inside component:
const { data: allDeals, error: fetchError, isLoading } = useFundedDeals()
const [filteredDeals, setFilteredDeals] = useState<FundedDeal[]>([])

// Update filtered deals when allDeals changes
useEffect(() => {
  setFilteredDeals(allDeals)
}, [allDeals])

// Convert error object to string for display
const error = fetchError ? 'Failed to load dashboard data. Please try again.' : null
```

**Step 3: Remove unused imports**

Remove `fetchFundedDeals` from imports since it's now used inside the hook.

**Step 4: Verify no breaking changes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add src/hooks/use-funded-deals.ts src/app/dashboard/page.tsx
git commit -m "feat: add SWR caching to Funded Deals page

- Create useFundedDeals hook with same config as commissions
- Add prefetchFundedDeals function for sidebar hover
- Instant page loads on return visits

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Prefetch Funded Deals on Sidebar Hover

**Agent:** `Frontend Developer`

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

**Depends on:** Task 1 must be complete (needs `prefetchFundedDeals` function)

**Step 1: Import prefetch function**

Add to imports in `src/components/layout/app-sidebar.tsx`:
```typescript
import { prefetchFundedDeals } from "@/hooks/use-funded-deals"
```

**Step 2: Add onMouseEnter to Funded Deals link**

Find the navKnowledge map section and update the Link:

```typescript
// Find this code around line 131-145:
{navKnowledge.map((item) => (
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

// Replace with:
{navKnowledge.map((item) => (
  <SidebarMenuItem key={item.title}>
    <SidebarMenuButton
      asChild
      isActive={pathname === item.href}
      tooltip={item.title}
    >
      <Link
        href={item.href}
        onMouseEnter={item.href === '/dashboard' ? prefetchFundedDeals : undefined}
      >
        <item.icon />
        <span>{item.title}</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
))}
```

**Step 3: Verify functionality**

Run: `PORT=3456 npm run dev`
Test: Hover over "Funded Deals" in sidebar, then click - should load instantly

**Step 4: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: prefetch funded deals on sidebar hover

- Data loads in background when user hovers
- Instant navigation feel when clicking

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Summary Cards on Commission Pages

**Agent:** `react-component-developer`

**Files:**
- Create: `src/components/commissions/commission-summary-cards.tsx`
- Modify: `src/app/dashboard/commissions/reps/page.tsx`
- Modify: `src/app/dashboard/commissions/iso/page.tsx`

**Step 1: Create reusable CommissionSummaryCards component**

Create `src/components/commissions/commission-summary-cards.tsx`:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/queries'
import { DollarSign, FileText, Clock, CheckCircle } from 'lucide-react'

interface CommissionSummary {
  totalDeals: number
  totalCommission: number
  pendingAmount: number
  paidAmount: number
  pendingCount: number
  paidCount: number
}

interface CommissionSummaryCardsProps {
  summary: CommissionSummary
  isLoading?: boolean
  variant?: 'rep' | 'iso'
}

export function CommissionSummaryCards({
  summary,
  isLoading,
  variant = 'rep',
}: CommissionSummaryCardsProps) {
  const cards = [
    {
      title: 'Total Deals',
      value: summary.totalDeals.toString(),
      icon: FileText,
      description: `${variant === 'rep' ? 'Rep' : 'ISO'} commission records`,
    },
    {
      title: 'Total Commission',
      value: formatCurrency(summary.totalCommission),
      icon: DollarSign,
      description: 'Combined commission value',
    },
    {
      title: 'Pending',
      value: formatCurrency(summary.pendingAmount),
      icon: Clock,
      description: `${summary.pendingCount} deals awaiting payment`,
      className: 'text-amber-600',
    },
    {
      title: 'Paid',
      value: formatCurrency(summary.paidAmount),
      icon: CheckCircle,
      description: `${summary.paidCount} deals completed`,
      className: 'text-green-600',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${card.className || 'text-muted-foreground'}`}>
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.className || 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.className || ''}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Calculate summary from commission data
 */
export function calculateCommissionSummary<T extends { commission_amount: number | null; paid: boolean | null }>(
  data: T[]
): CommissionSummary {
  const totalDeals = data.length
  const totalCommission = data.reduce((sum, d) => sum + (d.commission_amount || 0), 0)

  const paidDeals = data.filter(d => d.paid === true)
  const pendingDeals = data.filter(d => d.paid !== true)

  const paidAmount = paidDeals.reduce((sum, d) => sum + (d.commission_amount || 0), 0)
  const pendingAmount = pendingDeals.reduce((sum, d) => sum + (d.commission_amount || 0), 0)

  return {
    totalDeals,
    totalCommission,
    pendingAmount,
    paidAmount,
    pendingCount: pendingDeals.length,
    paidCount: paidDeals.length,
  }
}
```

**Step 2: Add summary cards to Rep Commissions page**

Modify `src/app/dashboard/commissions/reps/page.tsx`:

Add import at top:
```typescript
import { CommissionSummaryCards, calculateCommissionSummary } from '@/components/commissions/commission-summary-cards'
```

Add summary calculation (after the data hook):
```typescript
const summary = useMemo(() => calculateCommissionSummary(data), [data])
```

Add cards in the JSX (after SiteHeader, before the table):
```typescript
<div className="p-6 space-y-6">
  {/* Summary Cards - ADD THIS */}
  <CommissionSummaryCards
    summary={summary}
    isLoading={isLoading}
    variant="rep"
  />

  {/* Existing table content */}
  ...
</div>
```

**Step 3: Add summary cards to ISO Commissions page**

Modify `src/app/dashboard/commissions/iso/page.tsx`:

Same pattern as Step 2 but with `variant="iso"`.

**Step 4: Verify both pages render correctly**

Run: `PORT=3456 npm run dev`
Navigate to `/dashboard/commissions/reps` and `/dashboard/commissions/iso`
Expected: 4 summary cards appear above each table

**Step 5: Commit**

```bash
git add src/components/commissions/commission-summary-cards.tsx \
        src/app/dashboard/commissions/reps/page.tsx \
        src/app/dashboard/commissions/iso/page.tsx
git commit -m "feat: add summary cards to commission pages

- Create reusable CommissionSummaryCards component
- Show Total Deals, Total Commission, Pending, Paid
- Skeleton loading state
- Consistent with funded deals page design

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: URL-Based Filter Persistence

**Agent:** `Frontend Developer`

**Files:**
- Create: `src/lib/url-filters.ts`
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Create URL filter utilities**

Create `src/lib/url-filters.ts`:
```typescript
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { TableState, ColumnFilter } from '@/types/table'

/**
 * Serialize table state to URL search params
 */
export function serializeFiltersToUrl(state: TableState): URLSearchParams {
  const params = new URLSearchParams()

  // Serialize column filters
  if (state.filters.length > 0) {
    state.filters.forEach(filter => {
      params.set(`filter_${filter.columnId}`, filter.selectedValues.join(','))
    })
  }

  // Serialize date range
  if (state.dateRange.startDate) {
    params.set('startDate', state.dateRange.startDate)
  }
  if (state.dateRange.endDate) {
    params.set('endDate', state.dateRange.endDate)
  }

  // Serialize sort (only first sort for simplicity)
  if (state.sortConfigs.length > 0) {
    const sort = state.sortConfigs[0]
    params.set('sortBy', sort.columnId)
    params.set('sortDir', sort.direction)
  }

  // Serialize grouping
  if (state.groupBy !== 'none') {
    params.set('groupBy', state.groupBy)
  }

  return params
}

/**
 * Parse URL search params to partial table state
 */
export function parseFiltersFromUrl(searchParams: URLSearchParams): Partial<TableState> {
  const state: Partial<TableState> = {}
  const filters: ColumnFilter[] = []

  // Parse column filters
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter_')) {
      const columnId = key.replace('filter_', '')
      filters.push({
        columnId: columnId as ColumnFilter['columnId'],
        selectedValues: value.split(',').filter(Boolean),
      })
    }
  })

  if (filters.length > 0) {
    state.filters = filters
  }

  // Parse date range
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  if (startDate || endDate) {
    state.dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
    }
  }

  // Parse sort
  const sortBy = searchParams.get('sortBy')
  const sortDir = searchParams.get('sortDir')
  if (sortBy && sortDir) {
    state.sortConfigs = [{
      columnId: sortBy as any,
      direction: sortDir as 'asc' | 'desc',
    }]
  }

  // Parse grouping
  const groupBy = searchParams.get('groupBy')
  if (groupBy) {
    state.groupBy = groupBy as any
  }

  return state
}

/**
 * Hook to sync table state with URL
 */
export function useUrlFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateUrl = useCallback((state: TableState) => {
    const params = serializeFiltersToUrl(state)
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [router, pathname])

  const initialState = parseFiltersFromUrl(searchParams)

  return { initialState, updateUrl }
}
```

**Step 2: Integrate URL filters into dashboard page**

Modify `src/app/dashboard/page.tsx`:

Add imports:
```typescript
import { useUrlFilters } from '@/lib/url-filters'
import { Suspense } from 'react'
```

Wrap component with Suspense (required for useSearchParams):
```typescript
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  // existing component code here
}

function DashboardSkeleton() {
  return (
    <>
      <SiteHeader title="Funded Deals" />
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    </>
  )
}
```

Inside DashboardContent, add URL sync:
```typescript
const { initialState, updateUrl } = useUrlFilters()

// Pass initialState to FundedDealsTable as initialFilters prop
// Call updateUrl when filters change
```

**Step 3: Update FundedDealsTable to accept initial state**

Add prop to FundedDealsTable:
```typescript
interface FundedDealsTableProps {
  data: FundedDeal[]
  totalCount: number
  isLoading?: boolean
  onFilteredDataChange?: (filteredData: FundedDeal[]) => void
  initialState?: Partial<TableState>  // NEW
  onStateChange?: (state: TableState) => void  // NEW
}
```

**Step 4: Verify filters persist across refresh**

Run: `PORT=3456 npm run dev`
Test: Apply filter, check URL updates, refresh page, filter should persist

**Step 5: Commit**

```bash
git add src/lib/url-filters.ts src/app/dashboard/page.tsx src/components/dashboard/funded-deals-table.tsx
git commit -m "feat: persist table filters in URL

- Filters survive page refresh and browser back
- Shareable filtered views via URL
- Sync sort, filters, date range, grouping

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Empty State Design Component

**Agent:** `UI Designer` (design) + `react-component-developer` (implementation)

**Files:**
- Create: `src/components/ui/empty-state.tsx`
- Modify: `src/components/dashboard/funded-deals-table.tsx` (minimal change)

**Step 1: Create EmptyState component**

Create `src/components/ui/empty-state.tsx`:
```typescript
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchX, FileX, FilterX, Inbox } from 'lucide-react'

type EmptyStateVariant = 'no-results' | 'no-data' | 'filtered' | 'default'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const variantConfig: Record<EmptyStateVariant, {
  icon: typeof SearchX
  defaultTitle: string
  defaultDescription: string
}> = {
  'no-results': {
    icon: SearchX,
    defaultTitle: 'No results found',
    defaultDescription: 'Try adjusting your search or filters',
  },
  'no-data': {
    icon: FileX,
    defaultTitle: 'No data yet',
    defaultDescription: 'Data will appear here once available',
  },
  'filtered': {
    icon: FilterX,
    defaultTitle: 'No matches',
    defaultDescription: 'No items match the current filters',
  },
  'default': {
    icon: Inbox,
    defaultTitle: 'Nothing here',
    defaultDescription: 'There are no items to display',
  },
}

export function EmptyState({
  variant = 'default',
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description || config.defaultDescription}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
```

**Step 2: Update funded-deals-table empty state**

In `src/components/dashboard/funded-deals-table.tsx`, replace the simple empty state:

```typescript
// Find this code (around line 521-530):
<TableRow>
  <TableCell
    colSpan={visibleColumnDefs.length}
    className="h-24 text-center text-muted-foreground"
  >
    No deals found for the selected filters.
  </TableCell>
</TableRow>

// Replace with:
import { EmptyState } from '@/components/ui/empty-state'

// ... in render:
<TableRow>
  <TableCell colSpan={visibleColumnDefs.length} className="p-0">
    <EmptyState
      variant="filtered"
      title="No deals found"
      description="Try adjusting your filters or date range"
      actionLabel="Clear Filters"
      onAction={() => {
        setTableState(prev => ({
          ...prev,
          filters: [],
          dateRange: { startDate: null, endDate: null },
          currentPage: 1,
        }))
      }}
    />
  </TableCell>
</TableRow>
```

**Step 3: Verify empty state displays correctly**

Run: `PORT=3456 npm run dev`
Test: Apply impossible filter combination, see styled empty state

**Step 4: Commit**

```bash
git add src/components/ui/empty-state.tsx src/components/dashboard/funded-deals-table.tsx
git commit -m "feat: add EmptyState component with variants

- Support for no-results, no-data, filtered, default variants
- Icon, title, description, optional action button
- Integrate into funded deals table

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Enhanced Loading Skeletons

**Agent:** `react-component-developer`

**Files:**
- Create: `src/components/dashboard/table-skeleton.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Create TableSkeleton component**

Create `src/components/dashboard/table-skeleton.tsx`:
```typescript
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  showToolbar?: boolean
}

export function TableSkeleton({
  rows = 10,
  columns = 8,
  showHeader = true,
  showToolbar = true,
}: TableSkeletonProps) {
  return (
    <Card className="border-0 shadow-sm">
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            {showToolbar && (
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
                <div className="ml-auto flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton
                      className={`h-4 ${colIndex === 0 ? 'w-32' : 'w-16'} ${
                        colIndex > 3 ? 'ml-auto' : ''
                      }`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

/**
 * Summary cards skeleton for consistent loading state
 */
export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-28 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Step 2: Update dashboard page to use new skeleton**

Modify `src/app/dashboard/page.tsx`:

Import the skeleton:
```typescript
import { TableSkeleton, SummaryCardsSkeleton } from '@/components/dashboard/table-skeleton'
```

Update the loading state in the Suspense fallback and anywhere loading is shown:
```typescript
function DashboardSkeleton() {
  return (
    <>
      <SiteHeader title="Funded Deals" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <SummaryCardsSkeleton />
        <TableSkeleton rows={10} columns={8} />
      </div>
    </>
  )
}
```

**Step 3: Verify skeleton matches actual layout**

Run: `PORT=3456 npm run dev`
Add artificial delay to see skeleton, verify it matches table structure

**Step 4: Commit**

```bash
git add src/components/dashboard/table-skeleton.tsx src/app/dashboard/page.tsx
git commit -m "feat: add proper skeleton loading states

- TableSkeleton component with configurable rows/columns
- SummaryCardsSkeleton for consistent card loading
- Matches actual table structure for smooth transition

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Final Integration & Testing

**After all tasks complete:**

**Step 1: Run full build**
```bash
npm run build
```
Expected: No errors

**Step 2: Run dev server and test all features**
```bash
PORT=3456 npm run dev
```

Test checklist:
- [ ] Funded Deals page loads with cached data on return
- [ ] Sidebar hover prefetches data
- [ ] Commission pages show summary cards
- [ ] URL reflects filters, persists on refresh
- [ ] Empty state shows with clear filters button
- [ ] Skeleton loading matches page structure

**Step 3: Final commit**
```bash
git add .
git commit -m "chore: finalize low-hanging fruit optimizations

All 6 optimizations implemented:
1. SWR caching for Funded Deals
2. Prefetch on sidebar hover
3. Commission summary cards
4. URL filter persistence
5. Empty state design
6. Enhanced loading skeletons

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Agent Assignment Summary

| Task | Recommended Agent | Reason |
|------|------------------|--------|
| **Task 1** | `react-component-developer` | React hook creation, state management |
| **Task 2** | `Frontend Developer` | Simple integration, event handling |
| **Task 3** | `react-component-developer` | New component, reusable pattern |
| **Task 4** | `Frontend Developer` | URL/routing, Next.js specific |
| **Task 5** | `react-component-developer` | UI component with variants |
| **Task 6** | `react-component-developer` | Component composition, shadcn patterns |

**Parallel Execution:**
- Wave 1: Tasks 1, 3, 4, 5, 6 (all independent)
- Wave 2: Task 2 (depends on Task 1's prefetch function)
