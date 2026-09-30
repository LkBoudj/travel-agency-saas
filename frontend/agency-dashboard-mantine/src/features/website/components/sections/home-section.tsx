import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { FormSection } from '../../../../components/form/form-section.tsx';
import type { WebsiteForm } from '../../hooks/use-website-form.ts';

export interface HomeSectionProps {
  form: WebsiteForm;
}

export function HomeSection({ form }: HomeSectionProps) {
  const { t } = useTranslation('website');

  return (
    <Stack gap="lg">
      <Card withBorder radius="md">
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
      </Card>

      <Card withBorder radius="md">
        <FormSection title={t('sections.trustPoints')} description={t('sectionHints.trustPoints')}>
          <Stack gap="sm">
            {form.values.trustPoints.map((_point, index) => (
              <Group key={`trust-${index}`} gap="sm" align="flex-end" wrap="nowrap">
                <TextInput
                  placeholder={t('placeholders.icon')}
                  w="14%"
                  {...form.getInputProps(`trustPoints.${index}.icon`)}
                />
                <TextInput
                  placeholder={t('placeholders.trustPointTitle')}
                  w="28%"
                  {...form.getInputProps(`trustPoints.${index}.title`)}
                />
                <TextInput
                  placeholder={t('placeholders.trustPointText')}
                  style={{ flex: 1 }}
                  {...form.getInputProps(`trustPoints.${index}.text`)}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label={t('removeTrustPoint')}
                  onClick={() => form.removeListItem('trustPoints', index)}
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
                  form.insertListItem('trustPoints', { icon: '', title: '', text: '' })
                }
              >
                {t('addTrustPoint')}
              </Button>
            </Box>
          </Stack>
        </FormSection>
      </Card>

      <Card withBorder radius="md">
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
      </Card>

      <Card withBorder radius="md">
        <FormSection
          title={t('sections.testimonials')}
          description={t('sectionHints.testimonials')}
        >
          <Stack gap="sm">
            {form.values.testimonials.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('empty.testimonials')}
              </Text>
            ) : null}
            {form.values.testimonials.map((_row, index) => (
              <Group key={`test-${index}`} gap="sm" align="flex-end" wrap="nowrap">
                <Textarea
                  placeholder={t('placeholders.quote')}
                  autosize
                  style={{ flex: 1 }}
                  {...form.getInputProps(`testimonials.${index}.quote`)}
                />
                <TextInput
                  placeholder={t('placeholders.author')}
                  w="22%"
                  {...form.getInputProps(`testimonials.${index}.author`)}
                />
                <TextInput
                  placeholder={t('placeholders.location')}
                  w="18%"
                  {...form.getInputProps(`testimonials.${index}.location`)}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label={t('removeTestimonial')}
                  onClick={() => form.removeListItem('testimonials', index)}
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
                  form.insertListItem('testimonials', { quote: '', author: '', location: '' })
                }
              >
                {t('addTestimonial')}
              </Button>
            </Box>
          </Stack>
        </FormSection>
      </Card>

      <Card withBorder radius="md">
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
      </Card>
    </Stack>
  );
}
