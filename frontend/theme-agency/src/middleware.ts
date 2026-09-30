import { defineMiddleware } from "astro:middleware";

import { decidePreviewRequest } from "./platform/preview.ts";
import { resolveTenantFromHostname } from "./platform/tenant-resolver.ts";

function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/**
 * Preview output must never be indexed or cached. The `robots` meta tag comes
 * from the SEO builder; these headers cover clients that do not parse HTML.
 */
function withPreviewHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("cache-control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const decision = await decidePreviewRequest({
    pathname: context.url.pathname,
    searchParams: context.url.searchParams,
    secret: import.meta.env.PREVIEW_TOKEN_SECRET,
  });

  if (decision.type === "not-found") return notFound();

  if (decision.type === "render-preview") {
    Object.assign(context.locals, { preview: decision.locals });

    // The public `/_lab` prefix is rewritten to the internal `/lab` route.
    // `rewrite()` re-runs middleware, but the rewritten path no longer carries
    // the public prefix, so the second pass calls `next()` instead of looping.
    if (decision.rewriteTo) {
      const target = new URL(decision.rewriteTo, context.url);
      target.search = context.url.search;
      return withPreviewHeaders(await context.rewrite(target));
    }
    return withPreviewHeaders(await next());
  }

  const resolution = resolveTenantFromHostname(context.url.hostname, {
    allowLocalhost: import.meta.env.DEV,
    // `demo` is the built-in local tenant. `LOCALHOST_TENANT_SLUG` points the
    // dev server at another real agency (its `AgencyWebsite.slug`) so the
    // backend-backed flow can be exercised locally without a domain mapping —
    // dev only, and an invalid value fails closed (404) rather than silently
    // falling back, so a typo is never mistaken for a working site.
    localhostTenantSlug: import.meta.env.LOCALHOST_TENANT_SLUG || "demo",
  });
  if (!resolution.ok) return notFound();

  Object.assign(context.locals, {
    tenantSlug: resolution.tenantSlug,
    tenantSource: resolution.source,
  });
  return next();
});
