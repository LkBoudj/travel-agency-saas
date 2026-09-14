import { AppRouter } from "@/app/router/router"
import { AppToastProvider } from "@/components/ui/toast"

export function App() {
  return (
    <AppToastProvider>
      <AppRouter />
    </AppToastProvider>
  )
}
