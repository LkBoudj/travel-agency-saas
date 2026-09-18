import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function PlaceholderPage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Not implemented yet</CardTitle>
          <CardDescription>
            This section is scheduled for a later phase of the Platform Super
            Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}