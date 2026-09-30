import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from '@mantine/core';
import type { ViewWebsiteController } from '../hooks/use-view-website.ts';

export interface ViewWebsiteButtonProps {
  controller: ViewWebsiteController;
}

/**
 * Header action shared by the Website and Overview pages. The tooltip states
 * what will actually open (live site vs signed draft preview) and warns when
 * the dev storefront serves another agency — the button never pretends.
 */
export function ViewWebsiteButton({ controller }: ViewWebsiteButtonProps) {
  const { t } = useTranslation('website');

  let tooltip = controller.mode === 'live' ? t('tooltips.live') : t('tooltips.preview');
  if (controller.servesAnotherTenant) {
    tooltip = `${tooltip} ${t('tooltips.devOtherTenant', {
      tenant: controller.devTenantSlug ?? '',
    })}`;
  }

  return (
    <Tooltip label={tooltip} multiline w={280} withArrow>
      <Button
        variant="default"
        loading={controller.isOpening}
        onClick={controller.open}
        // `dir="auto"` keeps an interpolated LTR tenant slug readable inside the
        // Arabic sentence instead of flipping the punctuation around it.
        dir="auto"
      >
        {controller.mode === 'live' ? t('viewWebsite') : t('previewDraft')}
      </Button>
    </Tooltip>
  );
}
