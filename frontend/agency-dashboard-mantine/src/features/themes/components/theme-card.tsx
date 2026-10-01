import { useTranslation } from 'react-i18next';
import { Button, Card, Group, Image, Stack, Text, Title } from '@mantine/core';
import type { ThemeCardState } from '../lib/theme-card-state.ts';
import { ThemeStateBadge } from './theme-state-badge.tsx';

export interface ThemeCardProps {
  themeId: string;
  name: string;
  description: string;
  version: string;
  /** Already resolved against the themes base URL; `null` → no image shipped. */
  previewUrl: string | null;
  state: ThemeCardState;
  canEdit: boolean;
  /** True while this card's Activate/Preview request is in flight. */
  busy: boolean;
  onPreview: () => void;
  onCustomize: () => void;
  onActivate: () => void;
}

/**
 * One theme in the catalog. Presentational only: the page owns the data, the
 * draft/live state and the mutations; this card renders them.
 *
 * The selection is never carried by colour alone: the current theme gets a
 * heavier border, a `data-current` hook and the Current badge from
 * `ThemeStateBadge`, while the live theme keeps its own badge — the gap between
 * the two is exactly what the page-level publish notice explains.
 *
 * Actions follow one hierarchy on every card: **Activate** is the filled primary
 * (only when the theme is not selected), **Customize** is the light secondary
 * (only when it is), and **Preview** is the subtle tertiary, always available.
 */
export function ThemeCard({
  name,
  description,
  version,
  previewUrl,
  state,
  canEdit,
  busy,
  onPreview,
  onCustomize,
  onActivate,
}: ThemeCardProps) {
  const { t } = useTranslation('themes');
  const { isCurrent } = state;

  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      data-current={isCurrent}
      style={isCurrent ? { borderColor: 'var(--app-accent-border)', borderWidth: 2 } : undefined}
    >
      <Stack gap="sm">
        <Card.Section>
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={name}
              height="var(--app-theme-card-media-height)"
              fit="cover"
            />
          ) : (
            <Stack
              align="center"
              justify="center"
              h="var(--app-theme-card-media-height)"
              bg="var(--app-surface-sunken)"
            >
              <Text size="xs" c="dimmed">
                {t('noPreview')}
              </Text>
            </Stack>
          )}
        </Card.Section>

        {/* The card is a destination a user scans for, so its name is the h2
            below the page title rather than plain bold text. */}
        <Title order={2} fz="md" fw={600} lineClamp={2}>
          {name}
        </Title>
        <Text size="sm">{description}</Text>

        {/* One footer row per card, so version and state sit on the same
            baseline across the grid no matter how long a name or description is. */}
        <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed" tt="uppercase">
            v{version}
          </Text>
          <ThemeStateBadge state={state} />
        </Group>

        {canEdit ? (
          <Group gap="xs">
            <Button variant="subtle" size="sm" loading={busy} onClick={onPreview}>
              {t('preview')}
            </Button>
            {isCurrent ? (
              <Button variant="light" size="sm" onClick={onCustomize}>
                {t('customize')}
              </Button>
            ) : (
              <Button variant="filled" size="sm" loading={busy} onClick={onActivate}>
                {t('activate')}
              </Button>
            )}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {t('readOnlyHint')}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
