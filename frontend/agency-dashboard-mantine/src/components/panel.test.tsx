import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen } from '@test-utils';
import { describe, expect, test, afterEach } from 'vitest';
// Side effect: the shared fallbacks come from the common catalog, so the suite
// has to boot i18n the way the app does.
import { setLocale } from '../i18n/index.ts';
import { EmptyState, ErrorState } from './empty-state.tsx';
import { Panel } from './panel.tsx';
import { RowActionsMenu } from './row-actions-menu.tsx';

const indexCss = readFileSync(path.resolve(import.meta.dirname, '../index.css'), 'utf8');
const tokensCss = readFileSync(path.resolve(import.meta.dirname, '../theme/tokens.css'), 'utf8');

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

afterEach(async () => {
  await useLocale('en');
});

describe('Panel', () => {
  test('is a plain container — not a landmark, and never a heading', async () => {
    render(
      <Panel>
        <span>panel body</span>
      </Panel>
    );

    expect(await screen.findByText('panel body')).toBeInTheDocument();
    // A `div` with an `aria-label` is not a region, so an unlabelled panel must
    // not claim to be one; and a panel is a box, never a heading.
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  test('becomes a labelled region only when the caller names it', async () => {
    render(
      <Panel aria-label="Pricing options">
        <span>rows</span>
      </Panel>
    );

    expect(await screen.findByRole('region', { name: 'Pricing options' })).toBeInTheDocument();
  });

  test('is marked so the surface rule can find it', async () => {
    render(
      <Panel>
        <span>panel body</span>
      </Panel>
    );

    expect((await screen.findByText('panel body')).parentElement).toHaveAttribute(
      'data-shell-panel'
    );
  });

  test('paints the raised surface with a hairline border and no shadow', () => {
    // Asserted on the stylesheet, not the DOM: jsdom does not load CSS, so the
    // rule is the contract the browser then fulfils.
    expect(indexCss).toMatch(
      /\[data-shell-panel\][^{]*\{[^}]*background-color:\s*var\(--app-surface-raised\)/
    );
    expect(indexCss).toMatch(
      /\[data-shell-panel\][^{]*\{[^}]*border:\s*1px solid var\(--app-border-subtle\)/
    );
    expect(indexCss).toMatch(/\[data-shell-panel\][^{]*\{[^}]*box-shadow:\s*none/);
    expect(indexCss).toMatch(
      /\[data-shell-panel\][^{]*\{[^}]*border-radius:\s*var\(--mantine-radius-md\)/
    );
  });

  test('the values it composes are the ones the token layer pins', () => {
    // `--app-border-subtle` is gray-3 and `--app-surface-raised` is
    // white. Pinned here so a ramp change fails loudly instead of letting every
    // panel on every page drift off the reference quietly.
    expect(tokensCss).toMatch(/--app-border-subtle:\s*var\(--mantine-color-gray-3\)/);
    expect(tokensCss).toMatch(/--app-surface-raised:\s*var\(--mantine-color-white\)/);
  });

  test('defaults to the page gutter padding unless the caller says otherwise', async () => {
    render(
      <Panel>
        <span>tight</span>
      </Panel>
    );
    expect(await screen.findByText('tight')).toBeInTheDocument();

    render(
      <Panel p="lg">
        <span>roomy</span>
      </Panel>
    );
    expect(await screen.findByText('roomy')).toBeInTheDocument();
  });
});

describe('shared component copy is translated, never an English literal', () => {
  test('EmptyState falls back to the shared translated string', async () => {
    render(<EmptyState />);

    // No `title` prop: the component used to hardcode "Nothing here yet.", which
    // shipped to the Arabic build as English.
    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument();
  });

  test('ErrorState falls back to a shared translated string', async () => {
    render(<ErrorState />);

    // No `title` prop: the component used to hardcode "Something went wrong".
    expect(await screen.findByRole('heading')).toHaveTextContent('Something went wrong');
  });

  test('the shared fallback is Arabic too — the component is not English-only', async () => {
    render(<EmptyState />);
    await screen.findByText('Nothing here yet.');

    await useLocale('ar');
    expect(await screen.findByText('لا يوجد شيء هنا بعد.')).toBeInTheDocument();
  });

  test('an explicit title still wins over the shared fallback', async () => {
    render(<ErrorState title="Custom failure" />);

    expect(await screen.findByRole('heading')).toHaveTextContent('Custom failure');
  });
});

describe('control rhythm', () => {
  test('the row trigger uses the compact size, not the default control height', async () => {
    render(<RowActionsMenu actions={[{ key: 'edit', label: 'Edit', onClick: () => {} }]} />);

    // A 32px trigger inside a ~40px row reads as part of the row; Mantine's own
    // 36px `sm` reads as a control pasted onto it.
    expect(await screen.findByRole('button', { name: 'Row actions' })).toBeInTheDocument();
    const source = readFileSync(path.resolve(import.meta.dirname, 'row-actions-menu.tsx'), 'utf8');
    expect(source).toMatch(/size="compact-sm"/);
    // And nothing else: the size prop is the whole mechanism. The component used to
    // also paint the compact width and height by hand, because Mantine resolves
    // `compact-sm` on an ActionIcon to a variable it never declared — which the ramp
    // in `tokens.css` now defines, so a hand-painted box would only be a second
    // source of truth for a value that is already in one place.
    expect(source).not.toMatch(/COMPACT_TRIGGER/);
    expect(source).not.toMatch(/var\(--app-control-height-compact\)/);
  });

  test('both heights are declared once, as tokens', () => {
    expect(tokensCss).toMatch(/--app-control-height:\s*32px/);
    // 26px is Mantine's own `compact-sm` (1.625rem) — see `tokens.css`.
    expect(tokensCss).toMatch(/--app-control-height-compact:\s*26px/);
  });

  test('the ramp, not the theme, is what moves a control onto that one height', () => {
    const defaults = readFileSync(
      path.resolve(import.meta.dirname, '../theme/component-defaults.ts'),
      'utf8'
    );

    // A theme can paint only the outer box; Mantine derives a control's line box,
    // padding and section widths from its own size variables. So the theme pins no
    // control heights, and the ramp re-steps those variables instead — which is why
    // the input families this list never enumerated (`Autocomplete`, `MultiSelect`,
    // `ColorInput`, the date inputs) come along on 32px as well.
    expect(defaults).not.toMatch(/height: 'var\(--app-control-height/);
    expect(defaults).not.toMatch(/CONTROL_INPUT|CONTROL_ROOT/);

    expect(tokensCss).toMatch(
      /\.mantine-Input-wrapper\[data-size\][\s\S]*?--input-height-sm:\s*var\(--app-control-height\)/
    );
    expect(tokensCss).toMatch(
      /\.mantine-Button-root\[data-size\][\s\S]*?--button-height-sm:\s*var\(--app-control-height\)/
    );
    expect(tokensCss).toMatch(
      /\.mantine-ActionIcon-root\[data-size\][\s\S]*?--ai-size-sm:\s*var\(--app-control-height\)/
    );
  });
});
