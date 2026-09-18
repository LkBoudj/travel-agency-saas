import { QueryClientProvider } from "@tanstack/react-query"

import { AppRouter } from "@/app/router/router"
import { Toaster } from "@/components/ui/toast"
import { queryClient } from "@/lib/query-client"

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster />
    </QueryClientProvider>
  )
}

export default App