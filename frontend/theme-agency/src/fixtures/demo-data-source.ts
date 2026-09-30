import type { StorefrontData, StorefrontDataSource } from "../platform/data-source.ts";
import { demoAgencyConfig } from "./demo-agency.ts";
import {
  demoFinalCta,
  demoHero,
  demoPromotion,
  demoTours,
  demoTrustPoints,
  demoTestimonials,
} from "./demo-content.ts";
import { buildDemoDraft } from "./demo-draft.ts";

/**
 * Development DataSource backed by fixtures. The render path accepts any
 * `StorefrontDataSource`; this one resolves in-process until the backend
 * public read API exists.
 */
class DemoDataSource implements StorefrontDataSource {
  published(tenantSlug: string): Promise<StorefrontData> {
    const data: StorefrontData = {
      config: demoAgencyConfig,
      hero: demoHero,
      tours: demoTours,
      trustPoints: demoTrustPoints,
      promotion: demoPromotion,
      testimonials: demoTestimonials,
      finalCta: demoFinalCta,
    };
    if (tenantSlug !== demoAgencyConfig.tenantSlug) {
      return Promise.reject(
        new Error(`unknown tenant "${tenantSlug}" (fixtures back "demo" only)`),
      );
    }
    return Promise.resolve(data);
  }

  draft(tenantSlug: string): Promise<StorefrontData> {
    if (tenantSlug !== demoAgencyConfig.tenantSlug) {
      return Promise.reject(
        new Error(`unknown tenant "${tenantSlug}" (fixtures back "demo" only)`),
      );
    }
    return Promise.resolve(buildDemoDraft());
  }
}

export const demoDataSource: StorefrontDataSource = new DemoDataSource();

/** Resolves the fixture DataSource used by the dev render path. */
export function createFixtureDataSource(): StorefrontDataSource {
  return demoDataSource;
}