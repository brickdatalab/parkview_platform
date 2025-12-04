'use client'

import { useState, useMemo } from 'react'
import { Filter, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { ColumnId, ColumnFilter } from '@/types/table'

interface FilterDropdownProps {
  columnId: ColumnId
  label: string
  options: string[]
  selectedValues: string[]
  onFilterChange: (filter: ColumnFilter) => void
}

export function FilterDropdown({
  columnId,
  label,
  options,
  selectedValues,
  onFilterChange,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const query = searchQuery.toLowerCase()
    return options.filter(opt => opt.toLowerCase().includes(query))
  }, [options, searchQuery])

  const handleToggle = (value: string) => {
    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]

    onFilterChange({
      columnId,
      selectedValues: newSelected,
    })
  }

  const handleSelectAll = () => {
    onFilterChange({
      columnId,
      selectedValues: [...options],
    })
  }

  const handleClearAll = () => {
    onFilterChange({
      columnId,
      selectedValues: [],
    })
  }

  const activeCount = selectedValues.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={`h-6 w-6 ${activeCount > 0 ? 'text-primary' : 'text-muted-foreground opacity-50 hover:opacity-100'}`}
        >
          <Filter className="h-3 w-3" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="border-b p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Filter by {label}</span>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleClearAll}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          {options.length > 10 && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-sm"
              />
            </div>
          )}
        </div>

        <div className="max-h-[250px] overflow-y-auto p-2">
          {filteredOptions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No options found
            </p>
          ) : (
            <div className="space-y-1">
              {filteredOptions.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedValues.includes(option)}
                    onCheckedChange={() => handleToggle(option)}
                  />
                  <span className="truncate">{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {options.length > 0 && (
          <div className="border-t p-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleSelectAll}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface DateRangeFilterProps {
  startDate: string | null
  endDate: string | null
  onDateRangeChange: (start: string | null, end: string | null) => void
}

export function DateRangeFilter({
  startDate,
  endDate,
  onDateRangeChange,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [localStart, setLocalStart] = useState(startDate || '')
  const [localEnd, setLocalEnd] = useState(endDate || '')

  const hasRange = startDate || endDate

  const handleApply = () => {
    onDateRangeChange(
      localStart || null,
      localEnd || null
    )
    setOpen(false)
  }

  const handleClear = () => {
    setLocalStart('')
    setLocalEnd('')
    onDateRangeChange(null, null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={`h-6 w-6 ${hasRange ? 'text-primary' : 'text-muted-foreground opacity-50 hover:opacity-100'}`}
        >
          <Filter className="h-3 w-3" />
          {hasRange && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              1
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Date Range</span>
            {hasRange && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleClear}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Button
            size="sm"
            className="w-full"
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
