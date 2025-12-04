import type { Metadata } from 'next'

import { FundingForm } from '@/components/funding/funding-form'
import { loadFundingFields } from '@/lib/funding-form-loader'
import { fundingSections } from '@/lib/funding-form-sections'

export const metadata: Metadata = {
  title: 'Funding Form',
}

export default function FundingFormPage() {
  const fields = loadFundingFields()

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <FundingForm fields={fields} sections={fundingSections} />
      </div>
    </div>
  )
}
