export type FundingFieldType =
  | 'checkbox'
  | 'date'
  | 'email'
  | 'fileupload'
  | 'number'
  | 'phone'
  | 'radio'
  | 'select'
  | 'text'

export type FundingFieldOption = {
  label: string
  value: string
}

export type FundingField = {
  id: number
  label: string
  type: FundingFieldType
  required: boolean
  placeholder?: string
  description?: string
  choices?: FundingFieldOption[]
  defaultValue?: string | boolean | string[]
}

export type FundingSection = {
  title: string
  description?: string
  fieldIds: number[]
}
