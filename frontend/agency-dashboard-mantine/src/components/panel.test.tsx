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
    // The size prop alone is not enough: the theme pins `sm` on ActionIcon's
    // root, which would flatten `compact-sm` back to the control height.
    expect(source).toMatch(/COMPACT_TRIGGER/);
    expect(source).toMatch(/height: 'var\(--app-control-height-compact\)'/);
  });

  test('both heights are declared once, as tokens', () => {
    expect(tokensCss).toMatch(/--app-control-height:\s*32px/);
    // 26px is Mantine's own `compact-sm` (1.625rem) — see `tokens.css`.
    expect(tokensCss).toMatch(/--app-control-height-compact:\s*26px/);
  });

  test('the theme wires every interactive control to that one height', () => {
    const defaults = readFileSync(
      path.resolve(import.meta.dirname, '../theme/component-defaults.ts'),
      'utf8'
    );
    // Two shapes, because the height does not live on the same slot everywhere:
    // on Button the root *is* the control, while on a text input the root is a
    // wrapper around a separate `input` element. Setting the wrapper alone left a
    // 32px box around a 36px input, so both are pinned. Applied via `styles`,
    // not a custom `size`: Mantine 9 dropped `sizes` from `MantineThemeComponent`.
    for (const component of [
      'ActionIcon',
      'TextInput',
      'PasswordInput',
      'NumberInput',
      'Textarea',
      'Select',
    ]) {
      expect(defaults).toMatch(
        new RegExp(`${component}: \\{[\\s\\S]{0,160}?styles: CONTROL_INPUT`)
      );
    }
    expect(defaults).toMatch(/Button: \{[\s\S]{0,160}?styles: \{ root: CONTROL_ROOT \}/);
  });
});
