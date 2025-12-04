'use client'

import { useState } from 'react'
import { Columns3, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ALL_COLUMNS, DEFAULT_VISIBLE_COLUMNS, type ColumnId } from '@/types/table'

interface ColumnVisibilityProps {
  visibleColumns: ColumnId[]
  onVisibilityChange: (columns: ColumnId[]) => void
}

export function ColumnVisibility({
  visibleColumns,
  onVisibilityChange,
}: ColumnVisibilityProps) {
  const [open, setOpen] = useState(false)

  const handleToggle = (columnId: ColumnId) => {
    if (visibleColumns.includes(columnId)) {
      // Don't allow hiding all columns
      if (visibleColumns.length > 1) {
        onVisibilityChange(visibleColumns.filter(c => c !== columnId))
      }
    } else {
      onVisibilityChange([...visibleColumns, columnId])
    }
  }

  const handleShowAll = () => {
    onVisibilityChange(ALL_COLUMNS.map(c => c.id))
  }

  const handleResetToDefault = () => {
    onVisibilityChange([...DEFAULT_VISIBLE_COLUMNS])
  }

  const visibleCount = visibleColumns.length
  const totalCount = ALL_COLUMNS.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white">
          <Columns3 className="h-4 w-4" />
          Columns
          <span className="rounded bg-muted px-1.5 text-xs font-medium">
            {visibleCount}/{totalCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <div className="border-b p-3">
          <span className="text-sm font-medium">Toggle Columns</span>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2">
          <div className="space-y-1">
            {ALL_COLUMNS.map((column) => (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={() => handleToggle(column.id)}
                  disabled={visibleColumns.length === 1 && visibleColumns.includes(column.id)}
                />
                <span className="truncate">{column.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t p-2 space-y-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleShowAll}
          >
            Show All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleResetToDefault}
          >
            Reset to Default
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
