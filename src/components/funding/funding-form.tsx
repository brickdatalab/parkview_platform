'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FundingField, FundingSection } from '@/lib/funding-form-types'

type FieldValue = string | string[] | boolean | undefined

type FundingFormProps = {
  fields: FundingField[]
  sections: FundingSection[]
}

export function FundingForm({ fields, sections }: FundingFormProps) {
  const fieldMap = useMemo(() => {
    return new Map(fields.map((field) => [field.id, field]))
  }, [fields])

  const defaults = useMemo(() => {
    const next: Record<number, FieldValue> = {}
    fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        next[field.id] = field.defaultValue
      }
    })
    return next
  }, [fields])

  const [values, setValues] = useState<Record<number, FieldValue>>(defaults)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    setValues(defaults)
  }, [defaults])

  const handleValueChange = (id: number, value: FieldValue) => {
    setValues((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitted(true)
  }

  const handleReset = () => {
    setValues(defaults)
    setIsSubmitted(false)
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Funding Submission
        </h1>
        <p className="text-sm text-slate-600">
          This layout mirrors the Gravity Form export but optimizes the flow for
          internal desktop use. All data stays local; submitting simply confirms
          receipt for review.
        </p>
        {isSubmitted && (
          <Alert className="border-green-600/60 bg-green-50 text-green-900">
            <AlertTitle>Received</AlertTitle>
            <AlertDescription>
              Thanks for submitting. The information has been captured locally
              for your session; you can still adjust values and resubmit if you
              need to make changes.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {section.fieldIds.map((fieldId) => {
                const field = fieldMap.get(fieldId)
                if (!field) return null

                return (
                  <FieldControl
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    onChange={(value) => handleValueChange(field.id, value)}
                  />
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="min-w-[160px]">
          Submit for Review
        </Button>
        <Button type="button" variant="ghost" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </form>
  )
}

type FieldControlProps = {
  field: FundingField
  value: FieldValue
  onChange: (value: FieldValue) => void
}

function FieldControl({ field, value, onChange }: FieldControlProps) {
  const fieldId = `field-${field.id}`
  const helperText = field.description || field.placeholder

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={fieldId} className="text-sm font-semibold">
        {field.label}
        {field.required && <span className="text-rose-600">*</span>}
      </Label>
      {renderFieldInput({ field, value, onChange, fieldId })}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}

type RenderFieldInputArgs = {
  field: FundingField
  value: FieldValue
  onChange: (value: FieldValue) => void
  fieldId: string
}

function renderFieldInput({ field, value, onChange, fieldId }: RenderFieldInputArgs) {
  switch (field.type) {
    case 'select': {
      return (
        <Select
          value={typeof value === 'string' ? value : undefined}
          onValueChange={(val) => onChange(val)}
        >
          <SelectTrigger
            className="w-full"
            id={fieldId}
            aria-required={field.required}
          >
            <SelectValue placeholder={field.placeholder || 'Select an option'} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {field.choices?.map((choice) => (
              <SelectItem key={choice.value} value={choice.value}>
                {choice.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    case 'radio': {
      return (
        <RadioGroup
          className="flex flex-wrap gap-3"
          value={typeof value === 'string' ? value : undefined}
          onValueChange={(val) => onChange(val)}
          aria-required={field.required}
        >
          {field.choices?.map((choice) => {
            const choiceId = `${fieldId}-${choice.value}`
            return (
              <label
                key={choice.value}
                htmlFor={choiceId}
                className="border-input hover:bg-accent/30 flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-xs"
              >
                <RadioGroupItem id={choiceId} value={choice.value} />
                <span>{choice.label}</span>
              </label>
            )
          })}
        </RadioGroup>
      )
    }
    case 'checkbox': {
      const checked = Boolean(value)
      const choice = field.choices?.[0]
      return (
        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
          <Checkbox
            id={fieldId}
            checked={checked}
            onCheckedChange={(next) => onChange(Boolean(next))}
            aria-required={field.required}
          />
          <Label htmlFor={fieldId} className="text-sm font-normal">
            {choice?.label || 'Yes'}
          </Label>
        </div>
      )
    }
    case 'fileupload': {
      return (
        <div className="space-y-2">
          <Input
            id={fieldId}
            type="file"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              onChange(files.map((file) => file.name))
            }}
            aria-required={field.required}
          />
          {Array.isArray(value) && value.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Attached: {value.join(', ')}
            </p>
          )}
        </div>
      )
    }
    default: {
      return (
        <Input
          id={fieldId}
          type={mapInputType(field.type)}
          inputMode={mapInputMode(field.type)}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        />
      )
    }
  }
}

function mapInputType(type: FundingField['type']) {
  switch (type) {
    case 'email':
      return 'email'
    case 'phone':
      return 'tel'
    case 'number':
      return 'number'
    case 'date':
      return 'date'
    default:
      return 'text'
  }
}

function mapInputMode(type: FundingField['type']) {
  switch (type) {
    case 'number':
      return 'decimal'
    case 'phone':
      return 'tel'
    default:
      return undefined
  }
}
