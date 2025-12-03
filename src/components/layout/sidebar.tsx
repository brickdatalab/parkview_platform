'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BarChart3, DollarSign, Settings, LogOut, TrendingUp } from 'lucide-react'

const navigation = [
  { name: 'Reports', href: '/dashboard', icon: BarChart3 },
  { name: 'Commissions', href: '/dashboard/commissions', icon: DollarSign },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col bg-[#1a3a52]">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center border-b border-[#2d5a7b] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none text-white">
              Parkview
            </h1>
            <p className="mt-0.5 text-xs text-white/60">Advance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        <div className="my-4 h-px bg-[#2d5a7b]" />

        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </nav>

      {/* User section */}
      <div className="border-t border-[#2d5a7b] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
            AF
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              Alex Figueroa
            </p>
            <p className="truncate text-xs text-white/60">Admin</p>
          </div>
          <button className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
            <LogOut className="h-4 w-4 text-white/70" />
          </button>
        </div>
      </div>
    </aside>
  )
}
