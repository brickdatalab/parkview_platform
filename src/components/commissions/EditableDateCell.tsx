'use client'

import { useState, useRef, useEffect } from 'react'
import { format, parseISO, isValid } from 'date-fns'

interface EditableDateCellProps {
  value: string | null
  onSave: (date: string) => Promise<void>
  disabled?: boolean
}

export function EditableDateCell({
  value,
  onSave,
  disabled = false,
}: EditableDateCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Format date for display
  const displayValue = value
    ? (() => {
        const date = parseISO(value)
        return isValid(date) ? format(date, 'MMM dd, yyyy') : value
      })()
    : '—'

  // Handle double-click to enter edit mode
  const handleDoubleClick = () => {
    if (disabled || !value) return
    setEditValue(value)
    setIsEditing(true)
  }

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle save
  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch {
      // Keep editing mode open on error
    } finally {
      setIsSaving(false)
    }
  }

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className="w-28 px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    )
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className={value && !disabled ? 'cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded' : ''}
      title={value && !disabled ? 'Double-click to edit' : undefined}
    >
      {displayValue}
    </span>
  )
}
