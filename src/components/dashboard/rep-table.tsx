'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { RepSummary } from '@/types/database'
import { formatCurrency, formatFactorRate, formatNumber } from '@/lib/queries'

interface RepTableProps {
  data: RepSummary[]
  isLoading?: boolean
}

type SortField = 'rep' | 'total_funded' | 'total_commission' | 'deal_count' | 'avg_factor' | 'total_psf' | 'total_rev'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

function SortableHeader({
  field,
  label,
  sortConfig,
  onSort,
  align = 'left'
}: {
  field: SortField
  label: string
  sortConfig: SortConfig
  onSort: (field: SortField) => void
  align?: 'left' | 'right'
}) {
  const isActive = sortConfig.field === field

  return (
    <TableHead
      className={`cursor-pointer select-none transition-colors hover:bg-muted/50 ${
        align === 'right' ? 'text-right' : ''
      }`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {isActive ? (
          sortConfig.direction === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  )
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="ml-auto h-4 w-14 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="ml-auto h-4 w-18 animate-pulse rounded bg-muted" /></TableCell>
    </TableRow>
  )
}

export function RepTable({ data, isLoading }: RepTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'total_funded',
    direction: 'desc'
  })

  const handleSort = (field: SortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue: string | number = a[sortConfig.field]
      let bValue: string | number = b[sortConfig.field]

      // Handle string comparison for rep names
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      // Handle numeric comparison
      aValue = aValue ?? 0
      bValue = bValue ?? 0

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    return sorted
  }, [data, sortConfig])

  // Calculate totals for footer
  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        total_funded: acc.total_funded + row.total_funded,
        total_commission: acc.total_commission + row.total_commission,
        deal_count: acc.deal_count + row.deal_count,
        total_psf: acc.total_psf + row.total_psf,
        total_rev: acc.total_rev + row.total_rev,
        avg_factor_sum: acc.avg_factor_sum + (row.avg_factor * row.deal_count),
        factor_count: acc.factor_count + row.deal_count
      }),
      { total_funded: 0, total_commission: 0, deal_count: 0, total_psf: 0, total_rev: 0, avg_factor_sum: 0, factor_count: 0 }
    )
  }, [data])

  const avgFactorTotal = totals.factor_count > 0 ? totals.avg_factor_sum / totals.factor_count : 0

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Rep Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <SortableHeader
                field="rep"
                label="Rep"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableHeader
                field="total_funded"
                label="Total Funded"
                sortConfig={sortConfig}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                field="total_commission"
                label="Commission"
                sortConfig={sortConfig}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                field="deal_count"
                label="Deals"
                sortConfig={sortConfig}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                field="avg_factor"
                label="Avg Factor"
                sortConfig={sortConfig}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                field="total_psf"
                label="PSF"
                sortConfig={sortConfig}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                field="total_rev"
                label="Total Rev"
                sortConfig={sortConfig}
                onSort={handleSort}
                align="right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No data found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {sortedData.map((row, index) => (
                  <TableRow
                    key={row.rep}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                  >
                    <TableCell className="font-medium">{row.rep}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.total_funded)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.total_commission)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(row.deal_count)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatFactorRate(row.avg_factor)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.total_psf)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.total_rev)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="border-t-2 bg-muted/40 font-semibold">
                  <TableCell>Total ({sortedData.length} reps)</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totals.total_funded)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totals.total_commission)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(totals.deal_count)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatFactorRate(avgFactorTotal)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totals.total_psf)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totals.total_rev)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
