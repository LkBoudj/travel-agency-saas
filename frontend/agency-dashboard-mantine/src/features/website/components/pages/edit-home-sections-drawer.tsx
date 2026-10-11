import { useEffect, useState } from 'react';
import {
  Button,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import type { WebsiteDraftResponse } from '../../types.ts';
import type { HomeSectionsInput } from '../../types/pages.types.ts';

export interface EditHomeSectionsDrawerProps {
  opened: boolean;
  onClose: () => void;
  draft: WebsiteDraftResponse | null;
  onSubmit: (sections: HomeSectionsInput) => Promise<void>;
  loading: boolean;
}

export function EditHomeSectionsDrawer({
  opened,
  onClose,
  draft,
  onSubmit,
  loading,
}: EditHomeSectionsDrawerProps) {
  const content = (draft?.content ?? {}) as Record<string, unknown>;
  const heroContent = (content.hero ?? {}) as Record<string, string>;
  const promoContent = (content.promotion ?? {}) as Record<string, string>;
  const ctaContent = (content.finalCta ?? {}) as Record<string, string>;

  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroImage, setHeroImage] = useState('');

  const [promoEyebrow, setPromoEyebrow] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoText, setPromoText] = useState('');
  const [promoCtaLabel, setPromoCtaLabel] = useState('');
  const [promoCtaHref, setPromoCtaHref] = useState('');

  const [ctaTitle, setCtaTitle] = useState('');
  const [ctaSubtitle, setCtaSubtitle] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaHref, setCtaHref] = useState('');

  useEffect(() => {
    if (opened && draft) {
      setHeroTitle(heroContent.title || '');
      setHeroSubtitle(heroContent.subtitle || '');
      setHeroImage(heroContent.image || '');

      setPromoEyebrow(promoContent.eyebrow || '');
      setPromoTitle(promoContent.title || '');
      setPromoText(promoContent.text || '');
      setPromoCtaLabel(promoContent.ctaLabel || '');
      setPromoCtaHref(promoContent.ctaHref || '');

      setCtaTitle(ctaContent.title || '');
      setCtaSubtitle(ctaContent.subtitle || '');
      setCtaLabel(ctaContent.ctaLabel || '');
      setCtaHref(ctaContent.ctaHref || '');
    }
  }, [opened, draft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentTrustPoints = (
      Array.isArray(content.trustPoints) ? content.trustPoints : []
    ) as Array<{ icon: string; title: string; text: string }>;
    const currentTestimonials = (
      Array.isArray(content.testimonials) ? content.testimonials : []
    ) as Array<{ quote: string; author: string; location: string }>;

    await onSubmit({
      hero: {
        title: heroTitle,
        subtitle: heroSubtitle,
        image: heroImage,
      },
      trustPoints: currentTrustPoints,
      promotion: {
        eyebrow: promoEyebrow,
        title: promoTitle,
        text: promoText,
        ctaLabel: promoCtaLabel,
        ctaHref: promoCtaHref,
      },
      testimonials: currentTestimonials,
      finalCta: {
        title: ctaTitle,
        subtitle: ctaSubtitle,
        ctaLabel,
        ctaHref,
      },
    });
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Customize Home Page Sections"
      position="right"
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg" pb="xl">
          <Text size="sm" c="dimmed">
            Manage the content, headlines, and call-to-actions that appear directly on your public
            homepage.
          </Text>

          {/* Hero Section */}
          <Stack gap="sm">
            <Title order={5}>Hero Banner</Title>
            <TextInput
              label="Headline"
              placeholder="e.g. Discover Extraordinary Journeys"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.currentTarget.value)}
            />
            <Textarea
              label="Subtitle"
              placeholder="e.g. Handcrafted travel experiences designed for unforgettable memories."
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.currentTarget.value)}
              minRows={2}
              autosize
            />
            <TextInput
              label="Background Image URL"
              placeholder="https://..."
              value={heroImage}
              onChange={(e) => setHeroImage(e.currentTarget.value)}
            />
          </Stack>

          <Divider />

          {/* Promotion Section */}
          <Stack gap="sm">
            <Title order={5}>Promotional Campaign</Title>
            <TextInput
              label="Eyebrow"
              placeholder="e.g. Summer Special"
              value={promoEyebrow}
              onChange={(e) => setPromoEyebrow(e.currentTarget.value)}
            />
            <TextInput
              label="Campaign Title"
              placeholder="e.g. Early Bird Discounts for 2026"
              value={promoTitle}
              onChange={(e) => setPromoTitle(e.currentTarget.value)}
            />
            <Textarea
              label="Campaign Description"
              placeholder="Highlight special offers, upcoming seasons, or exclusive discounts."
              value={promoText}
              onChange={(e) => setPromoText(e.currentTarget.value)}
              minRows={2}
              autosize
            />
            <Group grow>
              <TextInput
                label="Button Label"
                placeholder="e.g. Explore Offers"
                value={promoCtaLabel}
                onChange={(e) => setPromoCtaLabel(e.currentTarget.value)}
              />
              <TextInput
                label="Button Link"
                placeholder="e.g. /trips"
                value={promoCtaHref}
                onChange={(e) => setPromoCtaHref(e.currentTarget.value)}
              />
            </Group>
          </Stack>

          <Divider />

          {/* Final CTA Section */}
          <Stack gap="sm">
            <Title order={5}>Closing Call to Action</Title>
            <TextInput
              label="CTA Title"
              placeholder="e.g. Ready for your next adventure?"
              value={ctaTitle}
              onChange={(e) => setCtaTitle(e.currentTarget.value)}
            />
            <TextInput
              label="CTA Subtitle"
              placeholder="e.g. Contact our travel specialists to plan your custom trip."
              value={ctaSubtitle}
              onChange={(e) => setCtaSubtitle(e.currentTarget.value)}
            />
            <Group grow>
              <TextInput
                label="Button Label"
                placeholder="e.g. Start Planning"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.currentTarget.value)}
              />
              <TextInput
                label="Button Link"
                placeholder="e.g. /trips"
                value={ctaHref}
                onChange={(e) => setCtaHref(e.currentTarget.value)}
              />
            </Group>
          </Stack>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              styles={{
                root: {
                  backgroundColor: 'var(--app-action-primary)',
                  fontWeight: 600,
                },
              }}
            >
              Save Sections
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
