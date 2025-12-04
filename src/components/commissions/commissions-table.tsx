'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Filter,
  X,
  Search
} from 'lucide-react'
import { StatusBadge } from './status-badge'
import { CommissionsToolbar } from './commissions-toolbar'
import { RepPivotTable } from './rep-pivot-table'
import { cn } from '@/lib/utils'
import type { DealWithPayment, PaymentStatus } from '@/types/database'
import type {
  CommissionTableState,
  CommissionColumnId,
  CommissionColumnFilter,
  CommissionSortConfig,
  CommissionGroupedData,
  CommissionColumnDef
} from '@/types/table'
import {
  COMMISSION_COLUMNS,
  DEFAULT_COMMISSION_TABLE_STATE,
  PAGE_SIZE_OPTIONS
} from '@/types/table'
import {
  filterCommissionDeals,
  sortCommissionDeals,
  groupCommissionDeals,
  paginateCommissionData,
  getCommissionTotalPages,
  formatCommissionCellValue,
  formatCurrency,
  getUniqueCommissionColumnValues,
  toggleCommissionColumnSort,
  getCommissionSortIndicator,
} from '@/lib/commission-table-utils'

interface CommissionsTableProps {
  data: DealWithPayment[]
  totalCount: number
  isLoading?: boolean
  selectedIds: Set<string>
  onSelectId: (id: string) => void
  onSelectAll: () => void
}

interface SortableHeaderProps {
  column: CommissionColumnDef
  sortConfigs: CommissionSortConfig[]
  onSort: (columnId: CommissionColumnId) => void
  filterOptions: string[]
  activeFilter: CommissionColumnFilter | undefined
  onFilterChange: (filter: CommissionColumnFilter) => void
  dateRange?: { startDate: string | null; endDate: string | null }
  onDateRangeChange?: (start: string | null, end: string | null) => void
}

function SortableHeader({
  column,
  sortConfigs,
  onSort,
  filterOptions,
  activeFilter,
  onFilterChange,
  dateRange,
  onDateRangeChange,
}: SortableHeaderProps) {
  const { priority, direction } = getCommissionSortIndicator(sortConfigs, column.id)
  const isActive = direction !== null

  const alignClass = column.align === 'right'
    ? 'text-right justify-end'
    : column.align === 'center'
      ? 'text-center justify-center'
      : ''

  return (
    <TableHead className={`select-none ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}>
      <div className={`flex items-center gap-1 ${alignClass}`}>
        {/* Filter button */}
        {column.filterable && column.id === 'funded_date' && dateRange && onDateRangeChange ? (
          <DateRangeFilter
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateRangeChange={onDateRangeChange}
          />
        ) : column.filterable && filterOptions.length > 0 ? (
          <FilterDropdown
            columnId={column.id}
            label={column.label}
            options={filterOptions}
            selectedValues={activeFilter?.selectedValues || []}
            onFilterChange={onFilterChange}
          />
        ) : null}

        {/* Sort button */}
        {column.sortable ? (
          <button
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            onClick={() => onSort(column.id)}
          >
            {column.label}
            {isActive ? (
              <span className="flex items-center text-primary">
                {priority !== null && sortConfigs.length > 1 && (
                  <span className="text-[10px] mr-0.5">{priority}</span>
                )}
                {direction === 'asc' ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
              </span>
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
            )}
          </button>
        ) : (
          <span>{column.label}</span>
        )}
      </div>
    </TableHead>
  )
}

function FilterDropdown({
  columnId,
  label,
  options,
  selectedValues,
  onFilterChange,
}: {
  columnId: CommissionColumnId
  label: string
  options: string[]
  selectedValues: string[]
  onFilterChange: (filter: CommissionColumnFilter) => void
}) {
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
          size="icon"
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

function DateRangeFilter({
  startDate,
  endDate,
  onDateRangeChange,
}: {
  startDate: string | null
  endDate: string | null
  onDateRangeChange: (start: string | null, end: string | null) => void
}) {
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
          size="icon"
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

function SkeletonRow({ columnCount }: { columnCount: number }) {
  return (
    <TableRow>
      <TableCell className="w-12">
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
      </TableCell>
      {Array.from({ length: columnCount }).map((_, i) => (
        <TableCell key={i}>
          <div className={`h-4 w-20 animate-pulse rounded bg-muted ${i > 3 ? 'ml-auto' : ''}`} />
        </TableCell>
      ))}
    </TableRow>
  )
}

function GroupHeader({
  group,
  visibleColumns,
  isExpanded,
  onToggle,
  allSelected,
  someSelected,
  onSelectGroup,
}: {
  group: CommissionGroupedData
  visibleColumns: CommissionColumnId[]
  isExpanded: boolean
  onToggle: () => void
  allSelected: boolean
  someSelected: boolean
  onSelectGroup: () => void
}) {
  return (
    <TableRow className="bg-muted/50 hover:bg-muted/70">
      <TableCell colSpan={visibleColumns.length + 1} className="py-2">
        <div className="flex items-center gap-2 w-full">
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) {
                const checkbox = el as unknown as { indeterminate: boolean }
                checkbox.indeterminate = someSelected && !allSelected
              }
            }}
            onCheckedChange={onSelectGroup}
          />
          <button
            className="flex items-center gap-2 flex-1 text-left font-medium"
            onClick={onToggle}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
            <span>{group.groupLabel}</span>
            <span className="text-muted-foreground font-normal">
              ({group.totals.count} deal{group.totals.count !== 1 ? 's' : ''})
            </span>
            <span className="ml-auto flex items-center gap-4 text-sm font-normal text-muted-foreground">
              <span>Funded: {formatCurrency(group.totals.totalFunded)}</span>
              <span>Commission: {formatCurrency(group.totals.totalRepCommission)}</span>
              <span className="text-amber-600">Pending: {group.totals.pendingCount}</span>
              <span className="text-green-600">Paid: {group.totals.paidCount}</span>
              {group.totals.clawbackCount > 0 && (
                <span className="text-red-600">Clawback: {group.totals.clawbackCount}</span>
              )}
            </span>
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function CommissionsTable({
  data,
  totalCount,
  isLoading,
  selectedIds,
  onSelectId,
  onSelectAll
}: CommissionsTableProps) {
  // Table state
  const [tableState, setTableState] = useState<CommissionTableState>(() => ({
    ...DEFAULT_COMMISSION_TABLE_STATE,
  }))

  // Expanded groups for grouped view
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Get visible columns (always include checkbox column, which we handle separately)
  const visibleColumnDefs = useMemo(() => {
    return COMMISSION_COLUMNS.filter(c => tableState.visibleColumns.includes(c.id))
  }, [tableState.visibleColumns])

  // Get unique values for each filterable column
  const filterOptions = useMemo(() => {
    const options: Record<CommissionColumnId, string[]> = {} as Record<CommissionColumnId, string[]>
    COMMISSION_COLUMNS.forEach(col => {
      if (col.filterable) {
        options[col.id] = getUniqueCommissionColumnValues(data, col.id)
      }
    })
    return options
  }, [data])

  // Get unique reps for dropdown
  const uniqueReps = useMemo(() => {
    const reps = new Set<string>()
    data.forEach(deal => {
      if (deal.rep && deal.rep.trim()) {
        reps.add(deal.rep)
      }
    })
    return Array.from(reps).sort()
  }, [data])

  // Get unique years for dropdown
  const uniqueYears = useMemo(() => {
    const years = new Set<number>()
    data.forEach(deal => {
      if (deal.funded_date) {
        // Parse MM/DD/YYYY or ISO format
        const parts = deal.funded_date.split('/')
        if (parts.length === 3) {
          years.add(parseInt(parts[2]))
        } else {
          const date = new Date(deal.funded_date)
          if (!isNaN(date.getTime())) {
            years.add(date.getFullYear())
          }
        }
      }
    })
    return Array.from(years).sort((a, b) => b - a) // Most recent first
  }, [data])

  // Filter -> Sort -> Group pipeline
  const processedData = useMemo(() => {
    if (data.length === 0) return { groups: [], flatData: [] }

    // Step 1: Filter
    const filtered = filterCommissionDeals(data, tableState)

    // Step 2: Sort
    const sorted = sortCommissionDeals(filtered, tableState.sortConfigs)

    // Step 3: Group
    const groups = groupCommissionDeals(sorted, tableState.groupBy, expandedGroups)

    return { groups, flatData: sorted }
  }, [data, tableState, expandedGroups])

  // Get deals for the selected rep (for pivot table)
  // We use the filtered data but without the rep filter to get all the rep's deals
  // that match the month/year filters
  const repDealsForPivot = useMemo(() => {
    if (!tableState.selectedRep) return []
    // Filter by rep only (plus month/year if set)
    return data.filter(deal => {
      if (deal.rep !== tableState.selectedRep) return false

      if (tableState.selectedMonth !== null && deal.funded_date) {
        const parts = deal.funded_date.split('/')
        if (parts.length === 3) {
          const month = parseInt(parts[0])
          if (month !== tableState.selectedMonth) return false
        } else {
          const date = new Date(deal.funded_date)
          if (!isNaN(date.getTime()) && date.getMonth() + 1 !== tableState.selectedMonth) return false
        }
      }

      if (tableState.selectedYear !== null && deal.funded_date) {
        const parts = deal.funded_date.split('/')
        if (parts.length === 3) {
          const year = parseInt(parts[2])
          if (year !== tableState.selectedYear) return false
        } else {
          const date = new Date(deal.funded_date)
          if (!isNaN(date.getTime()) && date.getFullYear() !== tableState.selectedYear) return false
        }
      }

      return true
    })
  }, [data, tableState.selectedRep, tableState.selectedMonth, tableState.selectedYear])

  // Calculate pagination based on flat data (ungrouped)
  const totalPages = getCommissionTotalPages(processedData.flatData.length, tableState.pageSize)
  const paginatedFlatData = paginateCommissionData(processedData.flatData, tableState.pageSize, tableState.currentPage)

  // For grouped view, we paginate the groups differently
  const displayGroups = useMemo(() => {
    if (tableState.groupBy === 'none') {
      // No grouping - show flat paginated data
      return [{
        groupKey: 'all',
        groupLabel: 'All Deals',
        deals: paginatedFlatData,
        totals: processedData.groups[0]?.totals || {
          count: 0,
          totalFunded: 0,
          totalRepCommission: 0,
          pendingCount: 0,
          paidCount: 0,
          clawbackCount: 0,
        },
        isExpanded: true,
      }]
    }

    // With grouping - show all groups but paginate within each
    return processedData.groups.map(group => ({
      ...group,
      isExpanded: expandedGroups.has(group.groupKey),
    }))
  }, [tableState.groupBy, tableState.pageSize, tableState.currentPage, processedData.groups, paginatedFlatData, expandedGroups])

  // Handlers
  const handleStateChange = useCallback((newState: CommissionTableState) => {
    setTableState(newState)
  }, [])

  const handleSort = useCallback((columnId: CommissionColumnId) => {
    setTableState(prev => ({
      ...prev,
      sortConfigs: toggleCommissionColumnSort(prev.sortConfigs, columnId),
      currentPage: 1,
    }))
  }, [])

  const handleFilterChange = useCallback((filter: CommissionColumnFilter) => {
    setTableState(prev => {
      const existingIndex = prev.filters.findIndex(f => f.columnId === filter.columnId)
      let newFilters: CommissionColumnFilter[]

      if (filter.selectedValues.length === 0) {
        // Remove filter if no values selected
        newFilters = prev.filters.filter(f => f.columnId !== filter.columnId)
      } else if (existingIndex >= 0) {
        // Update existing filter
        newFilters = [...prev.filters]
        newFilters[existingIndex] = filter
      } else {
        // Add new filter
        newFilters = [...prev.filters, filter]
      }

      return {
        ...prev,
        filters: newFilters,
        currentPage: 1,
      }
    })
  }, [])

  const handleDateRangeChange = useCallback((startDate: string | null, endDate: string | null) => {
    setTableState(prev => ({
      ...prev,
      dateRange: { startDate, endDate },
      currentPage: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setTableState(prev => ({
      ...prev,
      currentPage: page,
    }))
  }, [])

  const handlePageSizeChange = useCallback((size: string) => {
    setTableState(prev => ({
      ...prev,
      pageSize: parseInt(size),
      currentPage: 1,
    }))
  }, [])

  const handleToggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }, [])

  const handleExpandAll = useCallback(() => {
    setExpandedGroups(new Set(processedData.groups.map(g => g.groupKey)))
  }, [processedData.groups])

  const handleCollapseAll = useCallback(() => {
    setExpandedGroups(new Set())
  }, [])

  // Get filter for a column
  const getActiveFilter = (columnId: CommissionColumnId) => {
    return tableState.filters.find(f => f.columnId === columnId)
  }

  // Calculate display range
  const startIndex = (tableState.currentPage - 1) * (tableState.pageSize === -1 ? processedData.flatData.length : tableState.pageSize)
  const endIndex = Math.min(
    startIndex + (tableState.pageSize === -1 ? processedData.flatData.length : tableState.pageSize),
    processedData.flatData.length
  )

  // Check if all visible deals are selected
  const allVisibleSelected = paginatedFlatData.length > 0 && paginatedFlatData.every(d => selectedIds.has(d.id))
  const someVisibleSelected = paginatedFlatData.some(d => selectedIds.has(d.id))

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Commission Tracking</CardTitle>
            <span className="text-sm text-muted-foreground">
              Showing {processedData.flatData.length > 0 ? startIndex + 1 : 0} - {endIndex} of {processedData.flatData.length} deals
              {processedData.flatData.length !== totalCount && ` (${totalCount} total)`}
            </span>
          </div>

          {/* Toolbar */}
          <CommissionsToolbar
            state={tableState}
            onStateChange={handleStateChange}
            isLoading={isLoading}
            uniqueReps={uniqueReps}
            uniqueYears={uniqueYears}
          />

          {/* Group controls when grouped */}
          {tableState.groupBy !== 'none' && processedData.groups.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {processedData.groups.length} group{processedData.groups.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleExpandAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCollapseAll}>
                Collapse All
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Rep Pivot Table - shows when a rep is selected */}
        {tableState.selectedRep && repDealsForPivot.length > 0 && (
          <div className="px-4 pt-4">
            <RepPivotTable
              deals={repDealsForPivot}
              repName={tableState.selectedRep}
            />
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {/* Checkbox header */}
                <TableHead className="w-12">
                  <Checkbox
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) {
                        const checkbox = el as unknown as { indeterminate: boolean }
                        checkbox.indeterminate = someVisibleSelected && !allVisibleSelected
                      }
                    }}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
                {visibleColumnDefs.map((column) => (
                  <SortableHeader
                    key={column.id}
                    column={column}
                    sortConfigs={tableState.sortConfigs}
                    onSort={handleSort}
                    filterOptions={filterOptions[column.id] || []}
                    activeFilter={getActiveFilter(column.id)}
                    onFilterChange={handleFilterChange}
                    dateRange={column.id === 'funded_date' ? tableState.dateRange : undefined}
                    onDateRangeChange={column.id === 'funded_date' ? handleDateRangeChange : undefined}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonRow key={i} columnCount={visibleColumnDefs.length} />
                ))
              ) : processedData.flatData.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnDefs.length + 1}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No deals found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : tableState.groupBy === 'none' ? (
                // Flat view (no grouping)
                paginatedFlatData.map((deal, index) => {
                  const isSelected = selectedIds.has(deal.id)
                  return (
                    <TableRow
                      key={deal.id}
                      data-state={isSelected ? 'selected' : undefined}
                      className={cn(
                        'cursor-pointer transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-muted/20',
                        isSelected && 'bg-zinc-100 dark:bg-zinc-800'
                      )}
                      onClick={() => onSelectId(deal.id)}
                    >
                      <TableCell className="w-12">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onSelectId(deal.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      {visibleColumnDefs.map((column) => (
                        <TableCell
                          key={column.id}
                          className={cn(
                            column.align === 'right' && 'text-right font-mono',
                            column.align === 'center' && 'text-center',
                            column.id === 'deal_name' && 'max-w-[200px] truncate font-medium'
                          )}
                          title={column.id === 'deal_name' ? (deal.deal_name || '') : undefined}
                        >
                          {column.id === 'payment_status' ? (
                            <StatusBadge status={deal.payment_status} />
                          ) : (
                            formatCommissionCellValue(deal[column.accessor], column.format)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              ) : (
                // Grouped view
                displayGroups.map((group) => {
                  const groupDealIds = group.deals.map(d => d.id)
                  const allGroupSelected = groupDealIds.every(id => selectedIds.has(id))
                  const someGroupSelected = groupDealIds.some(id => selectedIds.has(id))

                  return (
                    <GroupRows
                      key={group.groupKey}
                      group={group}
                      visibleColumns={visibleColumnDefs}
                      onToggle={() => handleToggleGroup(group.groupKey)}
                      selectedIds={selectedIds}
                      onSelectId={onSelectId}
                      allSelected={allGroupSelected && groupDealIds.length > 0}
                      someSelected={someGroupSelected}
                      onSelectGroup={() => {
                        // Toggle all deals in this group
                        if (allGroupSelected) {
                          // Deselect all in group
                          groupDealIds.forEach(id => {
                            if (selectedIds.has(id)) {
                              onSelectId(id)
                            }
                          })
                        } else {
                          // Select all in group
                          groupDealIds.forEach(id => {
                            if (!selectedIds.has(id)) {
                              onSelectId(id)
                            }
                          })
                        }
                      }}
                    />
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!isLoading && processedData.flatData.length > 0 && tableState.groupBy === 'none' && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={tableState.pageSize.toString()}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size === -1 ? 'All' : size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tableState.pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {tableState.currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(tableState.currentPage - 1)}
                    disabled={tableState.currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(tableState.currentPage + 1)}
                    disabled={tableState.currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Separate component for group rows to avoid re-renders
function GroupRows({
  group,
  visibleColumns,
  onToggle,
  selectedIds,
  onSelectId,
  allSelected,
  someSelected,
  onSelectGroup,
}: {
  group: CommissionGroupedData
  visibleColumns: CommissionColumnDef[]
  onToggle: () => void
  selectedIds: Set<string>
  onSelectId: (id: string) => void
  allSelected: boolean
  someSelected: boolean
  onSelectGroup: () => void
}) {
  return (
    <>
      <GroupHeader
        group={group}
        visibleColumns={visibleColumns.map(c => c.id)}
        isExpanded={group.isExpanded}
        onToggle={onToggle}
        allSelected={allSelected}
        someSelected={someSelected}
        onSelectGroup={onSelectGroup}
      />
      {group.isExpanded &&
        group.deals.map((deal, index) => {
          const isSelected = selectedIds.has(deal.id)
          return (
            <TableRow
              key={deal.id}
              data-state={isSelected ? 'selected' : undefined}
              className={cn(
                'cursor-pointer transition-colors',
                index % 2 === 0 ? 'bg-white' : 'bg-muted/20',
                isSelected && 'bg-zinc-100 dark:bg-zinc-800'
              )}
              onClick={() => onSelectId(deal.id)}
            >
              <TableCell className="w-12 pl-8">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onSelectId(deal.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  className={cn(
                    column.align === 'right' && 'text-right font-mono',
                    column.align === 'center' && 'text-center',
                    column.id === 'deal_name' && 'max-w-[200px] truncate font-medium pl-8'
                  )}
                  title={column.id === 'deal_name' ? (deal.deal_name || '') : undefined}
                >
                  {column.id === 'payment_status' ? (
                    <StatusBadge status={deal.payment_status} />
                  ) : (
                    formatCommissionCellValue(deal[column.accessor], column.format)
                  )}
                </TableCell>
              ))}
            </TableRow>
          )
        })}
    </>
  )
}
