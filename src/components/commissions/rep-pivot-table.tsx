'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DealWithPayment } from '@/types/database'

interface RepPivotTableProps {
  deals: DealWithPayment[]
  repName: string
}

interface MonthSummary {
  monthYear: string
  monthLabel: string
  dealCount: number
  totalFunded: number
  totalCommission: number
  totalRepCommission: number
  avgFactorRate: number
}

/**
 * Parse date string (MM/DD/YYYY or ISO) to Date object
 */
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null

  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [month, day, year] = parts
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  return new Date(dateStr)
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format factor rate (e.g., 1.35)
 */
function formatFactorRate(value: number): string {
  return value.toFixed(2)
}

export function RepPivotTable({ deals, repName }: RepPivotTableProps) {
  const monthSummaries = useMemo(() => {
    // Group deals by month/year
    const groups = new Map<string, DealWithPayment[]>()

    for (const deal of deals) {
      const date = parseDate(deal.funded_date)
      if (!date) continue

      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const key = `${year}-${String(month).padStart(2, '0')}`

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(deal)
    }

    // Convert to summaries
    const summaries: MonthSummary[] = Array.from(groups.entries()).map(([key, groupDeals]) => {
      const [year, month] = key.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      const totalFunded = groupDeals.reduce((sum, d) => sum + (d.funded_amount ?? 0), 0)
      const totalCommission = groupDeals.reduce((sum, d) => sum + (d.commission ?? 0), 0)
      const totalRepCommission = groupDeals.reduce((sum, d) => sum + (d.rep_commission ?? 0), 0)

      const factorRates = groupDeals
        .map(d => d.factor_rate)
        .filter((rate): rate is number => rate != null && rate > 0)
      const avgFactorRate = factorRates.length > 0
        ? factorRates.reduce((a, b) => a + b, 0) / factorRates.length
        : 0

      return {
        monthYear: key,
        monthLabel,
        dealCount: groupDeals.length,
        totalFunded,
        totalCommission,
        totalRepCommission,
        avgFactorRate,
      }
    })

    // Sort by month/year descending (most recent first)
    summaries.sort((a, b) => b.monthYear.localeCompare(a.monthYear))

    return summaries
  }, [deals])

  // Calculate totals
  const totals = useMemo(() => {
    return {
      dealCount: monthSummaries.reduce((sum, s) => sum + s.dealCount, 0),
      totalFunded: monthSummaries.reduce((sum, s) => sum + s.totalFunded, 0),
      totalCommission: monthSummaries.reduce((sum, s) => sum + s.totalCommission, 0),
      totalRepCommission: monthSummaries.reduce((sum, s) => sum + s.totalRepCommission, 0),
      avgFactorRate: monthSummaries.length > 0
        ? monthSummaries.reduce((sum, s) => sum + s.avgFactorRate, 0) / monthSummaries.length
        : 0,
    }
  }, [monthSummaries])

  if (monthSummaries.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {repName} - Monthly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No deals found for this rep.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {repName} - Monthly Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Month/Year</TableHead>
                <TableHead className="text-right font-semibold"># of Deals</TableHead>
                <TableHead className="text-right font-semibold">Total Funded</TableHead>
                <TableHead className="text-right font-semibold">Total Commission</TableHead>
                <TableHead className="text-right font-semibold">Rep Commission</TableHead>
                <TableHead className="text-right font-semibold">Avg Factor Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthSummaries.map((summary, index) => (
                <TableRow
                  key={summary.monthYear}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                >
                  <TableCell className="font-medium">{summary.monthLabel}</TableCell>
                  <TableCell className="text-right font-mono">{summary.dealCount}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(summary.totalFunded)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(summary.totalCommission)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(summary.totalRepCommission)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {summary.avgFactorRate > 0 ? formatFactorRate(summary.avgFactorRate) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/70 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono">{totals.dealCount}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totals.totalFunded)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totals.totalCommission)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totals.totalRepCommission)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {totals.avgFactorRate > 0 ? formatFactorRate(totals.avgFactorRate) : '-'}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
