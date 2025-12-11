'use client'

import { Search, X, Layers } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ColumnVisibility } from './column-visibility'
import { SavedViews } from './saved-views'
import { QuickFilters } from './quick-filters'
import type { TableState, GroupByOption, ColumnId, ColumnFilter, QuickFilters as QuickFiltersType } from '@/types/table'
import { GROUP_BY_OPTIONS, ALL_COLUMNS, DEFAULT_QUICK_FILTERS } from '@/types/table'
import { hasActiveFilters, getActiveFilterCount, resetToDefault } from '@/lib/table-utils'

interface TableToolbarProps {
  state: TableState
  onStateChange: (state: TableState) => void
  isLoading?: boolean
}

export function TableToolbar({
  state,
  onStateChange,
  isLoading,
}: TableToolbarProps) {
  const activeFilterCount = getActiveFilterCount(state)
  const hasFilters = hasActiveFilters(state)

  const handleSearchChange = (value: string) => {
    onStateChange({
      ...state,
      searchQuery: value,
      currentPage: 1,
    })
  }

  const handleGroupByChange = (value: GroupByOption) => {
    onStateChange({
      ...state,
      groupBy: value,
      currentPage: 1,
    })
  }

  const handleVisibilityChange = (columns: ColumnId[]) => {
    onStateChange({
      ...state,
      visibleColumns: columns,
    })
  }

  const handleLoadView = (viewState: TableState) => {
    onStateChange({
      ...viewState,
      currentPage: 1,
    })
  }

  const handleReset = () => {
    onStateChange(resetToDefault())
  }

  const handleClearFilters = () => {
    onStateChange({
      ...state,
      filters: [],
      dateRange: { startDate: null, endDate: null },
      searchQuery: '',
      quickFilters: DEFAULT_QUICK_FILTERS,
      currentPage: 1,
    })
  }

  const handleQuickFiltersChange = (quickFilters: QuickFiltersType) => {
    onStateChange({
      ...state,
      quickFilters,
      currentPage: 1,
    })
  }

  const handleRemoveFilter = (columnId: ColumnId) => {
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

  // Get active filter chips
  const filterChips: { key: string; label: string; onRemove: () => void }[] = []

  // Add column filter chips
  state.filters.forEach(filter => {
    if (filter.selectedValues.length > 0) {
      const column = ALL_COLUMNS.find(c => c.id === filter.columnId)
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

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={state.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 pl-9 bg-white"
            disabled={isLoading}
          />
          {state.searchQuery && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Group By */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Select
            value={state.groupBy}
            onValueChange={(value) => handleGroupByChange(value as GroupByOption)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[180px] h-8 bg-white">
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Filters */}
        <div className="flex-1 flex justify-center">
          <QuickFilters
            filters={state.quickFilters || DEFAULT_QUICK_FILTERS}
            onChange={handleQuickFiltersChange}
          />
        </div>

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
          <ColumnVisibility
            visibleColumns={state.visibleColumns}
            onVisibilityChange={handleVisibilityChange}
          />

          {/* Saved Views */}
          <SavedViews
            currentState={state}
            onLoadView={handleLoadView}
            onReset={handleReset}
          />
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
                size="icon-sm"
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
