# Supabase Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace mock login with real Supabase Auth so users must authenticate before accessing the dashboard.

**Architecture:** Use `@supabase/ssr` for cookie-based sessions compatible with Next.js App Router. Middleware protects `/dashboard/*` routes - unauthenticated users redirect to `/login`. Login page validates against Supabase `auth.users` table. Sidebar displays logged-in user's name from `user_metadata`.

**Tech Stack:** Next.js 16, @supabase/ssr, Supabase Auth, TypeScript

---

## Task 1: Install @supabase/ssr Package

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run:
```bash
npm install @supabase/ssr
```

**Step 2: Verify installation**

Run:
```bash
grep "@supabase/ssr" package.json
```

Expected: Shows `"@supabase/ssr": "^x.x.x"` in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @supabase/ssr for cookie-based auth"
```

---

## Task 2: Create Browser Supabase Client

**Files:**
- Create: `src/lib/supabase/client.ts`

**Step 1: Create the client file**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Verify file exists**

Run:
```bash
cat src/lib/supabase/client.ts
```

**Step 3: Commit**

```bash
git add src/lib/supabase/client.ts
git commit -m "feat: add browser Supabase client for client components"
```

---

## Task 3: Create Server Supabase Client

**Files:**
- Create: `src/lib/supabase/server.ts`

**Step 1: Create the server client file**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}
```

**Step 2: Verify file exists**

Run:
```bash
cat src/lib/supabase/server.ts
```

**Step 3: Commit**

```bash
git add src/lib/supabase/server.ts
git commit -m "feat: add server Supabase client for server components"
```

---

## Task 4: Create Middleware Supabase Client

**Files:**
- Create: `src/lib/supabase/middleware.ts`

**Step 1: Create the middleware client file**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from login page
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Step 2: Verify file exists**

Run:
```bash
cat src/lib/supabase/middleware.ts
```

**Step 3: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "feat: add middleware helper for route protection"
```

---

## Task 5: Create Next.js Middleware

**Files:**
- Create: `middleware.ts` (in project root, NOT in src/)

**Step 1: Create the middleware file**

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|branding|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 2: Verify file location (must be in project root)**

Run:
```bash
ls -la middleware.ts
```

Expected: File exists in `/Users/vitolo/Desktop/platform/parkview-dashboard/middleware.ts`

**Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add Next.js middleware for route protection"
```

---

## Task 6: Update Login Page with Real Supabase Auth

**Files:**
- Modify: `src/app/login/page.tsx`

**Step 1: Replace entire login page with Supabase auth**

```typescript
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
```

**Step 2: Verify the file compiles**

Check dev server for errors (should auto-reload).

**Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: replace mock login with real Supabase auth"
```

---

## Task 7: Update Dashboard Layout to Fetch User

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

**Step 1: Read current layout file**

Run:
```bash
cat src/app/dashboard/layout.tsx
```

**Step 2: Update layout to fetch and pass user data**

```typescript
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarState !== "false"

  // Fetch current user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Extract user info for sidebar
  const userInfo = user ? {
    email: user.email ?? '',
    firstName: user.user_metadata?.first_name ?? '',
    lastName: user.user_metadata?.last_name ?? '',
  } : null

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={userInfo} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: fetch authenticated user in dashboard layout"
```

---

## Task 8: Update Sidebar to Display User and Handle Logout

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Update sidebar with user prop and logout functionality**

Replace the entire file with:

```typescript
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  DollarSign,
  MessageSquare,
  LogOut,
  PlusCircle,
  Building2,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"

const navActions = [
  { title: "Submit New Funded", href: "/dashboard/submit", icon: PlusCircle },
  { title: "Chat", href: "/dashboard/chat", icon: MessageSquare },
]

const navKnowledge = [
  { title: "Funded Deals", href: "/dashboard", icon: BarChart3 },
  { title: "Commissions", href: "/dashboard/commissions", icon: DollarSign },
]

interface UserInfo {
  email: string
  firstName: string
  lastName: string
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: UserInfo | null
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Get display name and initial
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email ?? 'User'

  const initial = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? 'U'

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Parkview</span>
                  <span className="truncate text-xs text-muted-foreground">Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navActions.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Knowledge</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navKnowledge.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-white text-primary font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">Admin</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
```

**Step 2: Verify the file compiles**

Check dev server for errors.

**Step 3: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: display logged-in user name and add logout"
```

---

## Task 9: Cleanup - Remove Preview and Old Files

**Files:**
- Delete: `src/app/login-preview/page.tsx`
- Delete: `src/lib/supabase.ts` (old singleton client)

**Step 1: Remove login preview**

Run:
```bash
rm -rf src/app/login-preview
```

**Step 2: Remove old supabase client**

Run:
```bash
rm src/lib/supabase.ts
```

**Step 3: Update queries.ts to use new client**

In `src/lib/queries.ts`, replace:
```typescript
import { getSupabase } from "@/lib/supabase"
```

With:
```typescript
import { createClient } from "@/lib/supabase/client"
```

And replace all `getSupabase()` calls with `createClient()`.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: cleanup old auth files and update imports"
```

---

## Task 10: Test Full Login Flow

**Step 1: Restart dev server**

Run:
```bash
# Kill existing and restart
PORT=3456 npm run dev
```

**Step 2: Test unauthenticated access**

1. Open http://localhost:3456/dashboard
2. Expected: Automatically redirected to /login

**Step 3: Test login with valid credentials**

1. Go to http://localhost:3456/login
2. Enter: `lloyd@christmas.com` and the password you set in Supabase
3. Click Sign In
4. Expected: Redirected to /dashboard, sidebar shows "Lloyd Christmas"

**Step 4: Test logout**

1. Click user name in sidebar footer
2. Click "Log out"
3. Expected: Redirected to /login

**Step 5: Test with second user**

1. Login with `vvitolo@parkviewadvance.com`
2. Expected: Sidebar shows "Vincent Vitolo"

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install @supabase/ssr | package.json |
| 2 | Browser client | src/lib/supabase/client.ts |
| 3 | Server client | src/lib/supabase/server.ts |
| 4 | Middleware helper | src/lib/supabase/middleware.ts |
| 5 | Route protection | middleware.ts |
| 6 | Login page | src/app/login/page.tsx |
| 7 | Dashboard layout | src/app/dashboard/layout.tsx |
| 8 | Sidebar update | src/components/layout/app-sidebar.tsx |
| 9 | Cleanup | Remove old files, update imports |
| 10 | Test | Verify full flow works |

**Total new files:** 4
**Total modified files:** 4
**Total deleted files:** 2
