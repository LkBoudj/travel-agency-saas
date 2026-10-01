import { useTranslation } from 'react-i18next';
import { Badge, Group } from '@mantine/core';
import type { ThemeCardState } from '../lib/theme-card-state.ts';

/**
 * The theme card's state, as one vocabulary.
 *
 * A card can be in three overlapping situations — selected on the draft, served
 * by the live site, and staged-but-unpublished — and the gap between them is the
 * whole point of this page. It used to be three hand-written `<Badge>`s picking
 * Mantine's stock `teal`/`yellow`, which is a different colour system from the
 * one every other status in the app uses (`STATUS_COLORS`: `success` for live,
 * `warning` for waiting, `brand` for the selection). Now the state has exactly
 * one renderer, so it cannot drift again.
 *
 * `tt="none"` keeps translated labels from being uppercased, which Arabic
 * cannot take.
 */
export function ThemeStateBadge({ state }: { state: ThemeCardState }) {
  const { t } = useTranslation('themes');
  const { isCurrent, isLive, isPendingPublish } = state;

  if (!isCurrent && !isLive) {
    return null;
  }

  return (
    <Group gap={6} wrap="nowrap">
      {isCurrent ? (
        <Badge color="brand" variant="filled" size="sm" tt="none">
          {t('badgeCurrent')}
        </Badge>
      ) : null}
      {isLive ? (
        <Badge color="success" variant="light" size="sm" tt="none">
          {t('badgeLive')}
        </Badge>
      ) : null}
      {isPendingPublish ? (
        <Badge color="warning" variant="light" size="sm" tt="none">
          {t('badgePending')}
        </Badge>
      ) : null}
    </Group>
  );
}
