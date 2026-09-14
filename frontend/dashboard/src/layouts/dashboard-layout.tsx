import { Outlet } from "react-router-dom"
import { useSidebarStore } from "@/stores/sidebar.store"
import { DashboardHeader } from "./dashboard-header"
import { DashboardSidebar } from "./dashboard-sidebar"

export function DashboardLayout() {
  const isOpen = useSidebarStore((state) => state.isOpen)
  const close = useSidebarStore((state) => state.close)

  return (
    <div className="min-h-svh bg-background">
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={close}
          aria-hidden
        />
      )}
      <DashboardHeader />
      <DashboardSidebar />
      <main className="px-4 py-4 md:px-6 md:ps-60">
        <Outlet />
      </main>
    </div>
  )
}