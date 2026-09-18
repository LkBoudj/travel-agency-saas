import { Construction } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { buttonVariants } from "@/components/ui/button"

type PlaceholderPageProps = {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Construction className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {description ?? t("common:placeholder.defaultDescription")}
        </p>
      </div>
      <Link to={ROUTES.agencies} className={buttonVariants({ variant: "outline", size: "sm" })}>
        {t("common:placeholder.backToOverview")}
      </Link>
    </div>
  )
}