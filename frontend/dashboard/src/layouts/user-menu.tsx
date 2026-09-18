import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import {
  Building,
  Check,
  ChevronDown,
  LogOut,
  Settings,
  User,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { AGENCY_SECTIONS, agencyPath } from "@/features/agency-context/lib/agency-paths"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { useLogout } from "@/features/auth/hooks/use-logout"
import { Button } from "@/components/ui/button"
import { setLocale, type AppLocale } from "@/i18n"
import { cn } from "@/lib/utils"

type NavMenuItemProps = {
  to: string
  icon: LucideIcon
  children: ReactNode
}

function NavMenuItem({ to, icon: Icon, children }: NavMenuItemProps) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </Link>
  )
}

type NavMenuActionProps = {
  icon: LucideIcon
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

/** Same look as NavMenuItem, but it performs an action instead of navigating. */
function NavMenuAction({ icon: Icon, disabled, onClick, children }: NavMenuActionProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </button>
  )
}

const LOCALE_OPTIONS: { value: AppLocale; labelKey: string }[] = [
  { value: "en", labelKey: "locale.english" },
  { value: "ar", labelKey: "locale.arabic" },
]

export function UserMenu() {
  const { agency } = useAgencyContext()
  const logout = useLogout()
  const [open, setOpen] = useState(false)
  const { t, i18n } = useTranslation()
  const currentLocale = i18n.language as AppLocale

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="gap-2 text-background hover:bg-white/10 hover:text-white dark:text-foreground dark:hover:bg-white/10 dark:hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-white/10">
          <User className="size-3.5" />
        </span>
        <span className="hidden text-[13px] font-medium sm:block">
          {t("userMenu.account")}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-background/60 transition-transform dark:text-foreground/60",
            open && "rotate-180"
          )}
        />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute end-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            <div className="px-2.5 pb-1 pt-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("userMenu.account")}
              </p>
            </div>
            <div className="my-1 h-px bg-border" />
            <NavMenuItem to={agencyPath(agency.code, AGENCY_SECTIONS.agency)} icon={Building}>
              {t("userMenu.agencyProfile")}
            </NavMenuItem>
            <NavMenuItem to={agencyPath(agency.code, AGENCY_SECTIONS.settings)} icon={Settings}>
              {t("userMenu.settings")}
            </NavMenuItem>
            <div className="my-1 h-px bg-border" />
            <NavMenuAction
              icon={LogOut}
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {t("userMenu.signOut")}
            </NavMenuAction>

            <div className="my-1 h-px bg-border" />
            <div className="px-2.5 pb-1 pt-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("userMenu.language")}
              </p>
            </div>
            <div className="mx-1 grid gap-0.5">
              {LOCALE_OPTIONS.map((option) => {
                const active = option.value === currentLocale
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setLocale(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                      active ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {t(option.labelKey)}
                    {active && <Check className="size-4 text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}