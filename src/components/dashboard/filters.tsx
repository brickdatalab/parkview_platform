'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { DashboardFilters } from '@/lib/queries'

interface FiltersProps {
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  reps: string[]
  lenders: string[]
  isLoading?: boolean
}

export function Filters({ filters, onFiltersChange, reps, lenders, isLoading }: FiltersProps) {
  const handleQuarterChange = (quarter: string) => {
    onFiltersChange({
      ...filters,
      quarter: quarter as DashboardFilters['quarter']
    })
  }

  const handleRepChange = (rep: string) => {
    onFiltersChange({
      ...filters,
      rep: rep === 'all' ? null : rep
    })
  }

  const handleLenderChange = (lender: string) => {
    onFiltersChange({
      ...filters,
      lender: lender === 'all' ? null : lender
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Quarter Tabs */}
      <Tabs value={filters.quarter} onValueChange={handleQuarterChange}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            All
          </TabsTrigger>
          <TabsTrigger value="Q1" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Q1
          </TabsTrigger>
          <TabsTrigger value="Q2" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Q2
          </TabsTrigger>
          <TabsTrigger value="Q3" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Q3
          </TabsTrigger>
          <TabsTrigger value="Q4" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Q4
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Rep Filter */}
      <Select
        value={filters.rep || 'all'}
        onValueChange={handleRepChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="Select Rep" />
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
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="Select Lender" />
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
    </div>
  )
}
