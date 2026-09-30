import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Group, Image, Stack, Text } from '@mantine/core';
import type { ThemeCardState } from '../lib/theme-card-state.ts';

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
 * The current theme is marked by a heavier border *and* a badge, so the
 * selection never depends on colour alone, and the live theme keeps its own
 * badge while a different theme is staged — that gap is exactly what the
 * page-level publish notice explains.
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
  const { isCurrent, isLive, isPendingPublish } = state;

  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      style={isCurrent ? { borderColor: 'var(--mantine-color-teal-6)', borderWidth: 2 } : undefined}
    >
      <Stack gap="sm">
        <Card.Section>
          {previewUrl ? (
            <Image src={previewUrl} alt={name} height={160} fit="cover" />
          ) : (
            <Stack align="center" justify="center" h={160} bg="var(--mantine-color-default-hover)">
              <Text size="xs" c="dimmed">
                {t('noPreview')}
              </Text>
            </Stack>
          )}
        </Card.Section>

        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text fw={600} size="md">
            {name}
          </Text>
          <Group gap={6} wrap="nowrap">
            {isCurrent ? (
              <Badge variant="filled" color="teal" size="sm">
                {t('badgeCurrent')}
              </Badge>
            ) : null}
            {isLive ? (
              <Badge variant="outline" color="teal" size="sm">
                {t('badgeLive')}
              </Badge>
            ) : null}
            {isPendingPublish ? (
              <Badge variant="light" color="yellow" size="sm">
                {t('badgePending')}
              </Badge>
            ) : null}
          </Group>
        </Group>

        <Text size="sm">{description}</Text>
        <Text size="xs" c="dimmed" tt="uppercase">
          v{version}
        </Text>

        {canEdit ? (
          <Group gap="xs" wrap="nowrap">
            <Button variant="subtle" size="sm" loading={busy} onClick={onPreview}>
              {t('preview')}
            </Button>
            {isCurrent ? (
              <Button variant="light" size="sm" onClick={onCustomize}>
                {t('customize')}
              </Button>
            ) : (
              <Button variant="default" size="sm" loading={busy} onClick={onActivate}>
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
