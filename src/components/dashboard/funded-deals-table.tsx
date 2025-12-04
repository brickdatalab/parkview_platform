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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon
} from 'lucide-react'
import type { FundedDeal } from '@/types/database'
import type {
  TableState,
  ColumnId,
  ColumnFilter,
  SortConfig,
  GroupedData,
  ColumnDef
} from '@/types/table'
import {
  ALL_COLUMNS,
  DEFAULT_TABLE_STATE,
  PAGE_SIZE_OPTIONS
} from '@/types/table'
import {
  filterDeals,
  sortDeals,
  groupDeals,
  paginateData,
  getTotalPages,
  formatCellValue,
  formatCurrency,
  getUniqueColumnValues,
  toggleColumnSort,
  getSortIndicator,
} from '@/lib/table-utils'
import { TableToolbar } from './table-toolbar'
import { FilterDropdown, DateRangeFilter } from './filter-dropdown'

interface FundedDealsTableProps {
  data: FundedDeal[]
  totalCount: number
  isLoading?: boolean
}

interface SortableHeaderProps {
  column: ColumnDef
  sortConfigs: SortConfig[]
  onSort: (columnId: ColumnId) => void
  filterOptions: string[]
  activeFilter: ColumnFilter | undefined
  onFilterChange: (filter: ColumnFilter) => void
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
  const { priority, direction } = getSortIndicator(sortConfigs, column.id)
  const isActive = direction !== null

  return (
    <TableHead
      className={`select-none ${column.align === 'right' ? 'text-right' : ''}`}
    >
      <div className={`flex items-center gap-1 ${column.align === 'right' ? 'justify-end' : ''}`}>
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

function SkeletonRow({ columnCount }: { columnCount: number }) {
  return (
    <TableRow>
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
}: {
  group: GroupedData
  visibleColumns: ColumnId[]
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <TableRow className="bg-muted/50 hover:bg-muted/70">
      <TableCell colSpan={visibleColumns.length} className="py-2">
        <button
          className="flex items-center gap-2 w-full text-left font-medium"
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
            <span>Total: {formatCurrency(group.totals.totalFunded)}</span>
            <span>Commission: {formatCurrency(group.totals.totalCommission)}</span>
            <span>Rev: {formatCurrency(group.totals.totalRev)}</span>
          </span>
        </button>
      </TableCell>
    </TableRow>
  )
}

export function FundedDealsTable({
  data,
  totalCount,
  isLoading
}: FundedDealsTableProps) {
  // Table state
  const [tableState, setTableState] = useState<TableState>(() => ({
    ...DEFAULT_TABLE_STATE,
  }))

  // Expanded groups for grouped view
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Get visible columns
  const visibleColumnDefs = useMemo(() => {
    return ALL_COLUMNS.filter(c => tableState.visibleColumns.includes(c.id))
  }, [tableState.visibleColumns])

  // Get unique values for each filterable column
  const filterOptions = useMemo(() => {
    const options: Record<ColumnId, string[]> = {} as Record<ColumnId, string[]>
    ALL_COLUMNS.forEach(col => {
      if (col.filterable) {
        options[col.id] = getUniqueColumnValues(data, col.id)
      }
    })
    return options
  }, [data])

  // Filter -> Sort -> Group pipeline
  const processedData = useMemo(() => {
    if (data.length === 0) return { groups: [], flatData: [] }

    // Step 1: Filter
    const filtered = filterDeals(data, tableState)

    // Step 2: Sort
    const sorted = sortDeals(filtered, tableState.sortConfigs)

    // Step 3: Group
    const groups = groupDeals(sorted, tableState.groupBy, expandedGroups)

    return { groups, flatData: sorted }
  }, [data, tableState, expandedGroups])

  // Calculate pagination based on flat data (ungrouped)
  const totalPages = getTotalPages(processedData.flatData.length, tableState.pageSize)
  const paginatedFlatData = paginateData(processedData.flatData, tableState.pageSize, tableState.currentPage)

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
          totalCommission: 0,
          totalPsf: 0,
          totalRev: 0,
          totalRepCommission: 0,
          avgFactorRate: 0,
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
  const handleStateChange = useCallback((newState: TableState) => {
    setTableState(newState)
  }, [])

  const handleSort = useCallback((columnId: ColumnId) => {
    setTableState(prev => ({
      ...prev,
      sortConfigs: toggleColumnSort(prev.sortConfigs, columnId),
      currentPage: 1,
    }))
  }, [])

  const handleFilterChange = useCallback((filter: ColumnFilter) => {
    setTableState(prev => {
      const existingIndex = prev.filters.findIndex(f => f.columnId === filter.columnId)
      let newFilters: ColumnFilter[]

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
  const getActiveFilter = (columnId: ColumnId) => {
    return tableState.filters.find(f => f.columnId === columnId)
  }

  // Calculate display range
  const startIndex = (tableState.currentPage - 1) * (tableState.pageSize === -1 ? processedData.flatData.length : tableState.pageSize)
  const endIndex = Math.min(
    startIndex + (tableState.pageSize === -1 ? processedData.flatData.length : tableState.pageSize),
    processedData.flatData.length
  )

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Funded Deals</CardTitle>
            <span className="text-sm text-muted-foreground">
              Showing {processedData.flatData.length > 0 ? startIndex + 1 : 0} - {endIndex} of {processedData.flatData.length} deals
              {processedData.flatData.length !== totalCount && ` (${totalCount} total)`}
            </span>
          </div>

          {/* Toolbar */}
          <TableToolbar
            state={tableState}
            onStateChange={handleStateChange}
            isLoading={isLoading}
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
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
                    colSpan={visibleColumnDefs.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No deals found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : tableState.groupBy === 'none' ? (
                // Flat view (no grouping)
                paginatedFlatData.map((deal, index) => (
                  <TableRow
                    key={deal.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                  >
                    {visibleColumnDefs.map((column) => (
                      <TableCell
                        key={column.id}
                        className={`${column.align === 'right' ? 'text-right font-mono' : ''} ${
                          column.id === 'deal_name' ? 'max-w-[200px] truncate font-medium' : ''
                        }`}
                        title={column.id === 'deal_name' ? (deal.deal_name || '') : undefined}
                      >
                        {formatCellValue(deal[column.accessor], column.format)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                // Grouped view
                displayGroups.map((group) => (
                  <GroupRows
                    key={group.groupKey}
                    group={group}
                    visibleColumns={visibleColumnDefs}
                    onToggle={() => handleToggleGroup(group.groupKey)}
                  />
                ))
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
}: {
  group: GroupedData
  visibleColumns: ColumnDef[]
  onToggle: () => void
}) {
  return (
    <>
      <GroupHeader
        group={group}
        visibleColumns={visibleColumns.map(c => c.id)}
        isExpanded={group.isExpanded}
        onToggle={onToggle}
      />
      {group.isExpanded &&
        group.deals.map((deal, index) => (
          <TableRow
            key={deal.id}
            className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
          >
            {visibleColumns.map((column) => (
              <TableCell
                key={column.id}
                className={`${column.align === 'right' ? 'text-right font-mono' : ''} ${
                  column.id === 'deal_name' ? 'max-w-[200px] truncate font-medium pl-8' : ''
                }`}
                title={column.id === 'deal_name' ? (deal.deal_name || '') : undefined}
              >
                {formatCellValue(deal[column.accessor], column.format)}
              </TableCell>
            ))}
          </TableRow>
        ))}
    </>
  )
}
