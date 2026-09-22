import type { MantineColorsTuple } from '@mantine/core';

export const brand: MantineColorsTuple = [
  '#F0FDF4',
  '#DCFCE7',
  '#BBF7D0',
  '#86EFAC',
  '#4ADE80',
  '#22C55E',
  '#16A34A',
  '#15803D',
  '#166534',
  '#14532D',
];

export const dark: MantineColorsTuple = [
  '#F8FAFC',
  '#E2E8F0',
  '#94A3B8',
  '#64748B',
  '#475569',
  '#334155',
  '#1B2336',
  '#0F172A',
  '#0B1324',
  '#060B14',
];

export const gray: MantineColorsTuple = [
  '#F8FAFB',
  '#F1F4F6',
  '#E4E8EC',
  '#D3D9DF',
  '#B4BEC7',
  '#94A0AB',
  '#6B7886',
  '#4A5664',
  '#2F3945',
  '#1B222C',
];

export const success: MantineColorsTuple = [
  '#EFFAF1',
  '#DCF4E0',
  '#B8E8C2',
  '#8DD9A0',
  '#5EC77D',
  '#3BB261',
  '#2E9E53',
  '#258444',
  '#1E6B39',
  '#17532D',
];

export const warning: MantineColorsTuple = [
  '#FFF9EC',
  '#FDEFCC',
  '#FADF9A',
  '#F6CB66',
  '#F2B73C',
  '#EDA423',
  '#E08F14',
  '#B87112',
  '#91590F',
  '#6F440C',
];

export const danger: MantineColorsTuple = [
  '#FDF3F2',
  '#FBE3E0',
  '#F6C6C1',
  '#EFA29A',
  '#E77B72',
  '#DD574D',
  '#CE3D33',
  '#AC3129',
  '#8A2922',
  '#6B201B',
];

export const info: MantineColorsTuple = [
  '#F0F6FE',
  '#DCEAFD',
  '#B8D5FB',
  '#8DBCF7',
  '#5D9EF2',
  '#3B83EC',
  '#2F6FE0',
  '#2758B4',
  '#21478E',
  '#1A386D',
];

export const colors: Record<string, MantineColorsTuple> = {
  brand,
  dark,
  gray,
  success,
  warning,
  danger,
  info,
};

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  ARCHIVED: 'gray',
  DRAFT: 'gray',
  PUBLISHED: 'success',
  OPEN: 'success',
  CLOSED: 'gray',
  CANCELLED: 'danger',
  PENDING: 'warning',
  CONFIRMED: 'success',
  deactivated: 'gray',
  INVITED: 'info',
  REMOVED: 'danger',
};
