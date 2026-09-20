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
  [ROUTES.platformUsers]: "Users",
  [ROUTES.agencies]: "Agencies",
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
  // Detail routes carry a dynamic segment, so they are matched by prefix.
  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith(`${ROUTES.agencies}/`) ? "Agencies" : "Platform")

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
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <PageBreadcrumb />
        </header>
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}