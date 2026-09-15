import type { ComponentType, ReactNode } from "react";
import type { ThemeRenderContext } from "@/features/storefront/types";

/**
 * Theme id used as the safe default across the platform.
 * See registry.ts for the authoritative list.
 */
export type ThemeId = string;

export type SettingsValue = boolean | string;

export interface ThemeSettings {
  [key: string]: SettingsValue | undefined;
}

export interface SettingsField {
  key: string;
  type: "boolean" | "select";
  group: string;
  labelKey: string;
  options?: { value: string; labelKey: string }[];
}

export interface SettingsSchema {
  fields: SettingsField[];
}

export interface StorefrontThemeManifest {
  id: string;
  nameKey: string;
  descriptionKey: string;
  version: string;
  previewImage?: string;
}

export interface ThemeLayoutProps {
  children: ReactNode;
  context: ThemeRenderContext;
}

export interface PageTemplateProps {
  context: ThemeRenderContext;
  settings: ThemeSettings;
}

export interface TripDetailTemplateProps extends PageTemplateProps {
  slug: string;
}

/**
 * The strict Theme Contract.
 *
 * A Theme is a pure presentation package: it receives a resolved platform
 * context and settings as props. It never resolves the tenant, fetches data,
 * owns SEO, or reads business state.
 */
export interface StorefrontTheme extends StorefrontThemeManifest {
  Layout: ComponentType<ThemeLayoutProps>;
  HomeTemplate: ComponentType<PageTemplateProps>;
  TripsTemplate: ComponentType<PageTemplateProps>;
  TripDetailTemplate: ComponentType<TripDetailTemplateProps>;
  settings: {
    schema: SettingsSchema;
    defaults: ThemeSettings;
  };
}