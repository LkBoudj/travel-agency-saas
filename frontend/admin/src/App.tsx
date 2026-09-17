import { QueryClientProvider } from "@tanstack/react-query"

import { AppRouter } from "@/app/router/router"
import { queryClient } from "@/lib/query-client"

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  )
}

export default App