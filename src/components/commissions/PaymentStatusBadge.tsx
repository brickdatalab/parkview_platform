'use client'

import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentStatusBadgeProps {
  paid: boolean | null
  onToggle?: () => void
  isLoading?: boolean
  disabled?: boolean
}

export function PaymentStatusBadge({
  paid,
  onToggle,
  isLoading = false,
  disabled = false,
}: PaymentStatusBadgeProps) {
  const isPaid = paid === true

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!disabled && !isLoading && onToggle) {
      onToggle()
    }
  }

  return (
    <Badge
      variant={isPaid ? 'default' : 'secondary'}
      onClick={handleClick}
      className={cn(
        'transition-all',
        isPaid
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        onToggle && !disabled && 'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isPaid ? (
        'Paid'
      ) : (
        'Pending'
      )}
    </Badge>
  )
}
