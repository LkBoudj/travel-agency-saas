import type {
  PageModel,
  RenderContext,
  ThemeDefinition,
  ThemeSettings,
} from "../core/contracts.ts";
import {
  buildCustomPageModel,
  buildHomePageModel,
  buildTripDetailPageModel,
  buildTripsPageModel,
} from "../core/page-models.ts";
import { getActiveTheme } from "../core/resolver.ts";
import type {
  StorefrontData,
  StorefrontDataSource,
} from "./data-source.ts";

export type StorefrontPageRequest =
  | { kind: "home" }
  | { kind: "trips" }
  | { kind: "trip-detail"; slug: string }
  | { kind: "custom-page"; slug: string };

export interface StorefrontRenderInput {
  dataSource: StorefrontDataSource;
  registry: Record<string, ThemeDefinition>;
  tenantSlug: string;
  page: StorefrontPageRequest;
  preview?: boolean;
  themeId?: string;
  paths?: RenderContext["paths"];
  /**
   * Theme Lab overrides merged over the stored config settings. Still validated
   * against the active theme schema, so unknown or ill-typed keys are ignored.
   */
  settingsOverride?: Record<string, unknown>;
  /** Theme Lab direction toggle; otherwise derived from the locale. */
  dir?: RenderContext["dir"];
}

export interface StorefrontRenderResult {
  theme: ThemeDefinition;
  settings: ThemeSettings;
  context: RenderContext;
  usedDefaultTheme: boolean;
}

export class StorefrontPageNotFoundError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(`Storefront trip "${slug}" was not found`);
    this.name = "StorefrontPageNotFoundError";
    this.slug = slug;
  }
}

const defaultPaths: RenderContext["paths"] = {
  home: "/",
  trips: "/trips",
  tripDetail: (slug) => `/trips/${encodeURIComponent(slug)}`,
};

function localeDirection(locale: string): RenderContext["dir"] {
  return locale.toLowerCase().split("-")[0] === "ar" ? "rtl" : "ltr";
}

function buildPageModel(
  page: StorefrontPageRequest,
  data: StorefrontData,
): PageModel {
  switch (page.kind) {
    case "home":
      return buildHomePageModel(data);
    case "trips":
      return buildTripsPageModel(data);
    case "trip-detail": {
      const model = buildTripDetailPageModel(data, page.slug);
      if (!model) throw new StorefrontPageNotFoundError(page.slug);
      return model;
    }
    case "custom-page": {
      const model = buildCustomPageModel(data, page.slug);
      if (!model) throw new StorefrontPageNotFoundError(page.slug);
      return model;
    }
  }
}

export async function renderStorefront(
  input: StorefrontRenderInput,
): Promise<StorefrontRenderResult> {
  const preview = input.preview ?? false;
  const data = preview
    ? await input.dataSource.draft(input.tenantSlug)
    : await input.dataSource.published(input.tenantSlug);
  const activeTheme = getActiveTheme(
    {
      themeId: input.themeId ?? data.config.themeId,
      settings: input.settingsOverride
        ? { ...data.config.settings, ...input.settingsOverride }
        : data.config.settings,
    },
    input.registry,
  );

  if (!activeTheme.theme) {
    throw new Error(`Default theme "${activeTheme.themeId}" is not registered`);
  }

  const context: RenderContext = {
    locale: data.config.locale,
    dir: input.dir ?? localeDirection(data.config.locale),
    themeId: activeTheme.themeId,
    preview,
    branding: data.config.branding,
    navigation: data.config.navigation,
    footer: data.config.footer,
    paths: input.paths ?? defaultPaths,
    page: buildPageModel(input.page, data),
  };

  return {
    theme: activeTheme.theme,
    settings: activeTheme.settings,
    context,
    usedDefaultTheme: activeTheme.usedDefaultTheme,
  };
}
