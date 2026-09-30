import type { ThemeManifest } from "@theme-agency/sdk";

export const starterManifest: ThemeManifest = {
  id: "starter",
  nameKey: "themes.starter.name",
  descriptionKey: "themes.starter.description",
  version: "1.0.0",
  // Served from this app's `public/` (the same origin that serves
  // `/themes.json`), so the dashboard resolves it against the themes base URL.
  previewImage: "/demo/themes/starter-home.jpg",
};