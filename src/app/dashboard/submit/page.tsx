'use client'

import { SiteHeader } from '@/components/layout/site-header'

export default function SubmitNewFundedPage() {
  return (
    <>
      <SiteHeader title="Submit New Funded" />
      <div className="flex flex-1 flex-col items-center bg-white overflow-hidden">
        <iframe
          src="https://notion-form-magic.lovable.app/embed"
          className="w-full max-w-5xl h-full"
          style={{ border: 'none' }}
          title="Submit New Funded Form"
        />
      </div>
    </>
  )
}
