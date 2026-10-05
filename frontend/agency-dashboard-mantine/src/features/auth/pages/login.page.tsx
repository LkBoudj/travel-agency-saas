// app-allow-raw-hex: travel watermark illustrations and brand icons
import { IconMoon, IconPlane, IconSun } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import loginHero from '../../../assets/images/auth/login-hero.jpg';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { setLocale } from '../../../i18n/index.ts';
import { LoginForm } from '../components/login-form.tsx';

/** How far the copy can sit from the top, as a fraction of the panel. */
const HERO_WASH = 0.34;

function BrandPaperPlaneIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M21 3L14.5 21a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1L21 3z" fill="#ffffff" />
      <path d="M10 14L21 3" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="1.4" />
    </svg>
  );
}

function LuggageSolidIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 5V3.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.5 1.5V5"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="3" y="5" width="18" height="16" rx="3.5" fill="#ffffff" />
      <path
        d="M7.5 5v16M16.5 5v16M3 13h18"
        stroke="rgba(10, 50, 110, 0.55)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UsersSolidIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" fill="#ffffff" />
      <path d="M3 19.5c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#ffffff" />
      <circle cx="16.5" cy="9" r="2.8" fill="#ffffff" />
      <path d="M15.5 14.2c2.2.4 3.8 2 3.8 4.3v1h-4.5" fill="#ffffff" />
    </svg>
  );
}

function GrowthChartSolidIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="3.5" fill="#ffffff" />
      <rect x="5" y="13" width="3" height="6" rx="1.5" fill="rgba(10, 50, 110, 0.6)" />
      <rect x="10.5" y="9.5" width="3" height="9.5" rx="1.5" fill="rgba(10, 50, 110, 0.6)" />
      <rect x="16" y="6" width="3" height="13" rx="1.5" fill="rgba(10, 50, 110, 0.6)" />
      <path
        d="M5 10.5 Q 11 7.5 18 4.5"
        stroke="rgba(10, 50, 110, 0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function TravelIllustrationWatermark() {
  return (
    <Box
      pos="absolute"
      bottom={0}
      style={{
        insetInlineStart: 0,
        insetInlineEnd: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        lineHeight: 0,
      }}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="125"
        viewBox="0 0 460 125"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.85 }}
      >
        {/* Back rolling mountains */}
        <path
          d="M0 125 L0 85 Q40 65 90 80 Q140 55 200 75 Q260 50 320 78 Q380 60 460 82 L460 125 Z"
          fill="#dbeafe"
          fillOpacity="0.45"
        />

        {/* Left palm tree silhouette */}
        <g transform="translate(115, 58) scale(0.65)" fill="#93c5fd" fillOpacity="0.4">
          <path d="M12 45 Q13 25 10 0 Q11 0 14 25 Q13 45 12 45 Z" />
          <path d="M10 0 Q2 -10 -10 -5 Q-2 2 10 0 Z" />
          <path d="M10 0 Q2 -15 8 -22 Q12 -12 10 0 Z" />
          <path d="M10 0 Q20 -18 24 -12 Q18 -5 10 0 Z" />
          <path d="M10 0 Q25 -8 30 -2 Q20 4 10 0 Z" />
        </g>

        {/* Foreground mountains */}
        <path
          d="M0 125 L0 98 Q60 80 120 92 Q180 68 240 85 Q310 62 380 88 Q420 80 460 92 L460 125 Z"
          fill="#bfdbfe"
          fillOpacity="0.55"
        />

        {/* Airplane contrail / flight path */}
        <path
          d="M130 90 Q 190 86 230 78 T 275 62"
          stroke="#93c5fd"
          strokeWidth="1.5"
          strokeDasharray="2 3"
          strokeLinecap="round"
          strokeOpacity="0.55"
          fill="none"
        />

        {/* Passenger airplane climbing towards top-right */}
        <g transform="translate(280, 48) rotate(-22) scale(0.85)" fill="#60a5fa" fillOpacity="0.75">
          <path d="M0 8 Q15 6 36 7 Q44 7.5 48 9 Q44 10.5 36 11 Q15 12 0 10 Z" />
          <path d="M18 10 L10 24 L14 24 L26 10 Z" />
          <path d="M22 7 L16 -3 L19 -3 L28 7 Z" />
          <path d="M18 16 Q20 15 23 16 Q24 18 21 18 Q19 18 18 16 Z" />
          <path d="M2 8 L-6 -2 L-2 -2 L7 8 Z" />
          <path d="M4 10 L0 15 L2 15 L7 10 Z" />
        </g>

        {/* Right prominent palm tree */}
        <g transform="translate(415, 20) scale(1.05)" fill="#60a5fa" fillOpacity="0.65">
          <path d="M16 95 Q18 55 14 0 Q16 0 20 55 Q18 95 16 95 Z" />
          <path d="M14 0 Q3 -15 -14 -8 Q-5 4 14 0 Z" />
          <path d="M14 0 Q-2 -22 6 -30 Q12 -16 14 0 Z" />
          <path d="M14 0 Q14 -32 20 -32 Q20 -15 14 0 Z" />
          <path d="M14 0 Q28 -25 34 -18 Q26 -8 14 0 Z" />
          <path d="M14 0 Q36 -12 42 -4 Q28 6 14 0 Z" />
          <path d="M14 0 Q32 10 36 20 Q24 16 14 0 Z" />
          <path d="M14 0 Q-4 12 -8 22 Q4 15 14 0 Z" />
        </g>
      </svg>
    </Box>
  );
}

export function LoginPage() {
  const { t } = useTranslation('auth');
  const locale = useAppLocale();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const benefits = [
    { key: 'manage' as const, icon: LuggageSolidIcon },
    { key: 'grow' as const, icon: UsersSolidIcon },
    { key: 'increase' as const, icon: GrowthChartSolidIcon },
  ];

  return (
    <Paper
      withBorder
      shadow="xl"
      radius={20}
      bg="var(--app-surface-raised)"
      maw={1080}
      w="100%"
      style={{
        overflow: 'hidden',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.04)',
      }}
    >
      <Flex direction={{ base: 'column', md: 'row' }} mih={{ base: 'auto', md: 640 }}>
        {/* Left hero banner */}
        <Box
          w={{ base: '100%', md: '48%' }}
          display={{ base: 'none', md: 'flex' }}
          pos="relative"
          data-login-hero=""
          style={{
            backgroundImage: `url(${loginHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'var(--app-surface-nav)',
              opacity: HERO_WASH,
            }}
          />
          <Stack
            justify="flex-start"
            h="100%"
            p={{ base: 'xl', md: 40 }}
            pos="relative"
            gap={0}
            w="100%"
          >
            <Group gap={10} align="center">
              <BrandPaperPlaneIcon />
              <Title
                order={1}
                c="var(--app-nav-text-active)"
                fz={{ base: 26, md: 30 }}
                fw={700}
                lh={1}
              >
                {t('login.brand')}
              </Title>
            </Group>
            <Stack gap="md" mt="auto">
              <Stack gap={0}>
                <Text
                  c="var(--app-nav-text-active)"
                  fz={{ base: 26, md: 32 }}
                  fw={700}
                  lh={1.16}
                  style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.25)' }}
                >
                  {t('login.heroLine1')}
                  <br />
                  {t('login.heroLine2')}
                </Text>
                <Text
                  c="var(--app-nav-text-active)"
                  size="sm"
                  maw={330}
                  mt="sm"
                  lh={1.5}
                  style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.25)' }}
                >
                  {t('login.heroBody')}
                </Text>
              </Stack>
              <Box
                style={{
                  background: 'rgba(255, 255, 255, 0.26)',
                  border: '1px solid rgba(255, 255, 255, 0.40)',
                  borderRadius: '16px',
                  padding: '16px 8px',
                  display: 'flex',
                  alignItems: 'stretch',
                  justifyContent: 'space-between',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
                  width: '100%',
                  marginTop: '16px',
                }}
              >
                {benefits.map(({ key, icon: IconComponent }) => (
                  <Box
                    key={key}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      gap: '8px',
                    }}
                  >
                    <Box
                      style={{
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComponent />
                    </Box>
                    <Stack gap={1} align="center">
                      <Text
                        size="xs"
                        fw={700}
                        c="var(--app-nav-text-active)"
                        lh={1.2}
                        style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}
                      >
                        {t(`login.benefits.${key}.title`)}
                      </Text>
                      <Text
                        size="xs"
                        fw={600}
                        c="var(--app-nav-text-active)"
                        lh={1.2}
                        style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}
                      >
                        {t(`login.benefits.${key}.detail`)}
                      </Text>
                    </Stack>
                  </Box>
                ))}
              </Box>
            </Stack>
          </Stack>
        </Box>
        {/* Right form container */}
        <Box
          w={{ base: '100%', md: '52%' }}
          p={{ base: 'lg', md: 44 }}
          pos="relative"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* Header controls: language switcher & theme toggle */}
          <Group justify="flex-end" gap={8} align="center" pos="relative" style={{ zIndex: 1 }}>
            <Group gap={2} align="center">
              <Button
                size="compact-xs"
                variant="subtle"
                color={locale === 'en' ? 'blue' : 'gray'}
                fw={locale === 'en' ? 600 : 400}
                aria-pressed={locale === 'en'}
                aria-label={t('login.lang.en')}
                onClick={() => setLocale('en')}
                styles={{
                  root: {
                    padding: '0 4px',
                    fontSize: '13px',
                  },
                }}
              >
                {t('login.lang.en')}
              </Button>
              <Text size="xs" c="dimmed">
                |
              </Text>
              <Button
                size="compact-xs"
                variant="subtle"
                color={locale === 'ar' ? 'blue' : 'gray'}
                fw={locale === 'ar' ? 600 : 400}
                aria-pressed={locale === 'ar'}
                aria-label={t('login.lang.ar')}
                onClick={() => setLocale('ar')}
                styles={{
                  root: {
                    padding: '0 4px',
                    fontSize: '13px',
                  },
                }}
              >
                {t('login.lang.ar')}
              </Button>
            </Group>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => toggleColorScheme()}
              aria-label={t('login.toggleTheme')}
            >
              {colorScheme === 'dark' ? (
                <IconMoon size={18} stroke={1.5} />
              ) : (
                <IconSun size={18} stroke={1.5} />
              )}
            </ActionIcon>
          </Group>
          {/* Main login form column */}
          <Stack
            gap="lg"
            justify="center"
            flex={1}
            maw={390}
            mx="auto"
            my="auto"
            w="100%"
            pos="relative"
            style={{ zIndex: 1 }}
          >
            <Group gap="xs" hiddenFrom="md">
              <IconPlane size={20} stroke={1.5} color="var(--mantine-color-dimmed)" aria-hidden />
              <Text fw={700} fz="lg">
                {t('login.brand')}
              </Text>
            </Group>
            <Stack gap={6}>
              <Title order={2} fw={700} fz={{ base: 24, sm: 28 }} c="var(--mantine-color-text)">
                {t('login.title')}
              </Title>
              <Text c="dimmed" size="sm">
                {t('login.subtitle')}
              </Text>
            </Stack>
            <LoginForm />
          </Stack>
          <TravelIllustrationWatermark />
        </Box>
      </Flex>
    </Paper>
  );
}
