import { GalleryVerticalEndIcon } from "lucide-react"

import { LoginForm } from "../components/login-form"

export function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6">
      <div className="flex flex-col items-center gap-2 font-medium">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEndIcon className="size-4" />
        </div>
        <span className="text-sm">Travel SaaS · Platform Admin</span>
      </div>
      <LoginForm className="w-full max-w-sm" />
    </div>
  )
}