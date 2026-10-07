import type { ReactNode } from 'react';
import { Box, type BoxProps, type ElementProps } from '@mantine/core';

/**
 * The one white surface a page puts content on.
 *
 * `Card` was doing two unrelated jobs: the genuine catalogue tile (a theme card
 * with media, an agency you can pick) and the plain white box most sections are
 * built from. Only the first is a card. This is the second — a hairline
 * `--app-border-subtle` border, a 6px radius, no shadow, and no implied
 * elevation.
 *
 * Shadow is the reason this exists at all: two bordered panels stacked on the
 * gray-0 page each carrying a shadow read as two objects floating above the
 * workspace instead of two regions of one page. The hairline alone draws the
 * boundary.
 *
 * The visual contract lives in `index.css` under `.app-panel`, not in a prop
 * soup here, so it is declared once and readable in one place. `data-shell-panel`
 * is on the element for the same reason `[data-shell-nav]` is: a test, and a
 * future override, can find it without depending on the class name.
 */
export function Panel({
  children,
  p,
  style,
  ...props
}: { children: ReactNode } & BoxProps & ElementProps<'div'>) {
  // A `div` with an `aria-label` is not a landmark, so an unlabelled panel must
  // not pretend to be one. Promoting to `section` the moment the caller names it
  // makes the label mean something.
  const labelled = typeof props['aria-label'] === 'string';

  return (
    <Box
      component={labelled ? 'section' : 'div'}
      className="app-panel"
      data-shell-panel=""
      p={p ?? 'md'}
      style={p === 0 ? { overflow: 'hidden', ...style } : style}
      {...props}
    >
      {children}
    </Box>
  );
}
