'use client'

import { useState, useMemo, useCallback } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { useBrokeredCommissions } from '@/hooks/use-brokered-commissions'
import type { BrokeredCommission } from '@/types/database'
import {
  updateBrokeredPaid,
  createClawbacks,
  updateBrokeredPaidDate,
  getTodayDate,
} from '@/lib/commission-mutations'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { BulkActionBar } from '@/components/commissions/BulkActionBar'
import { PaymentStatusBadge } from '@/components/commissions/PaymentStatusBadge'
import { EditableDateCell } from '@/components/commissions/EditableDateCell'
import { RowContextMenu } from '@/components/commissions/RowContextMenu'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'

const PAGE_SIZE_OPTIONS = [25, 50, 100, -1]

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function BrokeredCommissionsPage() {
  const { data = [], error: swrError, isLoading: loading, mutate } = useBrokeredCommissions()
  const { mutate: globalMutate } = useSWRConfig()
  const error = swrError?.message ?? null

  // Local state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const query = searchQuery.toLowerCase()
    return data.filter(
      (row) =>
        row.deal_name?.toLowerCase().includes(query) ||
        row.lender?.toLowerCase().includes(query) ||
        row.rep?.toLowerCase().includes(query)
    )
  }, [data, searchQuery])

  // Pagination
  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredData.length / pageSize)
  const paginatedData = useMemo(() => {
    if (pageSize === -1) return filteredData
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, pageSize, currentPage])

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedData.map((row) => row.id)))
    }
  }, [paginatedData, selectedIds.size])

  const handleSelectRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Mutation handlers
  const handleMarkAsPaid = useCallback(async () => {
    if (selectedIds.size === 0) return
    setIsUpdating(true)
    try {
      await updateBrokeredPaid(Array.from(selectedIds), true, getTodayDate())
      await mutate()
      globalMutate('brokered-commissions')
      setSelectedIds(new Set())
      toast.success(`Marked ${selectedIds.size} deal(s) as paid`)
    } catch (err) {
      toast.error('Failed to update payment status')
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }, [selectedIds, mutate, globalMutate])

  const handleMarkAsClawback = useCallback(async () => {
    if (selectedIds.size === 0) return
    setIsUpdating(true)
    try {
      const fundedDealIds = Array.from(selectedIds)
      await createClawbacks(fundedDealIds, 'brokered')
      await updateBrokeredPaid(fundedDealIds, false, null)
      await mutate()
      globalMutate('brokered-commissions')
      setSelectedIds(new Set())
      toast.success(`Marked ${selectedIds.size} deal(s) as clawback`)
    } catch (err) {
      toast.error('Failed to create clawback records')
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }, [selectedIds, mutate, globalMutate])

  // Single row handlers
  const handleSingleMarkAsPaid = useCallback(
    async (id: string) => {
      setIsUpdating(true)
      try {
        await updateBrokeredPaid([id], true, getTodayDate())
        await mutate()
        toast.success('Marked as paid')
      } catch (err) {
        toast.error('Failed to update payment status')
        console.error(err)
      } finally {
        setIsUpdating(false)
      }
    },
    [mutate]
  )

  const handleSingleMarkAsUnpaid = useCallback(
    async (id: string) => {
      setIsUpdating(true)
      try {
        await updateBrokeredPaid([id], false, null)
        await mutate()
        toast.success('Marked as unpaid')
      } catch (err) {
        toast.error('Failed to update payment status')
        console.error(err)
      } finally {
        setIsUpdating(false)
      }
    },
    [mutate]
  )

  const handleSingleMarkAsClawback = useCallback(
    async (id: string) => {
      setIsUpdating(true)
      try {
        await createClawbacks([id], 'brokered')
        await updateBrokeredPaid([id], false, null)
        await mutate()
        toast.success('Marked as clawback')
      } catch (err) {
        toast.error('Failed to create clawback record')
        console.error(err)
      } finally {
        setIsUpdating(false)
      }
    },
    [mutate]
  )

  const handleTogglePaid = useCallback(
    async (row: BrokeredCommission) => {
      if (row.funder_paid_parkview) {
        await handleSingleMarkAsUnpaid(row.id)
      } else {
        await handleSingleMarkAsPaid(row.id)
      }
    },
    [handleSingleMarkAsPaid, handleSingleMarkAsUnpaid]
  )

  const handleUpdatePaidDate = useCallback(
    async (id: string, date: string) => {
      try {
        await updateBrokeredPaidDate(id, date)
        await mutate()
        toast.success('Date updated')
      } catch (err) {
        toast.error('Failed to update date')
        console.error(err)
        throw err
      }
    },
    [mutate]
  )

  // Calculate display range
  const startIndex =
    (currentPage - 1) * (pageSize === -1 ? filteredData.length : pageSize)
  const endIndex = Math.min(
    startIndex + (pageSize === -1 ? filteredData.length : pageSize),
    filteredData.length
  )

  if (loading) {
    return (
      <>
        <SiteHeader title="Brokered Commissions" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <SiteHeader title="Brokered Commissions" />
        <div className="p-6 text-red-600">{error}</div>
      </>
    )
  }

  return (
    <>
      <SiteHeader title="Brokered Commissions" />
      <div className="p-6 space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Brokered Commissions
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Payments from external lenders to Parkview
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  Showing {filteredData.length > 0 ? startIndex + 1 : 0} -{' '}
                  {endIndex} of {filteredData.length} deals
                </span>
              </div>

              {/* Search */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by deal, lender, or rep..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          paginatedData.length > 0 &&
                          selectedIds.size === paginatedData.length
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="min-w-[200px]">Deal Name</TableHead>
                    <TableHead className="min-w-[140px]">Lender</TableHead>
                    <TableHead className="min-w-[120px]">Rep</TableHead>
                    <TableHead className="min-w-[110px]">Funded Date</TableHead>
                    <TableHead className="min-w-[130px] text-right">
                      Funded Amount
                    </TableHead>
                    <TableHead className="min-w-[120px] text-right">
                      Total Rev
                    </TableHead>
                    <TableHead className="min-w-[100px] text-center">
                      Funder Paid
                    </TableHead>
                    <TableHead className="min-w-[120px]">Paid Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {searchQuery
                          ? 'No deals found matching your search.'
                          : 'No brokered deals found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((row, index) => (
                      <RowContextMenu
                        key={row.id}
                        isPaid={row.funder_paid_parkview === true}
                        onMarkAsPaid={() => handleSingleMarkAsPaid(row.id)}
                        onMarkAsUnpaid={() => handleSingleMarkAsUnpaid(row.id)}
                        onMarkAsClawback={() => handleSingleMarkAsClawback(row.id)}
                        disabled={isUpdating}
                      >
                        <TableRow
                          className={
                            index % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                          }
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(row.id)}
                              onCheckedChange={() => handleSelectRow(row.id)}
                              aria-label={`Select ${row.deal_name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="truncate max-w-[200px]">
                              {row.deal_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate max-w-[140px]">
                              {row.lender ?? '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate max-w-[120px]">
                              {row.rep ?? '—'}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(row.funded_date)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(row.funded_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(row.total_rev)}
                          </TableCell>
                          <TableCell className="text-center">
                            <PaymentStatusBadge
                              paid={row.funder_paid_parkview}
                              onToggle={() => handleTogglePaid(row)}
                              isLoading={isUpdating}
                            />
                          </TableCell>
                          <TableCell>
                            <EditableDateCell
                              value={row.funder_paid_date}
                              onSave={(date) =>
                                handleUpdatePaidDate(row.id, date)
                              }
                              disabled={isUpdating}
                            />
                          </TableCell>
                        </TableRow>
                      </RowContextMenu>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredData.length > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Rows per page:
                  </span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(val) => {
                      setPageSize(parseInt(val))
                      setCurrentPage(1)
                    }}
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

                {pageSize !== -1 && totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => p - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={currentPage === totalPages}
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
          selectedCount={selectedIds.size}
          onMarkAsPaid={handleMarkAsPaid}
          onMarkAsClawback={handleMarkAsClawback}
          onClear={handleClearSelection}
          isLoading={isUpdating}
        />
      </div>
    </>
  )
}
