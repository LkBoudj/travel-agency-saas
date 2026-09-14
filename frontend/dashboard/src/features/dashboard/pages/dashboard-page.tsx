import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/shared/page-header"

/**
 * TEMPORARY placeholder: only validates the dashboard route layout.
 * Replace with the real overview page when the dashboard feature is built.
 */
export function DashboardPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <PageHeader
        title={t("common:dashboard.title")}
        description={t("common:dashboard.description")}
      />
      <p className="rounded-lg border border-dashed bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
        {t("common:dashboard.placeholder")}
      </p>
    </div>
  )
}