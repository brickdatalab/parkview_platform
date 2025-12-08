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
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

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
