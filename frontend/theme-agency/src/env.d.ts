declare namespace App {
  interface Locals {
    tenantSlug: string;
    tenantSource: "platform" | "custom" | "development";
    /**
     * Set by the middleware on Theme Lab requests only. Uses an inline import
     * type on purpose: a top-level import would turn this file into a module and
     * the `App` namespace would stop being global (T8 regression).
     */
    preview?: import("./platform/preview.ts").PreviewLocals;
  }
}

interface ImportMetaEnv {
  /**
   * Server-only secret that signs Theme Lab preview links. Preview fails closed
   * (404) when it is absent, so it is never optional in practice.
   */
  readonly PREVIEW_TOKEN_SECRET?: string;
  /**
   * Backend origin for the website DataSource (fallback name: STORE_URL).
   * When set, public + lab pages render real tenant data; when absent the
   * render path falls back to the demo fixtures (dev/build without a backend).
   */
  readonly WEBSITE_API_URL?: string;
  readonly STORE_URL?: string;
}
