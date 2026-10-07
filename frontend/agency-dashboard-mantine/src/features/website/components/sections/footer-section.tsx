import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Group, Stack, Textarea } from '@mantine/core';
import { EmptyState } from '../../../../components/empty-state.tsx';
import { FormSection } from '../../../../components/form/form-section.tsx';
import { Panel } from '../../../../components/panel.tsx';
import type { WebsiteForm } from '../../hooks/use-website-form.ts';
import { FooterColumnRow, FooterLegalRow, FooterLinkRow } from '../repeating-rows.tsx';

export interface FooterSectionProps {
  form: WebsiteForm;
}

/** A footer column: its own heading, plus the links nested under it. */
function FooterColumn({ form, columnIndex }: { form: WebsiteForm; columnIndex: number }) {
  const { t } = useTranslation('website');
  const links = form.values.footer.columns[columnIndex]?.links ?? [];

  return (
    <Stack gap="sm">
      <FooterColumnRow form={form} columnIndex={columnIndex} />

      <Stack gap={6} ps="md">
        {links.map((_link, linkIndex) => (
          <FooterLinkRow
            key={`link-${columnIndex}-${linkIndex}`}
            form={form}
            columnIndex={columnIndex}
            linkIndex={linkIndex}
          />
        ))}
        <Group>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() =>
              form.insertListItem(`footer.columns.${columnIndex}.links`, { label: '', href: '' })
            }
          >
            {t('addFooterLink')}
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
}

export function FooterSection({ form }: FooterSectionProps) {
  const { t } = useTranslation('website');

  return (
    <Stack gap="lg">
      <Panel>
        <FormSection title={t('sections.footer')} description={t('sectionHints.footerDescription')}>
          <Textarea
            label={t('fields.footerDescription')}
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps('footer.description')}
          />
        </FormSection>
      </Panel>

      <Panel>
        <FormSection
          title={t('sections.footerColumns')}
          description={t('sectionHints.footerColumns')}
        >
          <Stack gap="md">
            {form.values.footer.columns.length === 0 ? (
              <EmptyState compact title={t('empty.footerColumns')} />
            ) : null}
            {form.values.footer.columns.map((_column, columnIndex) => (
              <FooterColumn key={`col-${columnIndex}`} form={form} columnIndex={columnIndex} />
            ))}
            <Group>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() => form.insertListItem('footer.columns', { title: '', links: [] })}
              >
                {t('addFooterColumn')}
              </Button>
            </Group>
          </Stack>
        </FormSection>
      </Panel>

      <Panel>
        <FormSection title={t('sections.footerLegal')} description={t('sectionHints.footerLegal')}>
          <Stack gap="sm">
            {form.values.footer.legal.length === 0 ? (
              <EmptyState compact title={t('empty.footerLegal')} />
            ) : null}
            {form.values.footer.legal.map((_row, index) => (
              <FooterLegalRow key={`legal-${index}`} form={form} index={index} />
            ))}
            <Group>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() => form.insertListItem('footer.legal', { label: '', href: '' })}
              >
                {t('addFooterLink')}
              </Button>
            </Group>
          </Stack>
        </FormSection>
      </Panel>
    </Stack>
  );
}
