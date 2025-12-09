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
  ISOCommissionTableState,
  ISOCommissionGroupByOption,
  ISOCommissionColumnId,
  ISOCommissionSavedView,
} from '@/types/table'
import {
  ISO_COMMISSION_GROUP_BY_OPTIONS,
  ISO_COMMISSION_COLUMNS,
  DEFAULT_ISO_COMMISSION_VISIBLE_COLUMNS,
} from '@/types/table'
import {
  hasISOCommissionActiveFilters,
  getISOCommissionActiveFilterCount,
  resetISOCommissionToDefault,
  loadISOCommissionSavedViews,
  saveISOCommissionSavedViews,
  createISOCommissionSavedView,
} from '@/lib/commission-table-utils'

interface ISOCommissionToolbarProps {
  state: ISOCommissionTableState
  onStateChange: (state: ISOCommissionTableState) => void
  isLoading?: boolean
}

export function ISOCommissionToolbar({
  state,
  onStateChange,
  isLoading,
}: ISOCommissionToolbarProps) {
  const activeFilterCount = getISOCommissionActiveFilterCount(state)
  const hasFilters = hasISOCommissionActiveFilters(state)

  // Saved views state
  const [views, setViews] = useState<ISOCommissionSavedView[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')

  // Load saved views on mount
  useEffect(() => {
    setViews(loadISOCommissionSavedViews())
  }, [])

  const handleSearchChange = (value: string) => {
    onStateChange({
      ...state,
      searchQuery: value,
      currentPage: 1,
    })
  }

  const handleGroupByChange = (value: ISOCommissionGroupByOption) => {
    onStateChange({
      ...state,
      groupBy: value,
      currentPage: 1,
    })
  }

  const handleVisibilityChange = (columns: ISOCommissionColumnId[]) => {
    onStateChange({
      ...state,
      visibleColumns: columns,
    })
  }

  const handleReset = () => {
    onStateChange(resetISOCommissionToDefault())
  }

  const handleClearFilters = () => {
    onStateChange({
      ...state,
      filters: [],
      dateRange: { startDate: null, endDate: null },
      searchQuery: '',
      currentPage: 1,
    })
  }

  const handleLoadView = (view: ISOCommissionSavedView) => {
    onStateChange({
      ...view.state,
      currentPage: 1,
    })
  }

  const handleSaveView = () => {
    if (!newViewName.trim()) return

    const newView = createISOCommissionSavedView(newViewName.trim(), state)
    const updatedViews = [...views, newView]
    setViews(updatedViews)
    saveISOCommissionSavedViews(updatedViews)

    setNewViewName('')
    setSaveDialogOpen(false)
  }

  const handleDeleteView = (viewId: string) => {
    const updatedViews = views.filter(v => v.id !== viewId)
    setViews(updatedViews)
    saveISOCommissionSavedViews(updatedViews)
  }

  const handleToggleColumn = (columnId: ISOCommissionColumnId) => {
    if (state.visibleColumns.includes(columnId)) {
      if (state.visibleColumns.length > 1) {
        handleVisibilityChange(state.visibleColumns.filter(c => c !== columnId))
      }
    } else {
      handleVisibilityChange([...state.visibleColumns, columnId])
    }
  }

  const handleShowAllColumns = () => {
    handleVisibilityChange(ISO_COMMISSION_COLUMNS.map(c => c.id))
  }

  const handleResetColumns = () => {
    handleVisibilityChange([...DEFAULT_ISO_COMMISSION_VISIBLE_COLUMNS])
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

        {/* Group By */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Select
            value={state.groupBy}
            onValueChange={(value) => handleGroupByChange(value as ISOCommissionGroupByOption)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[180px] h-8 bg-white">
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              {ISO_COMMISSION_GROUP_BY_OPTIONS.map((option) => (
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white">
                <Columns3 className="h-4 w-4" />
                Columns
                <span className="rounded bg-muted px-1.5 text-xs font-medium">
                  {state.visibleColumns.length}/{ISO_COMMISSION_COLUMNS.length}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="border-b p-3">
                <span className="text-sm font-medium">Toggle Columns</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                <div className="space-y-1">
                  {ISO_COMMISSION_COLUMNS.map((column) => (
                    <label
                      key={column.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={state.visibleColumns.includes(column.id)}
                        onCheckedChange={() => handleToggleColumn(column.id)}
                        disabled={state.visibleColumns.length === 1 && state.visibleColumns.includes(column.id)}
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
                  onClick={handleShowAllColumns}
                >
                  Show All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleResetColumns}
                >
                  Reset to Default
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Saved Views */}
          <div className="flex items-center gap-2">
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
      </div>
    </div>
  )
}
