import { IconCircle, IconCircleCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Autocomplete, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { DrawerFormShell } from '../../../components/form/drawer-form-shell.tsx';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { FormErrorSummary } from '../../../components/form/form-error-summary.tsx';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import {
  emptyQuickCreateFormValues,
  quickCreateSchema,
  type QuickCreateFormValues,
} from '../schemas/quick-create.schema.ts';
import type { TourFormat } from '../types.ts';
import { buildCatalogOptions } from './sections/catalog-options.ts';

const MULTI_DAY_FORMATS: readonly TourFormat[] = ['stay', 'circuit', 'cruise'];
const FORMAT_ORDER: readonly TourFormat[] = [
  'experience',
  'day_excursion',
  'stay',
  'circuit',
  'cruise',
];

export interface QuickCreateDrawerProps {
  opened: boolean;
  submitting: boolean;
  suggestedDestinations: string[];
  onClose: () => void;
  onSubmit: (values: QuickCreateFormValues) => void;
}

export function QuickCreateDrawer({
  opened,
  submitting,
  suggestedDestinations,
  onClose,
  onSubmit,
}: QuickCreateDrawerProps) {
  const { t } = useTranslation('trips');
  const options = buildCatalogOptions(t);
  const form = useZodForm<QuickCreateFormValues>({
    schema: quickCreateSchema,
    initialValues: emptyQuickCreateFormValues(),
    fieldErrorKeys: {
      name: { required: 'fieldErrors.nameRequired', invalid: 'fieldErrors.nameTooLong' },
    },
    t,
  });

  const format = form.values.format;
  const showDays = MULTI_DAY_FORMATS.includes(format);
  const showHours = format === 'experience';
  const fixedSingleDay = format === 'day_excursion';

  const nameReady = form.values.name.trim().length > 0;
  const destinationReady = form.values.destinationPlace.trim().length > 0;

  const handleSubmit = form.onSubmit(onSubmit);

  return (
    <DrawerFormShell opened={opened} onClose={onClose} title={t('createDrawer.title')} size="sm">
      <form onSubmit={handleSubmit}>
        <Stack gap="md" py="md">
          <FormErrorSummary errors={form.errors} />
          <Text size="sm" fw={600} c="brand" tt="uppercase">
            {t('createDrawer.step', { current: 1, total: 2 })}
          </Text>
          <Text size="sm" c="dimmed">
            {t('createDrawer.subtitle')}
          </Text>

          <TextInput
            label={t('createDrawer.name')}
            placeholder={t('editor.placeholders.name')}
            autoFocus
            {...form.getInputProps('name')}
          />

          <Select
            label={t('createDrawer.format')}
            data={FORMAT_ORDER.map((option) => ({
              value: option,
              label: t(`catalog.formats.${option}`),
            }))}
            renderOption={({ option }) => (
              <Stack gap={2} py={4}>
                <Text size="sm" fw={500}>
                  {option.label}
                </Text>
                <Text size="xs" c="dimmed">
                  {t(`createDrawer.formatDescriptions.${option.value}`)}
                </Text>
              </Stack>
            )}
            {...form.getInputProps('format')}
          />

          <Autocomplete
            label={t('createDrawer.destinationPlace')}
            placeholder={t('createDrawer.destinationPlaceholder')}
            description={t('createDrawer.destinationHelp')}
            data={suggestedDestinations}
            limit={8}
            maxDropdownHeight={220}
            selectFirstOptionOnChange
            {...form.getInputProps('destinationPlace')}
          />

          <Group grow gap="md">
            <Select
              label={t('createDrawer.scope')}
              data={options.scopes}
              {...form.getInputProps('geographicScope')}
            />
            <Select
              label={t('createDrawer.availability')}
              data={options.modes}
              {...form.getInputProps('availabilityMode')}
            />
          </Group>

          {showDays ? (
            <Group grow gap="md">
              <TextInput
                label={t('editor.fields.days')}
                inputMode="numeric"
                {...form.getInputProps('days')}
              />
              <TextInput
                label={t('editor.fields.nights')}
                inputMode="numeric"
                {...form.getInputProps('nights')}
              />
            </Group>
          ) : null}
          {showHours ? (
            <TextInput
              label={t('editor.fields.hours')}
              inputMode="numeric"
              {...form.getInputProps('hours')}
            />
          ) : null}
          {fixedSingleDay ? (
            <Text size="sm" c="dimmed">
              {t('editor.sections.singleDayHint')}
            </Text>
          ) : null}

          <Stack
            gap={6}
            p="md"
            bg="var(--app-surface-sunken)"
            style={{ borderRadius: 'var(--mantine-radius-md)' }}
          >
            <Group gap="xs">
              {nameReady ? (
                <IconCircleCheck size={16} color="var(--app-icon-success)" />
              ) : (
                <IconCircle size={16} color="var(--mantine-color-dimmed)" />
              )}
              <Text size="sm">{t('createDrawer.name')}</Text>
            </Group>
            <Group gap="xs">
              {destinationReady ? (
                <IconCircleCheck size={16} color="var(--app-icon-success)" />
              ) : (
                <IconCircle size={16} color="var(--mantine-color-dimmed)" />
              )}
              <Text size="sm">{t('createDrawer.destinationPlace')}</Text>
            </Group>
            <Text size="xs" c="dimmed">
              {t('createDrawer.readyHint')}
            </Text>
          </Stack>

          <FormActions
            submitLabel={t('createDrawer.submit')}
            cancelLabel={t('actions.cancel', { ns: 'common' })}
            onCancel={onClose}
            submitting={submitting}
          />
        </Stack>
      </form>
    </DrawerFormShell>
  );
}
