import fs from 'fs'
import path from 'path'

import type { FundingField } from './funding-form-types'

const allowedTypes = new Set([
  'checkbox',
  'date',
  'email',
  'fileupload',
  'number',
  'phone',
  'radio',
  'select',
  'text',
])

type GravityForm = {
  [key: string]: {
    fields: Array<{
      id: number
      label: string
      type: string
      isRequired?: boolean
      placeholder?: string
      description?: string
      choices?:
        | ''
        | Array<{
            text: string
            value?: string
            isSelected?: boolean
          }>
    }>
  }
}

const gravityFormPath = path.resolve(
  process.cwd(),
  '../form-fills/gravity_exported/gravityforms-export-funding-form.json',
)

export function loadFundingFields(): FundingField[] {
  const raw = fs.readFileSync(gravityFormPath, 'utf8')
  const parsed = JSON.parse(raw) as GravityForm
  const form = parsed['0']

  if (!form) {
    throw new Error('Unable to find funding form definition in export file')
  }

  return form.fields
    .filter((field) => allowedTypes.has(field.type))
    .map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type as FundingField['type'],
      required: Boolean(field.isRequired),
      placeholder: field.placeholder || '',
      description: field.description || '',
      choices: Array.isArray(field.choices)
        ? field.choices.map((choice) => ({
            label: choice.text,
            value: choice.value || choice.text,
          }))
        : undefined,
      defaultValue: deriveDefaultValue(field.type, field.choices),
    }))
}

function deriveDefaultValue(
  type: string,
  choices: GravityForm['0']['fields'][number]['choices'],
): FundingField['defaultValue'] {
  if (!Array.isArray(choices)) return undefined
  const selected = choices.find((choice) => choice.isSelected)

  if (!selected) return undefined

  if (type === 'checkbox') {
    return Boolean(selected)
  }

  return selected.value || selected.text
}
