import type { MantineColorsTuple } from '@mantine/core';

export const brand: MantineColorsTuple = [
  '#EEF9F7',
  '#D8F1ED',
  '#B0E5DC',
  '#83D4C8',
  '#57BFB1',
  '#31AA9A',
  '#1E9587',
  '#18786D',
  '#135C54',
  '#0E423C',
];

export const dark: MantineColorsTuple = [
  '#C6CED6',
  '#ABB8C2',
  '#8E9CA9',
  '#6E7E8D',
  '#556776',
  '#42515F',
  '#34404C',
  '#28323C',
  '#1E262E',
  '#151B21',
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
