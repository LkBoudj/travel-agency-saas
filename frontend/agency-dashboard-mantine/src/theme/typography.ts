export const fontFamily =
  'Fira Sans, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const fontFamilyMonospace =
  '"Fira Code Variable", "Fira Code", ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace';

export const fontSizes = {
  xs: '0.75rem',
  sm: '0.8125rem',
  md: '0.875rem',
  lg: '1rem',
  xl: '1.25rem',
} as const;

export const lineHeights = {
  xs: '1.3rem',
  sm: '1.35rem',
  md: '1.55rem',
  lg: '1.75rem',
  xl: '2rem',
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  bold: '600',
} as const;

export const headings = {
  fontFamily,
  fontWeight: '600',
  textWrap: 'balance',
  sizes: {
    h1: { fontSize: 'var(--app-heading-h1)', lineHeight: '1.25' },
    h2: { fontSize: 'var(--app-heading-h2)', lineHeight: '1.3' },
    h3: { fontSize: 'var(--app-heading-h3)', lineHeight: '1.35' },
    h4: { fontSize: 'var(--app-heading-h4)', lineHeight: '1.4' },
    h5: { fontSize: 'var(--app-heading-h5)', lineHeight: '1.4' },
    h6: { fontSize: 'var(--app-heading-h6)', lineHeight: '1.45' },
  },
} as const;
