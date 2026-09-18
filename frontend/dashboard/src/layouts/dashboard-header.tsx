import { Menu, Plane } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { AGENCY_SECTIONS, agencyPath } from "@/features/agency-context/lib/agency-paths"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { Button } from "@/components/ui/button"
import { useSidebarStore } from "@/stores/sidebar.store"
import { UserMenu } from "./user-menu"

/**
 * Full-width app chrome. Dark, compact (48px), and product-agnostic: brand
 * on the left, account on the right. The sidebar sits below this bar, so the
 * chrome reads as one stable horizontal strip for the whole workspace.
 */
export function DashboardHeader() {
  const isOpen = useSidebarStore((state) => state.isOpen)
  const toggle = useSidebarStore((state) => state.toggle)
  const { t } = useTranslation()
  const { agency } = useAgencyContext()

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 bg-foreground px-3 text-background md:px-4 dark:bg-background dark:text-foreground">
      <Button
        variant="ghost"
        size="icon"
        className="text-background hover:bg-white/10 hover:text-white aria-expanded:bg-white/10 aria-expanded:text-white md:hidden dark:text-foreground dark:hover:bg-white/10 dark:hover:text-foreground dark:aria-expanded:bg-white/10 dark:aria-expanded:text-foreground"
        onClick={toggle}
        aria-label={t("header.ariaToggleSidebar")}
        aria-expanded={isOpen}
      >
        <Menu className="size-5" />
      </Button>
      <Link
        to={agencyPath(agency.code, AGENCY_SECTIONS.dashboard)}
        className="flex items-center gap-2 text-sm font-semibold tracking-tight"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-white/10">
          <Plane className="size-3.5" aria-hidden />
        </span>
        Travel SaaS
      </Link>
      <div className="ms-auto">
        <UserMenu />
      </div>
    </header>
  )
}