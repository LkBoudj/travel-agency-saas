import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

/**
 * `site` is the canonical origin of the demo storefront: it is the host the
 * static build resolves the tenant from and the origin canonical/hreflang URLs
 * are built from. Production serves every tenant behind its own request origin
 * (T14), so this is only the built-in demo tenant's address.
 *
 * The Cloudflare adapter enables on-demand rendering. Output stays `static`, so
 * every public page is still prerendered; only the Theme Lab route opts out with
 * `export const prerender = false`, because a signed preview token must be
 * verified per request and must never be baked into a static file (T10).
 */
export default defineConfig({
  site: "https://demo.platform.com",
  adapter: cloudflare(),
  integrations: [react()],
});
