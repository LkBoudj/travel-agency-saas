import type { StorefrontTheme } from "@/themes/contracts";
import { explorerManifest } from "./manifest";
import { explorerSettingsSchema } from "./settings-schema";
import { explorerSettingsDefaults } from "./defaults";
import ExplorerLayout from "./layout";
import ExplorerHomeTemplate from "./pages/home";
import ExplorerTripsTemplate from "./pages/trips";
import ExplorerTripDetailTemplate from "./pages/trip-detail";

/**
 * Explorer Theme (v1) — the storefront's default Theme.
 * Wraps the previously approved single-agency Home page with the platform
 * contract: Layout (Header + Footer), Home/Trips/TripDetail templates, and
 * a settings schema owned by the platform.
 */
export const explorerTheme: StorefrontTheme = {
  ...explorerManifest,
  Layout: ExplorerLayout,
  HomeTemplate: ExplorerHomeTemplate,
  TripsTemplate: ExplorerTripsTemplate,
  TripDetailTemplate: ExplorerTripDetailTemplate,
  settings: {
    schema: explorerSettingsSchema,
    defaults: explorerSettingsDefaults,
  },
};