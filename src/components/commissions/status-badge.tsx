'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PaymentStatus } from '@/types/database'

interface StatusBadgeProps {
  status: PaymentStatus
}

const statusStyles: Record<PaymentStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100',
  Paid: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  Clawback: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(statusStyles[status])}>
      {status}
    </Badge>
  )
}
