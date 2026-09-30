/**
 * Module resolution for importing `.astro` components from plain `.ts` files
 * (e.g. the static theme registry). Astro's ts plugin types `.astro` imports
 * inside `.astro` files; this ambient declaration covers `.ts` consumers.
 */
declare module "*.astro" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  const Component: AstroComponentFactory;
  export default Component;
}