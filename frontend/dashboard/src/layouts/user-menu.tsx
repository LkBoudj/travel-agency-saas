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
import { ROUTES } from "@/app/router/route-paths"
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

const LOCALE_OPTIONS: { value: AppLocale; labelKey: string }[] = [
  { value: "en", labelKey: "locale.english" },
  { value: "ar", labelKey: "locale.arabic" },
]

export function UserMenu() {
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
            <NavMenuItem to={ROUTES.agency} icon={Building}>
              {t("userMenu.agencyProfile")}
            </NavMenuItem>
            <NavMenuItem to={ROUTES.settings} icon={Settings}>
              {t("userMenu.settings")}
            </NavMenuItem>
            <div className="my-1 h-px bg-border" />
            <NavMenuItem to={ROUTES.login} icon={LogOut}>
              {t("userMenu.signOut")}
            </NavMenuItem>

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