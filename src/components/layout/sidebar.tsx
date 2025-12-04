'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  DollarSign,
  LogOut,
  Bird,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const navigation = [
  { name: 'Funded Deals', href: '/dashboard', icon: BarChart3 },
  { name: 'Commissions', href: '/dashboard/commissions', icon: DollarSign },
  { name: 'Chat with Master Funder', href: '/dashboard/chat', icon: MessageSquare },
]

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed'

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored !== null) {
      setIsCollapsed(stored === 'true')
    }
    setMounted(true)
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <aside className="flex h-screen w-64 flex-col bg-[#1a3a52]">
        <div className="flex h-16 items-center border-b border-[#2d5a7b] px-6" />
      </aside>
    )
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-[#1a3a52] transition-all duration-300 ease-in-out relative",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#1a3a52] border-2 border-[#2d5a7b] text-white/70 hover:text-white hover:bg-[#2d5a7b] transition-colors"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Logo / Brand */}
      <div className={cn(
        "flex h-16 items-center border-b border-[#2d5a7b] transition-all duration-300",
        isCollapsed ? "px-3 justify-center" : "px-6"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 flex-shrink-0">
            <Bird className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-semibold leading-none text-white whitespace-nowrap">
                Database
              </h1>
              <p className="mt-0.5 text-xs text-white/60">Birdseye</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1 py-4 transition-all duration-300",
        isCollapsed ? "px-2" : "px-3"
      )}>
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className={cn(
        "border-t border-[#2d5a7b] transition-all duration-300",
        isCollapsed ? "p-2" : "p-4"
      )}>
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "gap-3"
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white flex-shrink-0">
            AF
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  Alex Figueroa
                </p>
                <p className="truncate text-xs text-white/60">Admin</p>
              </div>
              <button className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
                <LogOut className="h-4 w-4 text-white/70" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
