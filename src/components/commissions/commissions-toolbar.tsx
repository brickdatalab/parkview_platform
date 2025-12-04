'use client'

import { useState, useEffect } from 'react'
import { Search, X, Layers, Bookmark, ChevronDown, Plus, Trash2, RotateCcw, Columns3 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type {
  CommissionTableState,
  CommissionGroupByOption,
  CommissionColumnId,
  CommissionColumnFilter,
  CommissionSavedView,
} from '@/types/table'
import {
  COMMISSION_GROUP_BY_OPTIONS,
  COMMISSION_COLUMNS,
  DEFAULT_COMMISSION_VISIBLE_COLUMNS,
} from '@/types/table'
import {
  hasActiveCommissionFilters,
  getActiveCommissionFilterCount,
  resetToCommissionDefault,
  loadCommissionSavedViews,
  saveCommissionSavedViews,
  createCommissionSavedView,
  deleteCommissionSavedView,
} from '@/lib/commission-table-utils'

interface CommissionsToolbarProps {
  state: CommissionTableState
  onStateChange: (state: CommissionTableState) => void
  isLoading?: boolean
  uniqueReps?: string[]
  uniqueYears?: number[]
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export function CommissionsToolbar({
  state,
  onStateChange,
  isLoading,
  uniqueReps = [],
  uniqueYears = [],
}: CommissionsToolbarProps) {
  const activeFilterCount = getActiveCommissionFilterCount(state)
  const hasFilters = hasActiveCommissionFilters(state)

  // Saved views state
  const [views, setViews] = useState<CommissionSavedView[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')

  // Load saved views on mount
  useEffect(() => {
    setViews(loadCommissionSavedViews())
  }, [])

  const handleSearchChange = (value: string) => {
    onStateChange({
      ...state,
      searchQuery: value,
      currentPage: 1,
    })
  }

  const handleGroupByChange = (value: CommissionGroupByOption) => {
    onStateChange({
      ...state,
      groupBy: value,
      currentPage: 1,
    })
  }

  const handleRepChange = (value: string) => {
    onStateChange({
      ...state,
      selectedRep: value === 'all' ? null : value,
      currentPage: 1,
    })
  }

  const handleMonthChange = (value: string) => {
    onStateChange({
      ...state,
      selectedMonth: value === 'all' ? null : parseInt(value),
      currentPage: 1,
    })
  }

  const handleYearChange = (value: string) => {
    onStateChange({
      ...state,
      selectedYear: value === 'all' ? null : parseInt(value),
      currentPage: 1,
    })
  }

  const handleVisibilityChange = (columns: CommissionColumnId[]) => {
    onStateChange({
      ...state,
      visibleColumns: columns,
    })
  }

  const handleReset = () => {
    onStateChange(resetToCommissionDefault())
  }

  const handleClearFilters = () => {
    onStateChange({
      ...state,
      filters: [],
      dateRange: { startDate: null, endDate: null },
      searchQuery: '',
      selectedRep: null,
      selectedMonth: null,
      selectedYear: null,
      currentPage: 1,
    })
  }

  const handleRemoveFilter = (columnId: CommissionColumnId) => {
    onStateChange({
      ...state,
      filters: state.filters.filter(f => f.columnId !== columnId),
      currentPage: 1,
    })
  }

  const handleClearDateRange = () => {
    onStateChange({
      ...state,
      dateRange: { startDate: null, endDate: null },
      currentPage: 1,
    })
  }

  const handleSaveView = () => {
    if (!newViewName.trim()) return

    const newView = createCommissionSavedView(newViewName.trim(), state)
    const updatedViews = [...views, newView]
    setViews(updatedViews)
    saveCommissionSavedViews(updatedViews)

    setNewViewName('')
    setSaveDialogOpen(false)
  }

  const handleDeleteView = (viewId: string) => {
    const updatedViews = deleteCommissionSavedView(views, viewId)
    setViews(updatedViews)
    saveCommissionSavedViews(updatedViews)
  }

  const handleLoadView = (view: CommissionSavedView) => {
    onStateChange({
      ...view.state,
      currentPage: 1,
    })
  }

  // Get active filter chips
  const filterChips: { key: string; label: string; onRemove: () => void }[] = []

  // Add column filter chips
  state.filters.forEach(filter => {
    if (filter.selectedValues.length > 0) {
      const column = COMMISSION_COLUMNS.find(c => c.id === filter.columnId)
      if (column) {
        const label = filter.selectedValues.length === 1
          ? `${column.label}: ${filter.selectedValues[0]}`
          : `${column.label}: ${filter.selectedValues.length} selected`
        filterChips.push({
          key: `filter-${filter.columnId}`,
          label,
          onRemove: () => handleRemoveFilter(filter.columnId),
        })
      }
    }
  })

  // Add date range chip
  if (state.dateRange.startDate || state.dateRange.endDate) {
    let label = 'Date: '
    if (state.dateRange.startDate && state.dateRange.endDate) {
      label += `${state.dateRange.startDate} - ${state.dateRange.endDate}`
    } else if (state.dateRange.startDate) {
      label += `From ${state.dateRange.startDate}`
    } else {
      label += `Until ${state.dateRange.endDate}`
    }
    filterChips.push({
      key: 'date-range',
      label,
      onRemove: handleClearDateRange,
    })
  }

  // Add search chip
  if (state.searchQuery.trim()) {
    filterChips.push({
      key: 'search',
      label: `Search: "${state.searchQuery}"`,
      onRemove: () => handleSearchChange(''),
    })
  }

  // Add rep filter chip
  if (state.selectedRep) {
    filterChips.push({
      key: 'rep-filter',
      label: `Rep: ${state.selectedRep}`,
      onRemove: () => handleRepChange('all'),
    })
  }

  // Add month filter chip
  if (state.selectedMonth) {
    const monthLabel = MONTHS.find(m => m.value === state.selectedMonth)?.label || ''
    filterChips.push({
      key: 'month-filter',
      label: `Month: ${monthLabel}`,
      onRemove: () => handleMonthChange('all'),
    })
  }

  // Add year filter chip
  if (state.selectedYear) {
    filterChips.push({
      key: 'year-filter',
      label: `Year: ${state.selectedYear}`,
      onRemove: () => handleYearChange('all'),
    })
  }

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search commissions..."
            value={state.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 pl-9 bg-white"
            disabled={isLoading}
          />
          {state.searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Rep Filter */}
        <Select
          value={state.selectedRep ?? 'all'}
          onValueChange={handleRepChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[160px] h-8 bg-white">
            <SelectValue placeholder="All Reps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reps</SelectItem>
            {uniqueReps.map((rep) => (
              <SelectItem key={rep} value={rep}>
                {rep}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month Filter */}
        <Select
          value={state.selectedMonth?.toString() ?? 'all'}
          onValueChange={handleMonthChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[130px] h-8 bg-white">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year Filter */}
        <Select
          value={state.selectedYear?.toString() ?? 'all'}
          onValueChange={handleYearChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[100px] h-8 bg-white">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {uniqueYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Group By */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Select
            value={state.groupBy}
            onValueChange={(value) => handleGroupByChange(value as CommissionGroupByOption)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[160px] h-8 bg-white">
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              {COMMISSION_GROUP_BY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Clear Filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}

          {/* Column Visibility */}
          <CommissionColumnVisibility
            visibleColumns={state.visibleColumns}
            onVisibilityChange={handleVisibilityChange}
          />

          {/* Saved Views */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white">
                <Bookmark className="h-4 w-4" />
                Views
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {views.length > 0 ? (
                <>
                  {views.map((view) => (
                    <DropdownMenuItem
                      key={view.id}
                      className="flex items-center justify-between pr-1"
                    >
                      <button
                        className="flex-1 text-left truncate"
                        onClick={() => handleLoadView(view)}
                      >
                        {view.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteView(view.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No saved views yet
                </div>
              )}

              <DropdownMenuItem
                onClick={() => setSaveDialogOpen(true)}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Save Current View
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save View Dialog */}
          <Popover open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <PopoverTrigger asChild>
              <span className="hidden" />
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm">Save Current View</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Save your current filters, sorting, and column settings
                  </p>
                </div>

                <Input
                  placeholder="Enter view name..."
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveView()
                  }}
                  className="h-8"
                  autoFocus
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSaveDialogOpen(false)
                      setNewViewName('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleSaveView}
                    disabled={!newViewName.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active filters row */}
      {filterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filterChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              {chip.label}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-muted-foreground/20"
                onClick={chip.onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// Column visibility component for commissions
function CommissionColumnVisibility({
  visibleColumns,
  onVisibilityChange,
}: {
  visibleColumns: CommissionColumnId[]
  onVisibilityChange: (columns: CommissionColumnId[]) => void
}) {
  const [open, setOpen] = useState(false)

  const handleToggle = (columnId: CommissionColumnId) => {
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
    onVisibilityChange(COMMISSION_COLUMNS.map(c => c.id))
  }

  const handleResetToDefault = () => {
    onVisibilityChange([...DEFAULT_COMMISSION_VISIBLE_COLUMNS])
  }

  const visibleCount = visibleColumns.length
  const totalCount = COMMISSION_COLUMNS.length

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
            {COMMISSION_COLUMNS.map((column) => (
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
