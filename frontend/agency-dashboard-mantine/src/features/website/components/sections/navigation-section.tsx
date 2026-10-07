import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Group, Stack } from '@mantine/core';
import { EmptyState } from '../../../../components/empty-state.tsx';
import { FormSection } from '../../../../components/form/form-section.tsx';
import { Panel } from '../../../../components/panel.tsx';
import type { WebsiteForm } from '../../hooks/use-website-form.ts';
import { NavigationLinkRow } from '../repeating-rows.tsx';

export interface NavigationSectionProps {
  form: WebsiteForm;
}

export function NavigationSection({ form }: NavigationSectionProps) {
  const { t } = useTranslation('website');

  return (
    <Panel>
      <FormSection title={t('sections.navigation')} description={t('sectionHints.navigation')}>
        <Stack gap="sm">
          {form.values.navigation.length === 0 ? (
            <EmptyState compact title={t('empty.navigation')} />
          ) : null}
          {form.values.navigation.map((_row, index) => (
            <NavigationLinkRow key={`nav-${index}`} form={form} index={index} />
          ))}
          <Group>
            <Button
              variant="default"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => form.insertListItem('navigation', { label: '', href: '' })}
            >
              {t('addNavigationLink')}
            </Button>
          </Group>
        </Stack>
      </FormSection>
    </Panel>
  );
}
