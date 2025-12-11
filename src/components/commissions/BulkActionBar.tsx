'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle, AlertTriangle, X } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  onMarkAsPaid: () => void
  onMarkAsClawback: () => void
  onClear: () => void
  isLoading?: boolean
}

export function BulkActionBar({
  selectedCount,
  onMarkAsPaid,
  onMarkAsClawback,
  onClear,
  isLoading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} selected
        </span>

        <div className="h-4 w-px bg-gray-200" />

        <Button
          size="sm"
          variant="default"
          onClick={onMarkAsPaid}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-1.5" />
          Mark as Paid
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={onMarkAsClawback}
          disabled={isLoading}
        >
          <AlertTriangle className="h-4 w-4 mr-1.5" />
          Mark as Clawback
        </Button>

        <div className="h-4 w-px bg-gray-200" />

        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-1.5" />
          Clear
        </Button>
      </div>
    </div>
  )
}
