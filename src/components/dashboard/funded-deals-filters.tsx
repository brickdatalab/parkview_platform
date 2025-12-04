'use client'

import { Search, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  type FundedDealsFilters,
  type SortField,
  getAllMonths
} from '@/lib/queries'

interface FiltersProps {
  filters: FundedDealsFilters
  onFiltersChange: (filters: FundedDealsFilters) => void
  reps: string[]
  lenders: string[]
  dealTypes: string[]
  years: number[]
  isLoading?: boolean
}

const sortOptions: { value: SortField; label: string }[] = [
  { value: 'funded_date', label: 'Funded Date' },
  { value: 'funded_amount', label: 'Amount' },
  { value: 'rep', label: 'Rep' },
  { value: 'lender', label: 'Lender' },
  { value: 'commission', label: 'Commission' },
  { value: 'deal_name', label: 'Deal Name' },
]

export function FundedDealsFilters({
  filters,
  onFiltersChange,
  reps,
  lenders,
  dealTypes,
  years,
  isLoading
}: FiltersProps) {
  const months = getAllMonths()

  const handleMonthChange = (value: string) => {
    onFiltersChange({
      ...filters,
      month: value === 'all' ? null : parseInt(value, 10)
    })
  }

  const handleYearChange = (value: string) => {
    onFiltersChange({
      ...filters,
      year: parseInt(value, 10)
    })
  }

  const handleRepChange = (value: string) => {
    onFiltersChange({
      ...filters,
      rep: value === 'all' ? null : value
    })
  }

  const handleLenderChange = (value: string) => {
    onFiltersChange({
      ...filters,
      lender: value === 'all' ? null : value
    })
  }

  const handleDealTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      dealType: value === 'all' ? null : value
    })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      search: e.target.value
    })
  }

  const handleSortByChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as SortField
    })
  }

  const handleSortDirectionToggle = () => {
    onFiltersChange({
      ...filters,
      sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc'
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      month: null,
      year: new Date().getFullYear(),
      rep: null,
      lender: null,
      dealType: null,
      search: '',
      sortBy: 'funded_date',
      sortDirection: 'desc'
    })
  }

  const hasActiveFilters =
    filters.month !== null ||
    filters.rep !== null ||
    filters.lender !== null ||
    filters.dealType !== null ||
    filters.search !== ''

  return (
    <div className="space-y-4">
      {/* Row 1: Time filters and search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month Selector */}
        <Select
          value={filters.month?.toString() || 'all'}
          onValueChange={handleMonthChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year Selector */}
        <Select
          value={filters.year.toString()}
          onValueChange={handleYearChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[100px] bg-white">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Rep Filter */}
        <Select
          value={filters.rep || 'all'}
          onValueChange={handleRepChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Rep" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reps</SelectItem>
            {reps.map((rep) => (
              <SelectItem key={rep} value={rep}>
                {rep}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Lender Filter */}
        <Select
          value={filters.lender || 'all'}
          onValueChange={handleLenderChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Lender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lenders</SelectItem>
            {lenders.map((lender) => (
              <SelectItem key={lender} value={lender}>
                {lender}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Deal Type Filter */}
        {dealTypes.length > 0 && (
          <Select
            value={filters.dealType || 'all'}
            onValueChange={handleDealTypeChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue placeholder="Deal Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {dealTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deal name..."
            value={filters.search}
            onChange={handleSearchChange}
            className="pl-9 bg-white"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Row 2: Sort controls and clear */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort By */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select
            value={filters.sortBy}
            onValueChange={handleSortByChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Direction Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleSortDirectionToggle}
            disabled={isLoading}
            className="bg-white"
            title={filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          >
            {filters.sortDirection === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
