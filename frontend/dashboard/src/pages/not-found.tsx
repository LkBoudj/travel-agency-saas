import { Compass } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { buttonVariants } from "@/components/ui/button"

/** Fallback for unknown URLs. */
export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold leading-6 tracking-tight">
          {t("common:notFound.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("common:notFound.description")}
        </p>
      </div>
      <Link to={ROUTES.agencies} className={buttonVariants()}>
        {t("common:notFound.backToDashboard")}
      </Link>
    </div>
  )
}