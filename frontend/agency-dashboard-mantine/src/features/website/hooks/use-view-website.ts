import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { getEnv } from '../../../config/env.ts';
import { classifyWebsiteError } from '../lib/website-errors.ts';
import { storefrontServesAnotherTenant, websitePublicUrl } from '../lib/website-url.ts';
import { useWebsiteCapabilities } from './use-website-capabilities.ts';
import { usePublishedWebsite, useWebsiteDraft, useWebsiteMutations } from './use-website.ts';

/**
 * "View website": open the agency's public site, or — when it isn't published
 * yet — the signed draft preview, so the action is never a dead link.
 */
export interface ViewWebsiteController {
  /** `live` = published URL, `preview` = mint a signed draft preview. */
  mode: 'live' | 'preview';
  /** Resolved public URL, `null` when it cannot be resolved honestly. */
  url: string | null;
  /** The dev storefront is pointed at a different agency (dev only). */
  servesAnotherTenant: boolean;
  /** The tenant the dev storefront serves — the hint names it. */
  devTenantSlug: string | null;
  isOpening: boolean;
  open: () => void;
}

export function useViewWebsite(enabled = true): ViewWebsiteController {
  const { t } = useTranslation('website');
  const capabilities = useWebsiteCapabilities();
  const draftQuery = useWebsiteDraft(enabled && capabilities.canView);
  const publishedQuery = usePublishedWebsite(enabled && capabilities.canView);
  const { mintPreview } = useWebsiteMutations();

  const env = getEnv();
  const isPublished = publishedQuery.isSuccess;
  const slug = draftQuery.data?.slug ?? null;
  const url = websitePublicUrl({
    slug,
    platformDomain: env.platformDomain,
    storefrontBaseUrl: env.storefrontBaseUrl,
  });
  const servesAnotherTenant = storefrontServesAnotherTenant({
    slug,
    storefrontTenantSlug: env.storefrontTenantSlug,
    isDev: import.meta.env.DEV,
  });

  const open = () => {
    if (isPublished && url !== null) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!isPublished) {
      mintPreview.mutate(
        { page: 'home' },
        {
          onSuccess: (response) => {
            window.open(response.previewUrl, '_blank', 'noopener,noreferrer');
          },
          onError: (error) => {
            const { kind } = classifyWebsiteError(error);
            notifications.show({
              message:
                kind === 'not-published'
                  ? t('notifications.notPublished')
                  : t('notifications.previewFailed'),
              color: 'red',
            });
          },
        }
      );
      return;
    }

    // Published, but no honest address (no slug/domain configured yet).
    notifications.show({ message: t('notifications.noWebsiteUrl'), color: 'red' });
  };

  return {
    mode: isPublished && url !== null ? 'live' : 'preview',
    url,
    servesAnotherTenant,
    devTenantSlug: env.storefrontTenantSlug ?? null,
    isOpening: mintPreview.isPending,
    open,
  };
}
