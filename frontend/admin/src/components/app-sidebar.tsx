import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { ROUTES } from "@/app/router/route-paths"
import {
  BuildingIcon,
  GalleryVerticalEndIcon,
  LayoutDashboardIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react"

const platformNav: NavItem[] = [
  {
    title: "Overview",
    url: ROUTES.overview,
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "Users",
    url: ROUTES.platformUsers,
    icon: <UsersIcon />,
    isActive: true,
    items: [
      {
        title: "Platform Users",
        url: ROUTES.platformUsers,
      },
    ],
  },
  {
    title: "Agencies",
    url: ROUTES.agencies,
    icon: <BuildingIcon />,
  },
  {
    title: "Roles & Permissions",
    url: ROUTES.rolesAndPermissions,
    icon: <ShieldIcon />,
  },
]

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string }
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          <div className="grid text-left text-sm leading-tight">
            <span className="truncate font-semibold">Platform Admin</span>
            <span className="truncate text-xs text-muted-foreground">
              Travel SaaS
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={platformNav} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}