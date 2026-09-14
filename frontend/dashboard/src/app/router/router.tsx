import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { NotFoundPage } from "@/pages/not-found"
import { appRoutes } from "./routes"

/**
 * The application router.
 *
 * Stays small: it only assembles the composed route groups and adds the
 * top-level fallback. Detailed routes live in each feature's own route module.
 */
const router = createBrowserRouter([
  ...appRoutes,
  { path: "*", element: <NotFoundPage /> },
])

/** Renders the router provider. Mounted from the app entry point. */
export function AppRouter() {
  return <RouterProvider router={router} />
}
