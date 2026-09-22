import {
  IconChecklist,
  IconInfoCircle,
  IconListDetails,
  IconMapPin,
  IconPhoto,
  IconRoute,
  IconTags,
  IconUserCheck,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Stack } from '@mantine/core';

export type TripEditorSectionId =
  | 'overview'
  | 'destinations'
  | 'content'
  | 'categories'
  | 'lists'
  | 'itinerary'
  | 'details'
  | 'requirements';

const NAV_SECTIONS: readonly {
  id: TripEditorSectionId;
  labelKey: string;
  icon: React.ReactNode;
}[] = [
  { id: 'overview', labelKey: 'editor.sections.overview', icon: <IconListDetails size={16} /> },
  { id: 'destinations', labelKey: 'editor.sections.destinations', icon: <IconMapPin size={16} /> },
  { id: 'content', labelKey: 'editor.sections.content', icon: <IconPhoto size={16} /> },
  { id: 'categories', labelKey: 'editor.sections.categories', icon: <IconTags size={16} /> },
  { id: 'lists', labelKey: 'editor.sections.lists', icon: <IconChecklist size={16} /> },
  { id: 'itinerary', labelKey: 'editor.sections.itinerary', icon: <IconRoute size={16} /> },
  { id: 'details', labelKey: 'editor.sections.details', icon: <IconInfoCircle size={16} /> },
  {
    id: 'requirements',
    labelKey: 'editor.sections.requirements',
    icon: <IconUserCheck size={16} />,
  },
];

export interface TripEditorNavProps {
  active: TripEditorSectionId;
  onChange: (section: TripEditorSectionId) => void;
}

export function TripEditorNav({ active, onChange }: TripEditorNavProps) {
  const { t } = useTranslation('trips');

  return (
    <Stack gap={4}>
      {NAV_SECTIONS.map((section) => (
        <Button
          key={section.id}
          variant={active === section.id ? 'light' : 'subtle'}
          color={active === section.id ? 'brand' : undefined}
          justify="flex-start"
          fullWidth
          leftSection={section.icon}
          onClick={() => onChange(section.id)}
        >
          {t(section.labelKey)}
        </Button>
      ))}
    </Stack>
  );
}
