import type { ReactNode } from "react"
import { cn } from "cn"

type AuthCardProps = {
  children: ReactNode
  className?: string
}

/** Centered card container shared by all guest auth screens. */
export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[440px] rounded-xl border bg-card p-6 shadow-sm sm:p-8",
        className
      )}
    >
      {children}
    </div>
  )
}
