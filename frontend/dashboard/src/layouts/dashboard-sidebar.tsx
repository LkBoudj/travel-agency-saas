import {
  Building,
  CalendarCheck,
  LayoutDashboard,
  Plane,
  Settings,
  UserCog,
  Users,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { cn } from "@/lib/utils"
import { useSidebarStore } from "@/stores/sidebar.store"

/**
 * Compact operational sidebar. 240px, 32px rows, 16px icons, 13px labels.
 * The active item is a neutral white surface — the accent stays reserved
 * for links, focus, and semantic status on the content side.
 *
 * Sits on the inline-start edge: left in LTR, right in RTL. The slide-in
 * transform is mirrored with `rtl:` variants.
 */
export function DashboardSidebar() {
  const isOpen = useSidebarStore((state) => state.isOpen)
  const close = useSidebarStore((state) => state.close)
  const { t } = useTranslation()

  const navItems = [
    { to: ROUTES.dashboard, label: t("nav.overview"), icon: LayoutDashboard },
    { to: ROUTES.trips, label: t("nav.trips"), icon: Plane },
    { to: ROUTES.bookings, label: t("nav.bookings"), icon: CalendarCheck },
    { to: ROUTES.customers, label: t("nav.customers"), icon: Users },
    { to: ROUTES.agency, label: t("nav.agencyProfile"), icon: Building },
    { to: ROUTES.team, label: t("nav.team"), icon: UserCog },
    { to: ROUTES.settings, label: t("nav.settings"), icon: Settings },
  ]

  return (
    <aside
      className={cn(
        "fixed inset-y-0 start-0 z-30 flex w-60 flex-col border-e border-sidebar-border bg-sidebar transition-transform duration-200 ease-in-out",
        isOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full rtl:max-md:translate-x-full",
      )}
    >
      <nav
        className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-14"
        aria-label={t("sidebar.navAriaLabel")}
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={close}
            className={({ isActive }) =>
              cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-card text-foreground dark:bg-white/10"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}