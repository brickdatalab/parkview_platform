# Commissions Split (Reps / ISO) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the Commissions sidebar into two views - "Reps" for in-house rep commissions and "ISO" for ISO partner commissions, each reading from their respective tables.

**Architecture:** Collapsible sidebar submenu with two routes. Each route queries its respective commission table (commission_payout_reps or commission_payout_iso) joined with funded_deals for deal details. Reps view includes "Funder Paid Us" column for broker deals.

**Tech Stack:** Next.js App Router, Supabase, shadcn/ui Collapsible + SidebarMenuSub components, existing CommissionsTable pattern

---

### Task 1: Add RLS Policies for Commission Tables

**Files:**
- None (Supabase SQL)

**Step 1: Add RLS policy for commission_payout_reps**

Run in Supabase SQL Editor:
```sql
CREATE POLICY "Allow authenticated read access to commission_payout_reps"
ON public.commission_payout_reps FOR SELECT
TO authenticated
USING (true);
```

**Step 2: Add RLS policy for commission_payout_iso**

```sql
CREATE POLICY "Allow authenticated read access to commission_payout_iso"
ON public.commission_payout_iso FOR SELECT
TO authenticated
USING (true);
```

**Step 3: Verify policies exist**

```sql
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('commission_payout_reps', 'commission_payout_iso');
```

Expected: 2 rows with authenticated policies

---

### Task 2: Update Sidebar with Collapsible Commissions Menu

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Add imports for Collapsible components**

At top of file, add to lucide imports:
```typescript
import {
  BarChart3,
  DollarSign,
  MessageSquare,
  LogOut,
  PlusCircle,
  ChevronRight,
  Users,
  Building,
} from "lucide-react"
```

Add shadcn imports:
```typescript
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
```

**Step 2: Remove Commissions from navKnowledge array**

Change:
```typescript
const navKnowledge = [
  { title: "Funded Deals", href: "/dashboard", icon: BarChart3 },
  { title: "Commissions", href: "/dashboard/commissions", icon: DollarSign },
]
```

To:
```typescript
const navKnowledge = [
  { title: "Funded Deals", href: "/dashboard", icon: BarChart3 },
]
```

**Step 3: Add Commissions collapsible after Knowledge group**

After the navKnowledge.map() section, add:
```tsx
{/* Commissions with submenu */}
<Collapsible defaultOpen className="group/collapsible">
  <SidebarMenuItem>
    <CollapsibleTrigger asChild>
      <SidebarMenuButton tooltip="Commissions">
        <DollarSign />
        <span>Commissions</span>
        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      </SidebarMenuButton>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton
            asChild
            isActive={pathname === "/dashboard/commissions/reps"}
          >
            <Link href="/dashboard/commissions/reps">
              <Users className="h-4 w-4" />
              <span>Reps</span>
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton
            asChild
            isActive={pathname === "/dashboard/commissions/iso"}
          >
            <Link href="/dashboard/commissions/iso">
              <Building className="h-4 w-4" />
              <span>ISO</span>
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    </CollapsibleContent>
  </SidebarMenuItem>
</Collapsible>
```

**Step 4: Verify sidebar renders correctly**

Run: `PORT=3456 npm run dev`
Navigate to dashboard, verify Commissions expands with Reps/ISO sub-items

---

### Task 3: Create Data Types for Commission Payouts

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add commission payout types**

Add to `src/types/database.ts`:
```typescript
export interface CommissionPayoutRep {
  id: string
  funded_deal_id: string
  rep_id: string
  commission_amount: number | null
  split_percentage: number | null
  is_primary_rep: boolean | null
  paid: boolean | null
  paid_date: string | null
  requested: boolean | null
  payment_status: string | null
  notes: string | null
  business_main_id: string
  created_at: string | null
  updated_at: string | null
  // Joined fields
  deal_name?: string
  rep_name?: string
  funded_date?: string
  funded_amount?: number
  lender?: string
  lender_inhouse?: boolean
  funder_paid_parkview?: boolean
}

export interface CommissionPayoutISO {
  id: string
  funded_deal_id: string
  rep_id: string
  commission_amount: number | null
  paid: boolean | null
  paid_date: string | null
  payment_status: string | null
  notes: string | null
  business_main_id: string
  created_at: string | null
  updated_at: string | null
  // Joined fields
  deal_name?: string
  iso_name?: string
  funded_date?: string
  funded_amount?: number
  lender?: string
}
```

---

### Task 4: Create Query Functions for Commission Tables

**Files:**
- Modify: `src/lib/queries.ts`

**Step 1: Add fetch function for rep commissions**

```typescript
export async function fetchRepCommissions(): Promise<CommissionPayoutRep[]> {
  const { data, error } = await createClient()
    .from('commission_payout_reps')
    .select(`
      *,
      funded_deals!inner (
        deal_name,
        funded_date,
        funded_amount,
        lender,
        funder_paid_parkview,
        lender_id,
        lenders!inner (
          inhouse_funded
        )
      ),
      reps!inner (
        name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching rep commissions:', error)
    throw error
  }

  return (data || []).map((row: any) => ({
    ...row,
    deal_name: row.funded_deals?.deal_name,
    rep_name: row.reps?.name,
    funded_date: row.funded_deals?.funded_date,
    funded_amount: row.funded_deals?.funded_amount,
    lender: row.funded_deals?.lender,
    lender_inhouse: row.funded_deals?.lenders?.inhouse_funded,
    funder_paid_parkview: row.funded_deals?.funder_paid_parkview,
  }))
}
```

**Step 2: Add fetch function for ISO commissions**

```typescript
export async function fetchISOCommissions(): Promise<CommissionPayoutISO[]> {
  const { data, error } = await createClient()
    .from('commission_payout_iso')
    .select(`
      *,
      funded_deals!inner (
        deal_name,
        funded_date,
        funded_amount,
        lender
      ),
      reps!inner (
        name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching ISO commissions:', error)
    throw error
  }

  return (data || []).map((row: any) => ({
    ...row,
    deal_name: row.funded_deals?.deal_name,
    iso_name: row.reps?.name,
    funded_date: row.funded_deals?.funded_date,
    funded_amount: row.funded_deals?.funded_amount,
    lender: row.funded_deals?.lender,
  }))
}
```

**Step 3: Add import for types**

At top of queries.ts:
```typescript
import type { FundedDeal, RepSummary, CommissionPayoutRep, CommissionPayoutISO } from '@/types/database'
```

---

### Task 5: Create Reps Commissions Page

**Files:**
- Create: `src/app/dashboard/commissions/reps/page.tsx`

**Step 1: Create the page file**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { fetchRepCommissions } from '@/lib/queries'
import type { CommissionPayoutRep } from '@/types/database'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/queries'

export default function RepsCommissionsPage() {
  const [data, setData] = useState<CommissionPayoutRep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const commissions = await fetchRepCommissions()
        setData(commissions)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <>
        <SiteHeader title="Rep Commissions" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <SiteHeader title="Rep Commissions" />
        <div className="p-6 text-red-600">{error}</div>
      </>
    )
  }

  const pendingCount = data.filter(d => d.payment_status === 'Pending').length
  const paidCount = data.filter(d => d.payment_status === 'Paid').length
  const totalCommission = data.reduce((sum, d) => sum + (d.commission_amount || 0), 0)

  return (
    <>
      <SiteHeader title="Rep Commissions" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{paidCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal Name</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Funded Date</TableHead>
                  <TableHead className="text-right">Funded Amount</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Paid to Rep</TableHead>
                  <TableHead>Funder Paid Us</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.deal_name}</TableCell>
                    <TableCell>{row.rep_name}</TableCell>
                    <TableCell>{row.lender}</TableCell>
                    <TableCell>{row.funded_date}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.funded_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.commission_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.paid ? 'default' : 'secondary'}>
                        {row.paid ? 'Paid' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.lender_inhouse ? (
                        <span className="text-muted-foreground">In-House</span>
                      ) : (
                        <Badge variant={row.funder_paid_parkview ? 'default' : 'destructive'}>
                          {row.funder_paid_parkview ? 'Received' : 'Pending'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
```

---

### Task 6: Create ISO Commissions Page

**Files:**
- Create: `src/app/dashboard/commissions/iso/page.tsx`

**Step 1: Create the page file**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { fetchISOCommissions } from '@/lib/queries'
import type { CommissionPayoutISO } from '@/types/database'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/queries'

export default function ISOCommissionsPage() {
  const [data, setData] = useState<CommissionPayoutISO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const commissions = await fetchISOCommissions()
        setData(commissions)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <>
        <SiteHeader title="ISO Commissions" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <SiteHeader title="ISO Commissions" />
        <div className="p-6 text-red-600">{error}</div>
      </>
    )
  }

  const pendingCount = data.filter(d => d.payment_status === 'Pending').length
  const paidCount = data.filter(d => d.payment_status === 'Paid').length
  const totalCommission = data.reduce((sum, d) => sum + (d.commission_amount || 0), 0)

  return (
    <>
      <SiteHeader title="ISO Commissions" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{paidCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal Name</TableHead>
                  <TableHead>ISO</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Funded Date</TableHead>
                  <TableHead className="text-right">Funded Amount</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Paid to ISO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.deal_name}</TableCell>
                    <TableCell>{row.iso_name}</TableCell>
                    <TableCell>{row.lender}</TableCell>
                    <TableCell>{row.funded_date}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.funded_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.commission_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.paid ? 'default' : 'secondary'}>
                        {row.paid ? 'Paid' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
```

---

### Task 7: Redirect Old Commissions Route

**Files:**
- Modify: `src/app/dashboard/commissions/page.tsx`

**Step 1: Replace with redirect to Reps**

```typescript
import { redirect } from 'next/navigation'

export default function CommissionsPage() {
  redirect('/dashboard/commissions/reps')
}
```

---

### Task 8: Verify and Commit

**Step 1: Test navigation**

- Open dashboard
- Verify Commissions expands
- Click Reps - should show 2,681 rep commissions
- Click ISO - should show 1,077 ISO commissions
- Verify old /dashboard/commissions redirects to /dashboard/commissions/reps

**Step 2: Commit changes**

```bash
git add .
git commit -m "feat: split Commissions into Reps and ISO views

- Add collapsible submenu in sidebar for Commissions
- Create /dashboard/commissions/reps reading from commission_payout_reps
- Create /dashboard/commissions/iso reading from commission_payout_iso
- Reps view includes 'Funder Paid Us' column for broker deals
- Redirect old /dashboard/commissions to /dashboard/commissions/reps
- Add RLS policies for commission tables

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | RLS policies | SQL only |
| 2 | Sidebar collapsible menu | app-sidebar.tsx |
| 3 | TypeScript types | database.ts |
| 4 | Query functions | queries.ts |
| 5 | Reps page | commissions/reps/page.tsx |
| 6 | ISO page | commissions/iso/page.tsx |
| 7 | Redirect old route | commissions/page.tsx |
| 8 | Test and commit | - |
