/* eslint-disable react-refresh/only-export-components */
import { Toast } from "@base-ui/react/toast"
import { X } from "lucide-react"

/**
 * App-wide toast system (Base UI Toast). Manager is exported so both hook and
 * non-hook code can show toasts (e.g. create/editor flows); the provider must
 * be mounted once at the app root.
 */
export const appToastManager = Toast.createToastManager()

function ToastList() {
  const { toasts } = Toast.useToastManager()

  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      swipeDirection={["right", "down"]}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg transition-all duration-300 ease-in data-starting-style:translate-y-2 data-starting-style:opacity-0 data-ending-style:translate-y-2 data-ending-style:opacity-0"
    >
      <Toast.Content className="flex min-w-0 flex-1 flex-col gap-1">
        <Toast.Title className="text-sm font-medium" />
        <Toast.Description className="text-xs text-muted-foreground" />
      </Toast.Content>
      <Toast.Close
        aria-label="Dismiss"
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden />
      </Toast.Close>
    </Toast.Root>
  ))
}

type AppToastProviderProps = {
  children: React.ReactNode
}

export function AppToastProvider({ children }: AppToastProviderProps) {
  return (
    <Toast.Provider toastManager={appToastManager}>
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 end-4 z-50 flex flex-col gap-2 w-[min(calc(100vw-2rem),24rem)] outline-none">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
      {children}
    </Toast.Provider>
  )
}