'use client'

import { useState, useEffect } from 'react'
import { Bookmark, ChevronDown, Plus, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { TableState, SavedView } from '@/types/table'
import {
  loadSavedViews,
  saveSavedViews,
  createSavedView,
  deleteSavedView,
  resetToDefault,
} from '@/lib/table-utils'

interface SavedViewsProps {
  currentState: TableState
  onLoadView: (state: TableState) => void
  onReset: () => void
}

export function SavedViews({
  currentState,
  onLoadView,
  onReset,
}: SavedViewsProps) {
  const [views, setViews] = useState<SavedView[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')

  // Load saved views on mount
  useEffect(() => {
    setViews(loadSavedViews())
  }, [])

  const handleSaveView = () => {
    if (!newViewName.trim()) return

    const newView = createSavedView(newViewName.trim(), currentState)
    const updatedViews = [...views, newView]
    setViews(updatedViews)
    saveSavedViews(updatedViews)

    setNewViewName('')
    setSaveDialogOpen(false)
  }

  const handleDeleteView = (viewId: string) => {
    const updatedViews = deleteSavedView(views, viewId)
    setViews(updatedViews)
    saveSavedViews(updatedViews)
  }

  const handleLoadView = (view: SavedView) => {
    onLoadView(view.state)
  }

  return (
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
                    size="icon-sm"
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

          <DropdownMenuItem onClick={onReset}>
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
  )
}
