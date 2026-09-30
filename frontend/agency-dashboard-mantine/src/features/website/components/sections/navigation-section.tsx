import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { FormSection } from '../../../../components/form/form-section.tsx';
import type { WebsiteForm } from '../../hooks/use-website-form.ts';

export interface NavigationSectionProps {
  form: WebsiteForm;
}

export function NavigationSection({ form }: NavigationSectionProps) {
  const { t } = useTranslation('website');

  return (
    <FormSection title={t('sections.navigation')} description={t('sectionHints.navigation')}>
      <Stack gap="sm">
        {form.values.navigation.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('empty.navigation')}
          </Text>
        ) : null}
        {form.values.navigation.map((_row, index) => (
          <Group key={`nav-${index}`} gap="sm" align="flex-end" wrap="nowrap">
            <TextInput
              placeholder={t('placeholders.navLabel')}
              style={{ flex: 1 }}
              {...form.getInputProps(`navigation.${index}.label`)}
            />
            <TextInput
              placeholder={t('placeholders.href')}
              style={{ flex: 1 }}
              {...form.getInputProps(`navigation.${index}.href`)}
            />
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={t('removeNavigationLink')}
              onClick={() => form.removeListItem('navigation', index)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Box>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => form.insertListItem('navigation', { label: '', href: '' })}
          >
            {t('addNavigationLink')}
          </Button>
        </Box>
      </Stack>
    </FormSection>
  );
}
