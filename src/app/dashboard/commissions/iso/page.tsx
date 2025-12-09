'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { formatCurrency } from '@/lib/queries'
import { useISOCommissions } from '@/hooks/use-commissions'
import type { CommissionPayoutISO } from '@/types/database'
import type {
  ISOCommissionTableState,
  ISOCommissionColumnId,
  ISOCommissionFilter,
} from '@/types/table'
import {
  ISO_COMMISSION_COLUMNS,
  DEFAULT_ISO_COMMISSION_TABLE_STATE,
  PAGE_SIZE_OPTIONS,
} from '@/types/table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import { ISOCommissionToolbar } from '@/components/commissions/iso-commission-toolbar'
import { FilterDropdown, DateRangeFilter } from '@/components/dashboard/filter-dropdown'
import {
  filterISOCommissions,
  sortISOCommissions,
  groupISOCommissions,
  getISOCommissionUniqueValues,
  toggleISOCommissionSort,
  getISOCommissionSortIndicator,
  formatCurrency as formatCurrencyUtil,
  type ISOCommissionGroupedData,
} from '@/lib/commission-table-utils'

// Column width management
interface ColumnWidths {
  [key: string]: number
}

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  deal_name: 200,
  iso_name: 140,
  lender: 140,
  funded_date: 110,
  funded_amount: 130,
  commission: 120,
  paid_to_iso: 110,
}

function getStoredWidths(): ColumnWidths {
  if (typeof window === 'undefined') return DEFAULT_COLUMN_WIDTHS
  try {
    const stored = localStorage.getItem('iso-commissions-column-widths')
    return stored ? { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(stored) } : DEFAULT_COLUMN_WIDTHS
  } catch {
    return DEFAULT_COLUMN_WIDTHS
  }
}

function storeWidths(widths: ColumnWidths) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('iso-commissions-column-widths', JSON.stringify(widths))
  }
}

interface SortableHeaderProps {
  columnId: ISOCommissionColumnId
  label: string
  sortConfigs: ISOCommissionTableState['sortConfigs']
  onSort: (columnId: ISOCommissionColumnId) => void
  filterable?: boolean
  filterOptions: string[]
  activeFilter: ISOCommissionFilter | undefined
  onFilterChange: (filter: ISOCommissionFilter) => void
  dateRange?: { startDate: string | null; endDate: string | null }
  onDateRangeChange?: (start: string | null, end: string | null) => void
  width: number
  onWidthChange: (width: number) => void
  align?: 'left' | 'right' | 'center'
}

function SortableHeader({
  columnId,
  label,
  sortConfigs,
  onSort,
  filterable,
  filterOptions,
  activeFilter,
  onFilterChange,
  dateRange,
  onDateRangeChange,
  width,
  onWidthChange,
  align = 'left',
}: SortableHeaderProps) {
  const { priority, direction } = getISOCommissionSortIndicator(sortConfigs, columnId)
  const isActive = direction !== null
  const headerRef = useRef<HTMLTableCellElement>(null)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startXRef.current = e.clientX
    startWidthRef.current = headerRef.current?.offsetWidth || width

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current
      const newWidth = Math.max(50, startWidthRef.current + diff)
      onWidthChange(newWidth)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width, onWidthChange])

  const handleFilterChangeWrapper = (filter: { columnId: string; selectedValues: string[] }) => {
    onFilterChange({
      columnId: columnId,
      selectedValues: filter.selectedValues,
    })
  }

  return (
    <TableHead
      ref={headerRef}
      className={`select-none relative group ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}
      style={{ width: `${width}px`, minWidth: '50px' }}
    >
      <div className={`flex items-center gap-1 pr-2 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {/* Filter button */}
        {filterable && columnId === 'funded_date' && dateRange && onDateRangeChange ? (
          <DateRangeFilter
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateRangeChange={onDateRangeChange}
          />
        ) : filterable && filterOptions.length > 0 ? (
          <FilterDropdown
            columnId={columnId}
            label={label}
            options={filterOptions}
            selectedValues={activeFilter?.selectedValues || []}
            onFilterChange={handleFilterChangeWrapper}
          />
        ) : null}

        {/* Sort button */}
        <button
          className="flex items-center gap-1 transition-colors hover:text-foreground truncate"
          onClick={() => onSort(columnId)}
        >
          <span className="truncate">{label}</span>
          {isActive ? (
            <span className="flex items-center text-primary flex-shrink-0">
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
            <ArrowUpDown className="h-3.5 w-3.5 opacity-30 flex-shrink-0" />
          )}
        </button>
      </div>
      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
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
  columnCount,
  isExpanded,
  onToggle,
}: {
  group: ISOCommissionGroupedData
  columnCount: number
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <TableRow className="bg-muted/50 hover:bg-muted/70">
      <TableCell colSpan={columnCount} className="py-2">
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
            ({group.totals.count} commission{group.totals.count !== 1 ? 's' : ''})
          </span>
          <span className="ml-auto flex items-center gap-4 text-sm font-normal text-muted-foreground">
            <span>Total Funded: {formatCurrencyUtil(group.totals.totalFunded)}</span>
            <span>Commission: {formatCurrencyUtil(group.totals.totalCommission)}</span>
            <span>Paid: {group.totals.paidCount} | Pending: {group.totals.pendingCount}</span>
          </span>
        </button>
      </TableCell>
    </TableRow>
  )
}

export default function ISOCommissionsPage() {
  // SWR hook for cached data fetching
  const { data, error: swrError, isLoading: loading } = useISOCommissions()
  const error = swrError?.message ?? null

  const [tableState, setTableState] = useState<ISOCommissionTableState>(() => ({
    ...DEFAULT_ISO_COMMISSION_TABLE_STATE,
  }))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(getStoredWidths)

  const handleColumnWidthChange = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => {
      const next = { ...prev, [columnId]: width }
      storeWidths(next)
      return next
    })
  }, [])

  // Get visible columns
  const visibleColumnDefs = useMemo(() => {
    return ISO_COMMISSION_COLUMNS.filter(c => tableState.visibleColumns.includes(c.id))
  }, [tableState.visibleColumns])

  // Get unique values for filterable columns
  const filterOptions = useMemo(() => {
    const options: Record<ISOCommissionColumnId, string[]> = {} as Record<ISOCommissionColumnId, string[]>
    ISO_COMMISSION_COLUMNS.forEach(col => {
      if (col.filterable) {
        options[col.id] = getISOCommissionUniqueValues(data, col.id)
      }
    })
    return options
  }, [data])

  // Process data: filter -> sort -> group
  const processedData = useMemo(() => {
    if (data.length === 0) return { groups: [], flatData: [] }

    const filtered = filterISOCommissions(data, tableState)
    const sorted = sortISOCommissions(filtered, tableState.sortConfigs)
    const groups = groupISOCommissions(sorted, tableState.groupBy, expandedGroups)

    return { groups, flatData: sorted }
  }, [data, tableState, expandedGroups])

  // Pagination
  const totalPages = tableState.pageSize === -1 ? 1 : Math.ceil(processedData.flatData.length / tableState.pageSize)
  const paginatedFlatData = useMemo(() => {
    if (tableState.pageSize === -1) return processedData.flatData
    const start = (tableState.currentPage - 1) * tableState.pageSize
    return processedData.flatData.slice(start, start + tableState.pageSize)
  }, [processedData.flatData, tableState.pageSize, tableState.currentPage])

  const displayGroups = useMemo(() => {
    if (tableState.groupBy === 'none') {
      return [{
        groupKey: 'all',
        groupLabel: 'All Commissions',
        rows: paginatedFlatData,
        totals: processedData.groups[0]?.totals || {
          count: 0,
          totalFunded: 0,
          totalCommission: 0,
          paidCount: 0,
          pendingCount: 0,
        },
        isExpanded: true,
      }]
    }
    return processedData.groups.map(group => ({
      ...group,
      isExpanded: expandedGroups.has(group.groupKey),
    }))
  }, [tableState.groupBy, processedData.groups, paginatedFlatData, expandedGroups])

  // Handlers
  const handleStateChange = useCallback((newState: ISOCommissionTableState) => {
    setTableState(newState)
  }, [])

  const handleSort = useCallback((columnId: ISOCommissionColumnId) => {
    setTableState(prev => ({
      ...prev,
      sortConfigs: toggleISOCommissionSort(prev.sortConfigs, columnId),
      currentPage: 1,
    }))
  }, [])

  const handleFilterChange = useCallback((filter: ISOCommissionFilter) => {
    setTableState(prev => {
      const existingIndex = prev.filters.findIndex(f => f.columnId === filter.columnId)
      let newFilters: ISOCommissionFilter[]

      if (filter.selectedValues.length === 0) {
        newFilters = prev.filters.filter(f => f.columnId !== filter.columnId)
      } else if (existingIndex >= 0) {
        newFilters = [...prev.filters]
        newFilters[existingIndex] = filter
      } else {
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

  const getActiveFilter = (columnId: ISOCommissionColumnId) => {
    return tableState.filters.find(f => f.columnId === columnId)
  }

  // Calculate display range
  const startIndex = (tableState.currentPage - 1) * (tableState.pageSize === -1 ? processedData.flatData.length : tableState.pageSize)
  const endIndex = Math.min(
    startIndex + (tableState.pageSize === -1 ? processedData.flatData.length : tableState.pageSize),
    processedData.flatData.length
  )

  if (loading) {
    return (
      <>
        <SiteHeader title="ISO Commissions" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <SiteHeader title="ISO Commissions" />
        <div className="p-6 text-red-600">{error}</div>
      </>
    )
  }

  return (
    <>
      <SiteHeader title="ISO Commissions" />
      <div className="p-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">ISO Commissions</CardTitle>
                <span className="text-sm text-muted-foreground">
                  Showing {processedData.flatData.length > 0 ? startIndex + 1 : 0} - {endIndex} of {processedData.flatData.length} commissions
                </span>
              </div>

              {/* Toolbar */}
              <ISOCommissionToolbar
                state={tableState}
                onStateChange={handleStateChange}
                isLoading={loading}
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
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {visibleColumnDefs.map((column) => (
                      <SortableHeader
                        key={column.id}
                        columnId={column.id}
                        label={column.label}
                        sortConfigs={tableState.sortConfigs}
                        onSort={handleSort}
                        filterable={column.filterable}
                        filterOptions={filterOptions[column.id] || []}
                        activeFilter={getActiveFilter(column.id)}
                        onFilterChange={handleFilterChange}
                        dateRange={column.id === 'funded_date' ? tableState.dateRange : undefined}
                        onDateRangeChange={column.id === 'funded_date' ? handleDateRangeChange : undefined}
                        width={columnWidths[column.id] || DEFAULT_COLUMN_WIDTHS[column.id] || 100}
                        onWidthChange={(width) => handleColumnWidthChange(column.id, width)}
                        align={column.align}
                      />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <SkeletonRow key={i} columnCount={visibleColumnDefs.length} />
                    ))
                  ) : processedData.flatData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={visibleColumnDefs.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No commissions found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : tableState.groupBy === 'none' ? (
                    paginatedFlatData.map((row, index) => (
                      <TableRow
                        key={row.id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                      >
                        {visibleColumnDefs.map((column) => {
                          const width = columnWidths[column.id] || DEFAULT_COLUMN_WIDTHS[column.id] || 100
                          return (
                            <TableCell
                              key={column.id}
                              className={`${column.align === 'right' ? 'text-right font-mono' : column.align === 'center' ? 'text-center' : ''} ${
                                column.id === 'deal_name' ? 'font-medium' : ''
                              }`}
                              style={{ width: `${width}px`, maxWidth: `${width}px` }}
                            >
                              <div className="truncate">
                                {column.id === 'deal_name' && row.deal_name}
                                {column.id === 'iso_name' && row.iso_name}
                                {column.id === 'lender' && row.lender}
                                {column.id === 'funded_date' && row.funded_date}
                                {column.id === 'funded_amount' && formatCurrency(row.funded_amount || 0)}
                                {column.id === 'commission' && formatCurrency(row.commission_amount || 0)}
                                {column.id === 'paid_to_iso' && (
                                  <Badge variant={row.paid ? 'default' : 'secondary'}>
                                    {row.paid ? 'Paid' : 'Pending'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  ) : (
                    displayGroups.map((group) => (
                      <GroupRows
                        key={group.groupKey}
                        group={group}
                        visibleColumns={visibleColumnDefs}
                        columnWidths={columnWidths}
                        onToggle={() => handleToggleGroup(group.groupKey)}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!loading && processedData.flatData.length > 0 && tableState.groupBy === 'none' && (
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
      </div>
    </>
  )
}

// Separate component for group rows
function GroupRows({
  group,
  visibleColumns,
  columnWidths,
  onToggle,
}: {
  group: ISOCommissionGroupedData
  visibleColumns: typeof ISO_COMMISSION_COLUMNS
  columnWidths: ColumnWidths
  onToggle: () => void
}) {
  return (
    <>
      <GroupHeader
        group={group}
        columnCount={visibleColumns.length}
        isExpanded={group.isExpanded}
        onToggle={onToggle}
      />
      {group.isExpanded &&
        group.rows.map((row, index) => (
          <TableRow
            key={row.id}
            className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
          >
            {visibleColumns.map((column) => {
              const width = columnWidths[column.id] || DEFAULT_COLUMN_WIDTHS[column.id] || 100
              return (
                <TableCell
                  key={column.id}
                  className={`${column.align === 'right' ? 'text-right font-mono' : column.align === 'center' ? 'text-center' : ''} ${
                    column.id === 'deal_name' ? 'font-medium pl-8' : ''
                  }`}
                  style={{ width: `${width}px`, maxWidth: `${width}px` }}
                >
                  <div className="truncate">
                    {column.id === 'deal_name' && row.deal_name}
                    {column.id === 'iso_name' && row.iso_name}
                    {column.id === 'lender' && row.lender}
                    {column.id === 'funded_date' && row.funded_date}
                    {column.id === 'funded_amount' && formatCurrency(row.funded_amount || 0)}
                    {column.id === 'commission' && formatCurrency(row.commission_amount || 0)}
                    {column.id === 'paid_to_iso' && (
                      <Badge variant={row.paid ? 'default' : 'secondary'}>
                        {row.paid ? 'Paid' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                </TableCell>
              )
            })}
          </TableRow>
        ))}
    </>
  )
}
