import { Outlet, useLocation, useOutletContext } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ROUTES } from "@/app/router/route-paths"
import type { AuthUser } from "@/features/auth/types/auth.types"
import type { NavUserProps } from "@/components/nav-user"

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.overview]: "Overview",
  [ROUTES.users]: "Users",
  [ROUTES.rolesAndPermissions]: "Roles & Permissions",
}

function toMenuUser(user: AuthUser): NavUserProps["user"] {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ")
  return {
    name: name.trim() || user.email,
    email: user.email,
  }
}

function PageBreadcrumb() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? "Platform"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function DashboardLayout() {
  const { user } = useOutletContext<{ user: AuthUser }>()

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar user={toMenuUser(user)} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <PageBreadcrumb />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}