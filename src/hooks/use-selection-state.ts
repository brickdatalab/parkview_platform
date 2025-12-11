'use client'

import { useState, useCallback, useMemo } from 'react'

export interface UseSelectionStateReturn {
  selectedIds: Set<string>
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  selectedCount: number
  isAllSelected: (ids: string[]) => boolean
  isIndeterminate: (ids: string[]) => boolean
}

export function useSelectionState(): UseSelectionStateReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  const toggle = useCallback((id: string) => {
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

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id))
      if (allSelected) {
        // Deselect all if all are selected
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      } else {
        // Select all
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds])

  const isAllSelected = useCallback(
    (ids: string[]) => ids.length > 0 && ids.every((id) => selectedIds.has(id)),
    [selectedIds]
  )

  const isIndeterminate = useCallback(
    (ids: string[]) => {
      const selectedInList = ids.filter((id) => selectedIds.has(id))
      return selectedInList.length > 0 && selectedInList.length < ids.length
    },
    [selectedIds]
  )

  return {
    selectedIds,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    selectedCount,
    isAllSelected,
    isIndeterminate,
  }
}
