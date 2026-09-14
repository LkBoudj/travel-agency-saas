import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { appToastManager } from "@/components/ui/toast"
import { createAgency as createAgencyRecord } from "@/features/agency/api/agency.api"
import { AuthCard } from "@/features/auth/components/auth-card"
import { AuthHeader } from "@/features/auth/components/auth-header"
import { CreateAgencyForm } from "@/features/auth/components/create-agency-form"
import { useCreateAgency } from "@/features/auth/hooks/use-create-agency"

export function CreateAgencyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const createAgency = useCreateAgency((data) => {
    createAgencyRecord({
      name: data.agencyName,
      slug: data.slug,
    })
    appToastManager.add({ title: t("auth:createAgency.created") })
    navigate(ROUTES.dashboard)
  })

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <AuthCard>
        <AuthHeader
          step={t("auth:createAgency.step")}
          title={t("auth:createAgency.title")}
          description={t("auth:createAgency.description")}
        />

        <div className="mt-6">
          <CreateAgencyForm {...createAgency} />
        </div>
      </AuthCard>
    </div>
  )
}