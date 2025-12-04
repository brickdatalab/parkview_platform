'use client'

import { SiteHeader } from '@/components/layout/site-header'

export default function SubmitNewFundedPage() {
  return (
    <>
      <SiteHeader title="Submit New Funded" />
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-medium text-muted-foreground">Coming Soon</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This page will allow submitting new funded deals.
          </p>
        </div>
      </div>
    </>
  )
}
