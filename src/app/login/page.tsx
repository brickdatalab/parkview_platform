'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

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

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Mock auth: Accept lloyd@christmas.com with any password
    if (email.toLowerCase() === 'lloyd@christmas.com') {
      localStorage.setItem('parkview_auth', JSON.stringify({
        email,
        authenticated: true,
        timestamp: Date.now()
      }))
      router.push('/dashboard')
    } else {
      setError('Invalid credentials')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <Card className="w-full max-w-[400px] border-0 shadow-lg bg-white">
        <CardHeader className="pb-2 pt-8">
          <div className="text-center">
            <h1
              className="text-xl font-semibold tracking-wider text-[#1a3a52]"
              style={{ letterSpacing: '0.2em' }}
            >
              PARKVIEW ADVANCE
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
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-gray-200 focus-visible:border-[#1a3a52] focus-visible:ring-[#1a3a52]/20"
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
                className="h-11 border-gray-200 focus-visible:border-[#1a3a52] focus-visible:ring-[#1a3a52]/20"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#1a3a52] hover:bg-[#152e42] text-white font-medium transition-colors duration-200"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
