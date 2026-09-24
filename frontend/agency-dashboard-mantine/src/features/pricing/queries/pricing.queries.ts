/**
 * Query keys.
 *
 * Pricing belongs to one tour, so every key sits under the tour's detail
 * slice — a mutation here refetches this tour's pricing only, and never
 * touches another agency's (or another tour's) cache.
 */
export const pricingQueryKeys = {
  all: (agencyCode: string, tourCode: string) =>
    ['agency', agencyCode, 'tours', 'detail', tourCode, 'pricing'] as const,
  overview: (agencyCode: string, tourCode: string) =>
    [...pricingQueryKeys.all(agencyCode, tourCode), 'overview'] as const,
  option: (agencyCode: string, tourCode: string, pricingOptionCode: string) =>
    [...pricingQueryKeys.all(agencyCode, tourCode), 'detail', pricingOptionCode] as const,
  departurePrices: (agencyCode: string, tourCode: string, departureCode: string) =>
    [...pricingQueryKeys.all(agencyCode, tourCode), 'departure', departureCode, 'prices'] as const,
};
