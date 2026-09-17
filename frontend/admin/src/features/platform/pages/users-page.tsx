import { PlaceholderPage } from "../components/placeholder-page"

export function UsersPage() {
  return (
    <PlaceholderPage
      title="Users"
      description="Manage the platform accounts that can sign in to the Super Dashboard."
    >
      <p className="text-sm text-muted-foreground">
        Listing, inviting, updating, and disabling platform users is scheduled
        for a later phase.
      </p>
    </PlaceholderPage>
  )
}