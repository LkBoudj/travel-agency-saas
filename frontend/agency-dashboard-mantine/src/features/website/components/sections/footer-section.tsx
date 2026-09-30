import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Button, Card, Group, Stack, TextInput, Textarea } from '@mantine/core';
import { FormSection } from '../../../../components/form/form-section.tsx';
import type { WebsiteForm } from '../../hooks/use-website-form.ts';

export interface FooterSectionProps {
  form: WebsiteForm;
}

export function FooterSection({ form }: FooterSectionProps) {
  const { t } = useTranslation('website');

  return (
    <Stack gap="lg">
      <Card withBorder radius="md">
        <FormSection title={t('sections.footer')} description={t('sectionHints.footerDescription')}>
          <Textarea
            label={t('fields.footerDescription')}
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps('footer.description')}
          />
        </FormSection>
      </Card>

      <Card withBorder radius="md">
        <FormSection
          title={t('sections.footerColumns')}
          description={t('sectionHints.footerColumns')}
        >
          <Stack gap="md">
            {form.values.footer.columns.map((_column, columnIndex) => (
              <Stack key={`col-${columnIndex}`} gap="sm">
                <Group gap="sm" align="flex-end" wrap="nowrap">
                  <TextInput
                    placeholder={t('placeholders.columnTitle')}
                    style={{ flex: 1 }}
                    {...form.getInputProps(`footer.columns.${columnIndex}.title`)}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t('removeFooterColumn')}
                    onClick={() => form.removeListItem('footer.columns', columnIndex)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                <Stack gap={6} pl="md">
                  {form.values.footer.columns[columnIndex].links.map((_link, linkIndex) => (
                    <Group
                      key={`link-${columnIndex}-${linkIndex}`}
                      gap="sm"
                      align="flex-end"
                      wrap="nowrap"
                    >
                      <TextInput
                        placeholder={t('placeholders.navLabel')}
                        style={{ flex: 1 }}
                        {...form.getInputProps(
                          `footer.columns.${columnIndex}.links.${linkIndex}.label`
                        )}
                      />
                      <TextInput
                        placeholder={t('placeholders.href')}
                        style={{ flex: 1 }}
                        {...form.getInputProps(
                          `footer.columns.${columnIndex}.links.${linkIndex}.href`
                        )}
                      />
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={t('removeFooterLink')}
                        onClick={() =>
                          form.removeListItem(`footer.columns.${columnIndex}.links`, linkIndex)
                        }
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
                      onClick={() =>
                        form.insertListItem(`footer.columns.${columnIndex}.links`, {
                          label: '',
                          href: '',
                        })
                      }
                    >
                      {t('addFooterLink')}
                    </Button>
                  </Box>
                </Stack>
              </Stack>
            ))}
            <Box>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() => form.insertListItem('footer.columns', { title: '', links: [] })}
              >
                {t('addFooterColumn')}
              </Button>
            </Box>
          </Stack>
        </FormSection>
      </Card>

      <Card withBorder radius="md">
        <FormSection title={t('sections.footerLegal')} description={t('sectionHints.footerLegal')}>
          <Stack gap="sm">
            {form.values.footer.legal.map((_row, index) => (
              <Group key={`legal-${index}`} gap="sm" align="flex-end" wrap="nowrap">
                <TextInput
                  placeholder={t('placeholders.navLabel')}
                  style={{ flex: 1 }}
                  {...form.getInputProps(`footer.legal.${index}.label`)}
                />
                <TextInput
                  placeholder={t('placeholders.href')}
                  style={{ flex: 1 }}
                  {...form.getInputProps(`footer.legal.${index}.href`)}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label={t('removeFooterLink')}
                  onClick={() => form.removeListItem('footer.legal', index)}
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
                onClick={() => form.insertListItem('footer.legal', { label: '', href: '' })}
              >
                {t('addFooterLink')}
              </Button>
            </Box>
          </Stack>
        </FormSection>
      </Card>
    </Stack>
  );
}
