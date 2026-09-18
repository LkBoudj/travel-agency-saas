import { PlaceholderPage } from "../components/placeholder-page"

export function OverviewPage() {
  return (
    <PlaceholderPage
      title="Overview"
      description="Platform-wide summary of agencies, users, and activity."
    >
      <p className="text-sm text-muted-foreground">
        A platform overview with high-level metrics will be introduced in a
        later phase.
      </p>
    </PlaceholderPage>
  )
}