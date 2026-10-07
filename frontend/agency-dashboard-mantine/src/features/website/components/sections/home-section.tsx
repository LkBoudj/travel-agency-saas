import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Group, Stack, TextInput, Textarea } from '@mantine/core';
import { EmptyState } from '../../../../components/empty-state.tsx';
import { FormSection } from '../../../../components/form/form-section.tsx';
import { Panel } from '../../../../components/panel.tsx';
import type { WebsiteForm } from '../../hooks/use-website-form.ts';
import { TestimonialRow, TrustPointRow } from '../repeating-rows.tsx';

export interface HomeSectionProps {
  form: WebsiteForm;
}

export function HomeSection({ form }: HomeSectionProps) {
  const { t } = useTranslation('website');

  return (
    <Stack gap="lg">
      <Panel>
        <FormSection title={t('sections.hero')} description={t('sectionHints.hero')}>
          <TextInput
            label={t('fields.image')}
            placeholder={t('placeholders.image')}
            {...form.getInputProps('hero.image')}
          />
          {form.values.hero.image.trim().length > 0 ? (
            <Avatar
              src={form.values.hero.image.trim()}
              size="xl"
              radius="md"
              imageProps={{ referrerPolicy: 'no-referrer' }}
            />
          ) : null}
          <TextInput label={t('fields.heroTitle')} {...form.getInputProps('hero.title')} />
          <Textarea
            label={t('fields.heroSubtitle')}
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps('hero.subtitle')}
          />
        </FormSection>
      </Panel>

      <Panel>
        <FormSection title={t('sections.trustPoints')} description={t('sectionHints.trustPoints')}>
          <Stack gap="sm">
            {form.values.trustPoints.length === 0 ? (
              <EmptyState compact title={t('empty.trustPoints')} />
            ) : null}
            {form.values.trustPoints.map((_point, index) => (
              <TrustPointRow key={`trust-${index}`} form={form} index={index} />
            ))}
            <Group>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() =>
                  form.insertListItem('trustPoints', { icon: '', title: '', text: '' })
                }
              >
                {t('addTrustPoint')}
              </Button>
            </Group>
          </Stack>
        </FormSection>
      </Panel>

      <Panel>
        <FormSection title={t('sections.promotion')} description={t('sectionHints.promotion')}>
          <TextInput label={t('fields.eyebrow')} {...form.getInputProps('promotion.eyebrow')} />
          <TextInput label={t('fields.title')} {...form.getInputProps('promotion.title')} />
          <Textarea
            label={t('fields.body')}
            autosize
            minRows={2}
            maxRows={6}
            {...form.getInputProps('promotion.text')}
          />
          <Group grow>
            <TextInput label={t('fields.ctaLabel')} {...form.getInputProps('promotion.ctaLabel')} />
            <TextInput
              label={t('fields.ctaHref')}
              placeholder={t('placeholders.href')}
              {...form.getInputProps('promotion.ctaHref')}
            />
          </Group>
        </FormSection>
      </Panel>

      <Panel>
        <FormSection
          title={t('sections.testimonials')}
          description={t('sectionHints.testimonials')}
        >
          <Stack gap="sm">
            {form.values.testimonials.length === 0 ? (
              <EmptyState compact title={t('empty.testimonials')} />
            ) : null}
            {form.values.testimonials.map((_row, index) => (
              <TestimonialRow key={`test-${index}`} form={form} index={index} />
            ))}
            <Group>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() =>
                  form.insertListItem('testimonials', { quote: '', author: '', location: '' })
                }
              >
                {t('addTestimonial')}
              </Button>
            </Group>
          </Stack>
        </FormSection>
      </Panel>

      <Panel>
        <FormSection title={t('sections.finalCta')} description={t('sectionHints.finalCta')}>
          <TextInput label={t('fields.title')} {...form.getInputProps('finalCta.title')} />
          <Textarea
            label={t('fields.subtitle')}
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps('finalCta.subtitle')}
          />
          <Group grow>
            <TextInput label={t('fields.ctaLabel')} {...form.getInputProps('finalCta.ctaLabel')} />
            <TextInput
              label={t('fields.ctaHref')}
              placeholder={t('placeholders.href')}
              {...form.getInputProps('finalCta.ctaHref')}
            />
          </Group>
        </FormSection>
      </Panel>
    </Stack>
  );
}
