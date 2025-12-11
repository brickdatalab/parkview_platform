'use client'

import { cn } from '@/lib/utils'
import { Building2, Users, Briefcase, Clock, Calendar, CreditCard } from 'lucide-react'
import type { QuickFilters as QuickFiltersType } from '@/types/table'

interface QuickFilterButtonProps {
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
}

function QuickFilterButton({ label, icon, isActive, onClick }: QuickFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
        'border hover:shadow-sm',
        isActive
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
      )}
    >
      <span className={cn('h-3.5 w-3.5', isActive ? 'opacity-100' : 'opacity-60')}>
        {icon}
      </span>
      {label}
    </button>
  )
}

interface QuickFiltersProps {
  filters: QuickFiltersType
  onChange: (filters: QuickFiltersType) => void
}

export function QuickFilters({ filters, onChange }: QuickFiltersProps) {
  const toggleFilter = (key: keyof QuickFiltersType) => {
    onChange({
      ...filters,
      [key]: !filters[key],
    })
  }

  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium mr-1">Quick Filters:</span>

      <QuickFilterButton
        label="ISO Only"
        icon={<Users className="h-3.5 w-3.5" />}
        isActive={filters.isoOnly}
        onClick={() => toggleFilter('isoOnly')}
      />

      <QuickFilterButton
        label="In-House Only"
        icon={<Building2 className="h-3.5 w-3.5" />}
        isActive={filters.inhouseOnly}
        onClick={() => toggleFilter('inhouseOnly')}
      />

      <QuickFilterButton
        label="New Business"
        icon={<Briefcase className="h-3.5 w-3.5" />}
        isActive={filters.newBusinessOnly}
        onClick={() => toggleFilter('newBusinessOnly')}
      />

      <QuickFilterButton
        label="Pending Payment"
        icon={<Clock className="h-3.5 w-3.5" />}
        isActive={filters.pendingPayment}
        onClick={() => toggleFilter('pendingPayment')}
      />

      <QuickFilterButton
        label="This Month"
        icon={<Calendar className="h-3.5 w-3.5" />}
        isActive={filters.thisMonth}
        onClick={() => toggleFilter('thisMonth')}
      />

      <QuickFilterButton
        label="LOC Only"
        icon={<CreditCard className="h-3.5 w-3.5" />}
        isActive={filters.locOnly}
        onClick={() => toggleFilter('locOnly')}
      />

      {activeCount > 0 && (
        <button
          onClick={() => onChange({
            isoOnly: false,
            inhouseOnly: false,
            newBusinessOnly: false,
            pendingPayment: false,
            thisMonth: false,
            locOnly: false,
          })}
          className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
