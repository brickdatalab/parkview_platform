'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check auth state from localStorage
    const authData = localStorage.getItem('parkview_auth')

    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        if (parsed.authenticated) {
          router.replace('/dashboard')
          return
        }
      } catch {
        // Invalid auth data, clear it
        localStorage.removeItem('parkview_auth')
      }
    }

    // Not authenticated, redirect to login
    router.replace('/login')
  }, [router])

  // Show minimal loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-[#1a3a52] text-sm font-medium tracking-wider">
          Loading...
        </div>
      </div>
    )
  }

  return null
}
