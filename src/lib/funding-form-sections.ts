import type { FundingSection } from './funding-form-types'

export const fundingSections: FundingSection[] = [
  {
    title: 'Deal Overview',
    description: 'Capture the core details that describe this submission.',
    fieldIds: [10, 29, 1, 27],
  },
  {
    title: 'Funding Source & Lead',
    description: 'Log who funded the deal and where the lead originated.',
    fieldIds: [4, 20, 22],
  },
  {
    title: 'Economics',
    description: 'Enter the financial structure of the deal.',
    fieldIds: [5, 6, 9, 8, 7],
  },
  {
    title: 'Revenue Team',
    description: 'Attribute credit to internal reps and ISO partners.',
    fieldIds: [18, 19],
  },
  {
    title: 'Merchant Contact',
    description: 'Ensure we can reach the merchant for follow ups.',
    fieldIds: [23, 24, 25],
  },
  {
    title: 'Attachments',
    description: 'Any statements or supporting documents belong here.',
    fieldIds: [11],
  },
  {
    title: 'Internal Notes',
    description: 'Fields used for reconciliation and auditing.',
    fieldIds: [13, 16],
  },
]
