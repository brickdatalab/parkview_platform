'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
/* eslint-disable @next/next/no-img-element */
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid email or password')
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-[420px] border-0 shadow-xl bg-white">
        <CardHeader className="pb-0 pt-8">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/branding/parkview_logo-medium.png"
              alt="Parkview Advance"
              className="w-20 h-20"
            />
            <h1 className="text-[1.65rem] font-semibold text-primary">
              Parkview Advance Platform
            </h1>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1a3a52] text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@parkviewadvance.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-slate-200 focus-visible:border-[#1a3a52] focus-visible:ring-[#1a3a52]/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1a3a52] text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 border-slate-200 focus-visible:border-[#1a3a52] focus-visible:ring-[#1a3a52]/20"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 text-center bg-red-50 py-2 px-3 rounded-md">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#1a3a52] text-white font-medium transition-all duration-200 border-2 border-[#1a3a52] hover:bg-white hover:text-[#1a3a52]"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
