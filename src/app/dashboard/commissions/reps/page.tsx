'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { CommissionSummaryCards, calculateCommissionSummary } from '@/components/commissions/commission-summary-cards'
import { SiteHeader } from '@/components/layout/site-header'
import { formatCurrency } from '@/lib/queries'
import { useRepCommissions } from '@/hooks/use-commissions'
import { useSelectionState } from '@/hooks/use-selection-state'
import {
  updateRepCommissionsPaid,
  createClawbacks,
  updateRepPaidDate,
  getTodayDate,
} from '@/lib/commission-mutations'
import type {
  RepCommissionTableState,
  RepCommissionColumnId,
  RepCommissionFilter,
} from '@/types/table'
import {
  REP_COMMISSION_COLUMNS,
  DEFAULT_REP_COMMISSION_TABLE_STATE,
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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { RepCommissionToolbar } from '@/components/commissions/rep-commission-toolbar'
import { FilterDropdown, DateRangeFilter } from '@/components/dashboard/filter-dropdown'
import { PaymentStatusBadge } from '@/components/commissions/PaymentStatusBadge'
import { EditableDateCell } from '@/components/commissions/EditableDateCell'
import { RowContextMenu } from '@/components/commissions/RowContextMenu'
import { BulkActionBar } from '@/components/commissions/BulkActionBar'
import {
  filterRepCommissions,
  sortRepCommissions,
  groupRepCommissions,
  getRepCommissionUniqueValues,
  toggleRepCommissionSort,
  getRepCommissionSortIndicator,
  formatCurrency as formatCurrencyUtil,
  type RepCommissionGroupedData,
} from '@/lib/commission-table-utils'
import type { CommissionPayoutRep } from '@/types/database'

// Column width management
interface ColumnWidths {
  [key: string]: number
}

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  select: 40,
  deal_name: 200,
  rep_name: 140,
  lender: 140,
  funded_date: 110,
  funded_amount: 130,
  commission: 120,
  paid_to_rep: 110,
  paid_date: 100,
  funder_paid: 120,
}

function getStoredWidths(): ColumnWidths {
  if (typeof window === 'undefined') return DEFAULT_COLUMN_WIDTHS
  try {
    const stored = localStorage.getItem('rep-commissions-column-widths')
    return stored ? { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(stored) } : DEFAULT_COLUMN_WIDTHS
  } catch {
    return DEFAULT_COLUMN_WIDTHS
  }
}

function storeWidths(widths: ColumnWidths) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rep-commissions-column-widths', JSON.stringify(widths))
  }
}

interface SortableHeaderProps {
  columnId: RepCommissionColumnId
  label: string
  sortConfigs: RepCommissionTableState['sortConfigs']
  onSort: (columnId: RepCommissionColumnId) => void
  filterable?: boolean
  filterOptions: string[]
  activeFilter: RepCommissionFilter | undefined
  onFilterChange: (filter: RepCommissionFilter) => void
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
  const { priority, direction } = getRepCommissionSortIndicator(sortConfigs, columnId)
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
  group: RepCommissionGroupedData
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

export default function RepsCommissionsPage() {
  // SWR hook - cached data, instant on tab switch, background refresh
  const { data, error: swrError, isLoading: loading } = useRepCommissions()
  const { mutate } = useSWRConfig()
  const error = swrError?.message ?? null

  // Selection state
  const {
    selectedIds,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    selectedCount,
    isAllSelected,
    isIndeterminate,
  } = useSelectionState()

  const [tableState, setTableState] = useState<RepCommissionTableState>(() => ({
    ...DEFAULT_REP_COMMISSION_TABLE_STATE,
  }))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(getStoredWidths)
  const [isBulkLoading, setIsBulkLoading] = useState(false)

  const handleColumnWidthChange = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => {
      const next = { ...prev, [columnId]: width }
      storeWidths(next)
      return next
    })
  }, [])

  // Get visible columns
  const visibleColumnDefs = useMemo(() => {
    return REP_COMMISSION_COLUMNS.filter(c => tableState.visibleColumns.includes(c.id))
  }, [tableState.visibleColumns])

  // Get unique values for filterable columns
  const filterOptions = useMemo(() => {
    const options: Record<RepCommissionColumnId, string[]> = {} as Record<RepCommissionColumnId, string[]>
    REP_COMMISSION_COLUMNS.forEach(col => {
      if (col.filterable) {
        options[col.id] = getRepCommissionUniqueValues(data, col.id)
      }
    })
    return options
  }, [data])

  // Process data: filter -> sort -> group
  const processedData = useMemo(() => {
    if (data.length === 0) return { groups: [], flatData: [] }

    const filtered = filterRepCommissions(data, tableState)
    const sorted = sortRepCommissions(filtered, tableState.sortConfigs)
    const groups = groupRepCommissions(sorted, tableState.groupBy, expandedGroups)

    return { groups, flatData: sorted }
  }, [data, tableState, expandedGroups])

  // Get all row IDs for select-all
  const allRowIds = useMemo(() => processedData.flatData.map(r => r.id), [processedData.flatData])

  // Calculate summary from filtered data
  const summary = useMemo(() => calculateCommissionSummary(processedData.flatData), [processedData.flatData])

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

  // Bulk action handlers
  const handleBulkMarkAsPaid = useCallback(async () => {
    if (selectedCount === 0) return
    setIsBulkLoading(true)
    try {
      await updateRepCommissionsPaid(Array.from(selectedIds), true, getTodayDate())
      await mutate('rep-commissions')
      toast.success(`${selectedCount} commissions marked as paid`)
      clearSelection()
    } catch (err) {
      toast.error('Failed to mark commissions as paid')
      console.error(err)
    } finally {
      setIsBulkLoading(false)
    }
  }, [selectedIds, selectedCount, mutate, clearSelection])

  const handleBulkMarkAsClawback = useCallback(async () => {
    if (selectedCount === 0) return
    setIsBulkLoading(true)
    try {
      // Get funded_deal_ids from selected rows
      const fundedDealIds = Array.from(selectedIds)
        .map(id => processedData.flatData.find(r => r.id === id)?.funded_deal_id)
        .filter((id): id is string => id !== undefined)

      if (fundedDealIds.length > 0) {
        await createClawbacks(fundedDealIds, 'rep')
        await mutate('rep-commissions')
        toast.success('Clawback recorded')
        clearSelection()
      }
    } catch (err) {
      toast.error('Failed to record clawback')
      console.error(err)
    } finally {
      setIsBulkLoading(false)
    }
  }, [selectedIds, selectedCount, processedData.flatData, mutate, clearSelection])

  // Single row payment toggle handler
  const handlePaymentToggle = useCallback(async (row: CommissionPayoutRep) => {
    try {
      const newPaidDate = row.paid ? null : getTodayDate()
      await updateRepCommissionsPaid([row.id], !row.paid, newPaidDate)
      await mutate('rep-commissions')
      toast.success(row.paid ? 'Commission marked as pending' : 'Commission marked as paid')
    } catch (err) {
      toast.error('Failed to update payment status')
      console.error(err)
    }
  }, [mutate])

  // Single row paid date update handler
  const handlePaidDateUpdate = useCallback(async (rowId: string, newDate: string) => {
    try {
      await updateRepPaidDate(rowId, newDate)
      await mutate('rep-commissions')
      toast.success('Paid date updated')
    } catch (err) {
      toast.error('Failed to update paid date')
      console.error(err)
    }
  }, [mutate])

  // Context menu handlers
  const handleContextMarkAsPaid = useCallback(async (row: CommissionPayoutRep) => {
    try {
      await updateRepCommissionsPaid([row.id], true, getTodayDate())
      await mutate('rep-commissions')
      toast.success('Commission marked as paid')
    } catch (err) {
      toast.error('Failed to mark as paid')
      console.error(err)
    }
  }, [mutate])

  const handleContextMarkAsUnpaid = useCallback(async (row: CommissionPayoutRep) => {
    try {
      await updateRepCommissionsPaid([row.id], false, null)
      await mutate('rep-commissions')
      toast.success('Commission marked as pending')
    } catch (err) {
      toast.error('Failed to mark as pending')
      console.error(err)
    }
  }, [mutate])

  const handleContextMarkAsClawback = useCallback(async (row: CommissionPayoutRep) => {
    if (!row.funded_deal_id) return
    try {
      await createClawbacks([row.funded_deal_id], 'rep')
      await mutate('rep-commissions')
      toast.success('Clawback recorded')
    } catch (err) {
      toast.error('Failed to record clawback')
      console.error(err)
    }
  }, [mutate])

  // Handlers
  const handleStateChange = useCallback((newState: RepCommissionTableState) => {
    setTableState(newState)
  }, [])

  const handleSort = useCallback((columnId: RepCommissionColumnId) => {
    setTableState(prev => ({
      ...prev,
      sortConfigs: toggleRepCommissionSort(prev.sortConfigs, columnId),
      currentPage: 1,
    }))
  }, [])

  const handleFilterChange = useCallback((filter: RepCommissionFilter) => {
    setTableState(prev => {
      const existingIndex = prev.filters.findIndex(f => f.columnId === filter.columnId)
      let newFilters: RepCommissionFilter[]

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

  const getActiveFilter = (columnId: RepCommissionColumnId) => {
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
        <SiteHeader title="Rep Commissions" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <SiteHeader title="Rep Commissions" />
        <div className="p-6 text-red-600">{error}</div>
      </>
    )
  }

  return (
    <>
      <SiteHeader title="Rep Commissions" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <CommissionSummaryCards
          summary={summary}
          isLoading={loading}
          variant="rep"
        />

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Rep Commissions</CardTitle>
                <span className="text-sm text-muted-foreground">
                  Showing {processedData.flatData.length > 0 ? startIndex + 1 : 0} - {endIndex} of {processedData.flatData.length} commissions
                </span>
              </div>

              {/* Toolbar */}
              <RepCommissionToolbar
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
                    {/* Checkbox column header */}
                    <TableHead
                      className="w-10"
                      style={{ width: `${columnWidths.select || DEFAULT_COLUMN_WIDTHS.select}px` }}
                    >
                      <Checkbox
                        checked={isAllSelected(allRowIds)}
                        onCheckedChange={() => selectAll(allRowIds)}
                        aria-label="Select all"
                        className={isIndeterminate(allRowIds) ? 'data-[state=checked]:bg-primary/50' : ''}
                      />
                    </TableHead>
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
                    {/* Paid Date column header */}
                    <TableHead
                      style={{ width: `${columnWidths.paid_date || DEFAULT_COLUMN_WIDTHS.paid_date}px` }}
                    >
                      Paid Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <SkeletonRow key={i} columnCount={visibleColumnDefs.length + 2} />
                    ))
                  ) : processedData.flatData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={visibleColumnDefs.length + 2}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No commissions found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : tableState.groupBy === 'none' ? (
                    paginatedFlatData.map((row, index) => (
                      <RowContextMenu
                        key={row.id}
                        isPaid={row.paid === true}
                        onMarkAsPaid={() => handleContextMarkAsPaid(row)}
                        onMarkAsUnpaid={() => handleContextMarkAsUnpaid(row)}
                        onMarkAsClawback={() => handleContextMarkAsClawback(row)}
                      >
                        <TableRow
                          className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                        >
                          {/* Checkbox cell */}
                          <TableCell
                            style={{ width: `${columnWidths.select || DEFAULT_COLUMN_WIDTHS.select}px` }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected(row.id)}
                              onCheckedChange={() => toggle(row.id)}
                              aria-label={`Select ${row.deal_name}`}
                            />
                          </TableCell>
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
                                  {column.id === 'rep_name' && row.rep_name}
                                  {column.id === 'lender' && row.lender}
                                  {column.id === 'funded_date' && row.funded_date}
                                  {column.id === 'funded_amount' && formatCurrency(row.funded_amount || 0)}
                                  {column.id === 'commission' && formatCurrency(row.commission_amount || 0)}
                                  {column.id === 'paid_to_rep' && (
                                    <PaymentStatusBadge
                                      paid={row.paid}
                                      onToggle={() => handlePaymentToggle(row)}
                                    />
                                  )}
                                  {column.id === 'funder_paid' && (
                                    row.lender_inhouse ? (
                                      <span className="text-muted-foreground text-sm">In-House</span>
                                    ) : (
                                      <PaymentStatusBadge
                                        paid={row.funder_paid_parkview === true}
                                        disabled
                                      />
                                    )
                                  )}
                                </div>
                              </TableCell>
                            )
                          })}
                          {/* Paid Date cell */}
                          <TableCell
                            style={{ width: `${columnWidths.paid_date || DEFAULT_COLUMN_WIDTHS.paid_date}px` }}
                          >
                            <EditableDateCell
                              value={row.paid_date}
                              onSave={(date) => handlePaidDateUpdate(row.id, date)}
                              disabled={!row.paid}
                            />
                          </TableCell>
                        </TableRow>
                      </RowContextMenu>
                    ))
                  ) : (
                    displayGroups.map((group) => (
                      <GroupRows
                        key={group.groupKey}
                        group={group}
                        visibleColumns={visibleColumnDefs}
                        columnWidths={columnWidths}
                        onToggle={() => handleToggleGroup(group.groupKey)}
                        isSelected={isSelected}
                        toggle={toggle}
                        onPaymentToggle={handlePaymentToggle}
                        onPaidDateUpdate={handlePaidDateUpdate}
                        onContextMarkAsPaid={handleContextMarkAsPaid}
                        onContextMarkAsUnpaid={handleContextMarkAsUnpaid}
                        onContextMarkAsClawback={handleContextMarkAsClawback}
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

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedCount}
          onMarkAsPaid={handleBulkMarkAsPaid}
          onMarkAsClawback={handleBulkMarkAsClawback}
          onClear={clearSelection}
          isLoading={isBulkLoading}
        />
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
  isSelected,
  toggle,
  onPaymentToggle,
  onPaidDateUpdate,
  onContextMarkAsPaid,
  onContextMarkAsUnpaid,
  onContextMarkAsClawback,
}: {
  group: RepCommissionGroupedData
  visibleColumns: typeof REP_COMMISSION_COLUMNS
  columnWidths: ColumnWidths
  onToggle: () => void
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  onPaymentToggle: (row: CommissionPayoutRep) => void
  onPaidDateUpdate: (rowId: string, newDate: string) => Promise<void>
  onContextMarkAsPaid: (row: CommissionPayoutRep) => void
  onContextMarkAsUnpaid: (row: CommissionPayoutRep) => void
  onContextMarkAsClawback: (row: CommissionPayoutRep) => void
}) {
  return (
    <>
      <GroupHeader
        group={group}
        columnCount={visibleColumns.length + 2}
        isExpanded={group.isExpanded}
        onToggle={onToggle}
      />
      {group.isExpanded &&
        group.rows.map((row, index) => (
          <RowContextMenu
            key={row.id}
            isPaid={row.paid === true}
            onMarkAsPaid={() => onContextMarkAsPaid(row)}
            onMarkAsUnpaid={() => onContextMarkAsUnpaid(row)}
            onMarkAsClawback={() => onContextMarkAsClawback(row)}
          >
            <TableRow
              className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
            >
              {/* Checkbox cell */}
              <TableCell
                style={{ width: `${columnWidths.select || DEFAULT_COLUMN_WIDTHS.select}px` }}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected(row.id)}
                  onCheckedChange={() => toggle(row.id)}
                  aria-label={`Select ${row.deal_name}`}
                />
              </TableCell>
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
                      {column.id === 'rep_name' && row.rep_name}
                      {column.id === 'lender' && row.lender}
                      {column.id === 'funded_date' && row.funded_date}
                      {column.id === 'funded_amount' && formatCurrency(row.funded_amount || 0)}
                      {column.id === 'commission' && formatCurrency(row.commission_amount || 0)}
                      {column.id === 'paid_to_rep' && (
                        <PaymentStatusBadge
                          paid={row.paid}
                          onToggle={() => onPaymentToggle(row)}
                        />
                      )}
                      {column.id === 'funder_paid' && (
                        row.lender_inhouse ? (
                          <span className="text-muted-foreground text-sm">In-House</span>
                        ) : (
                          <PaymentStatusBadge
                            paid={row.funder_paid_parkview === true}
                            disabled
                          />
                        )
                      )}
                    </div>
                  </TableCell>
                )
              })}
              {/* Paid Date cell */}
              <TableCell
                style={{ width: `${columnWidths.paid_date || DEFAULT_COLUMN_WIDTHS.paid_date}px` }}
              >
                <EditableDateCell
                  value={row.paid_date}
                  onSave={(date) => onPaidDateUpdate(row.id, date)}
                  disabled={!row.paid}
                />
              </TableCell>
            </TableRow>
          </RowContextMenu>
        ))}
    </>
  )
}
