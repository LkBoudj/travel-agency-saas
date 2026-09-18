import type { ReactNode } from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"

const toastManager = ToastPrimitive.createToastManager()

type ToastOptions = {
  description?: ReactNode
  timeout?: number
  priority?: "low" | "high"
}

const toast = {
  add: (options: Parameters<typeof toastManager.add>[0]) =>
    toastManager.add(options),
  close: (id?: string) => toastManager.close(id),
  update: (id: string, updates: Parameters<typeof toastManager.update>[1]) =>
    toastManager.update(id, updates),
  success: (title: ReactNode, options?: ToastOptions) =>
    toastManager.add({ ...options, title, type: "success" }),
  error: (title: ReactNode, options?: ToastOptions) =>
    toastManager.add({ ...options, title, type: "error" }),
  info: (title: ReactNode, options?: ToastOptions) =>
    toastManager.add({ ...options, title, type: "info" }),
  warning: (title: ReactNode, options?: ToastOptions) =>
    toastManager.add({ ...options, title, type: "warning" }),
}

export { toast, toastManager }
