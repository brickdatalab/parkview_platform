'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from './status-badge'
import type { DealWithPayment, PaymentStatus } from '@/types/database'
import { cn } from '@/lib/utils'

interface DealsTableProps {
  deals: DealWithPayment[]
  selectedIds: Set<string>
  onSelectId: (id: string) => void
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'

  // Handle both ISO and MM/DD/YYYY formats
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    // Try parsing as MM/DD/YYYY
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      return dateStr
    }
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function DealsTable({ deals, selectedIds, onSelectId }: DealsTableProps) {
  if (deals.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
        No deals found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-zinc-50 dark:bg-zinc-900">
          <TableHead className="w-12"></TableHead>
          <TableHead>Deal Name</TableHead>
          <TableHead>Rep</TableHead>
          <TableHead>Lender</TableHead>
          <TableHead>Funded Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Commission</TableHead>
          <TableHead>Deal ID</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deals.map((deal) => {
          const isSelected = selectedIds.has(deal.id)
          return (
            <TableRow
              key={deal.id}
              data-state={isSelected ? 'selected' : undefined}
              className={cn(
                'cursor-pointer transition-colors',
                isSelected && 'bg-zinc-100 dark:bg-zinc-800'
              )}
              onClick={() => onSelectId(deal.id)}
            >
              <TableCell>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectId(deal.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:focus:ring-zinc-50"
                />
              </TableCell>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.deal_name || '-'}
              </TableCell>
              <TableCell className="text-zinc-600 dark:text-zinc-400">
                {deal.rep || '-'}
              </TableCell>
              <TableCell className="text-zinc-600 dark:text-zinc-400">
                {deal.lender || '-'}
              </TableCell>
              <TableCell className="text-zinc-600 dark:text-zinc-400">
                {formatDate(deal.funded_date)}
              </TableCell>
              <TableCell className="text-right font-mono text-zinc-900 dark:text-zinc-50">
                {formatCurrency(deal.funded_amount)}
              </TableCell>
              <TableCell className="text-right font-mono text-zinc-900 dark:text-zinc-50">
                {formatCurrency(deal.rep_commission)}
              </TableCell>
              <TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {deal.sdeal_id || '-'}
              </TableCell>
              <TableCell className="text-center">
                <StatusBadge status={deal.payment_status} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
