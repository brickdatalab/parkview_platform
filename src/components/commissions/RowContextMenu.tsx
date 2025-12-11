'use client'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface RowContextMenuProps {
  children: React.ReactNode
  isPaid: boolean
  onMarkAsPaid: () => void
  onMarkAsUnpaid: () => void
  onMarkAsClawback: () => void
  disabled?: boolean
}

export function RowContextMenu({
  children,
  isPaid,
  onMarkAsPaid,
  onMarkAsUnpaid,
  onMarkAsClawback,
  disabled = false,
}: RowContextMenuProps) {
  if (disabled) {
    return <>{children}</>
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {!isPaid ? (
          <ContextMenuItem onClick={onMarkAsPaid}>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Mark as Paid
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onClick={onMarkAsUnpaid}>
            <XCircle className="h-4 w-4 mr-2 text-gray-600" />
            Mark as Unpaid
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onMarkAsClawback}
          className="text-red-600 focus:text-red-600"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Mark as Clawback
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
