import { useTranslation } from "react-i18next"
import { AuthCard } from "@/features/auth/components/auth-card"
import { AuthHeader } from "@/features/auth/components/auth-header"
import { CreateAgencyForm } from "@/features/auth/components/create-agency-form"
import { UnsupportedActionNotice } from "@/features/auth/components/unsupported-action-notice"
import { useCreateAgency } from "@/features/auth/hooks/use-create-agency"

export function CreateAgencyPage() {
  const { t } = useTranslation()

  // Self-service agency creation has no backend endpoint. The form stays so the
  // route and design survive, but submitting it does nothing rather than
  // writing to a dev-only store and reporting success that never happened.
  const createAgency = useCreateAgency(() => {})

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <AuthCard>
        <AuthHeader
          step={t("auth:createAgency.step")}
          title={t("auth:createAgency.title")}
          description={t("auth:createAgency.description")}
        />

        <div className="mt-6 flex flex-col gap-4">
          <UnsupportedActionNotice>
            Creating an agency from here is not available yet. Agencies are
            created by the platform team, who also set up the first owner
            account.
          </UnsupportedActionNotice>
          <CreateAgencyForm {...createAgency} />
        </div>
      </AuthCard>
    </div>
  )
}