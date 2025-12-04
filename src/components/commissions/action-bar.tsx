'use client'

import { Button } from '@/components/ui/button'
import type { PaymentStatus } from '@/types/database'

interface ActionBarProps {
  selectedCount: number
  totalCount: number
  allSelected: boolean
  onSelectAll: () => void
  onMarkPaid: () => void
  onMarkClawback: () => void
}

export function ActionBar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onMarkPaid,
  onMarkClawback,
}: ActionBarProps) {
  const hasSelection = selectedCount > 0

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-2 dark:bg-zinc-950">
      <div className="flex items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected && totalCount > 0}
            onChange={onSelectAll}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:focus:ring-zinc-50"
          />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Select All
          </span>
        </label>
        {hasSelection && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {selectedCount} of {totalCount} selected
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasSelection}
          onClick={onMarkPaid}
          className="text-green-700 hover:bg-green-50 hover:text-green-800 disabled:opacity-50"
        >
          <CheckIcon className="mr-1.5 h-4 w-4" />
          Mark Paid
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasSelection}
          onClick={onMarkClawback}
          className="text-red-700 hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
        >
          <AlertIcon className="mr-1.5 h-4 w-4" />
          Mark Clawback
        </Button>
      </div>
    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}
