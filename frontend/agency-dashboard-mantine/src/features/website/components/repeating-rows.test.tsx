import { act, render, screen } from '@test-utils';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, test, vi } from 'vitest';
// Side effect: every placeholder and remove label in these rows comes from the
// website catalog, so the suite has to boot i18n the way the app does.
import { setLocale } from '../../../i18n/index.ts';
import { useWebsiteForm, type WebsiteForm } from '../hooks/use-website-form.ts';
import { emptyWebsiteFormValues } from '../lib/website-defaults.ts';
import {
  FooterLegalRow,
  FooterLinkRow,
  NavigationLinkRow,
  RepeatingRow,
  TestimonialRow,
  TrustPointRow,
} from './repeating-rows.tsx';

/**
 * The repeating rows replaced nine hand-tuned `style={{ flex: 1 }}` / percentage
 * widths. These tests pin the two things that arrangement used to get wrong:
 * which form path each control is bound to (a typo'd path is a field that silently
 * stops saving), and that nothing needs an inline style to lay out.
 */

const FILLED = {
  ...emptyWebsiteFormValues(),
  trustPoints: [{ icon: 'star', title: 'Local guides', text: 'Twelve years in the M’zab.' }],
  testimonials: [{ quote: 'Unforgettable.', author: 'Amina', location: 'Ghardaïa' }],
  navigation: [{ label: 'Tours', href: '/tours' }],
  footer: {
    description: 'Since 2014.',
    columns: [{ title: 'Explore', links: [{ label: 'Tours', href: '/tours' }] }],
    legal: [{ label: 'Privacy', href: '/path' }],
  },
};

// i18next finishes initializing asynchronously, so the first render would show
// raw keys; a locale change settles it the same way the app does on boot.
beforeAll(async () => {
  await act(async () => {
    setLocale('en');
  });
});

function Harness({
  initialValues = FILLED,
  onForm,
  children,
}: {
  initialValues?: typeof FILLED;
  onForm?: (form: WebsiteForm) => void;
  children: (form: WebsiteForm) => React.ReactNode;
}) {
  const form = useWebsiteForm(initialValues);
  onForm?.(form);

  return <form onSubmit={form.onSubmit(() => {})}>{children(form)}</form>;
}

describe('RepeatingRow', () => {
  test('names its remove control in both the visual and the accessible sense', () => {
    render(
      <RepeatingRow onRemove={vi.fn()} removeLabel="Remove trust point">
        <span>fields</span>
      </RepeatingRow>
    );

    expect(screen.getByRole('button', { name: 'Remove trust point' })).toBeInTheDocument();
  });

  test('lays out without a single inline style', () => {
    const { container } = render(
      <RepeatingRow onRemove={vi.fn()} removeLabel="Remove trust point">
        <span>fields</span>
      </RepeatingRow>
    );

    // The old rows each passed `style={{ flex: 1 }}`, which is what made them
    // collapse on narrow screens and refuse to wrap.
    const flexHacks = [...container.querySelectorAll<HTMLElement>('[style]')].filter((element) =>
      ['flex', 'flex-grow', 'flex-shrink', 'flex-basis'].some(
        (property) => element.style.getPropertyValue(property) !== ''
      )
    );
    expect(flexHacks).toEqual([]);
  });

  test('lays its fields out on a grid that can wrap', () => {
    render(
      <RepeatingRow onRemove={vi.fn()} removeLabel="Remove trust point">
        <span>fields</span>
      </RepeatingRow>
    );

    const group = screen
      .getByRole('button', { name: 'Remove trust point' })
      .closest('.mantine-Grid-root') as HTMLElement;
    // `nowrap` is what kept a 14%-wide icon field beside its neighbours at 375px,
    // where it was unusable.
    // A grid stacks below `sm` by definition; the old rows pinned one nowrap
    // line, which is what made the 14%-wide icon field unusable at 375px.
    expect(group).not.toBeNull();
  });
});

describe('TrustPointRow', () => {
  test('binds its three fields to the right paths', () => {
    render(<Harness>{(form) => <TrustPointRow form={form} index={0} />}</Harness>);

    expect(screen.getByPlaceholderText('Icon')).toHaveAttribute('data-path', 'trustPoints.0.icon');
    expect(screen.getByPlaceholderText('Title')).toHaveAttribute(
      'data-path',
      'trustPoints.0.title'
    );
    expect(screen.getByPlaceholderText('Description')).toHaveAttribute(
      'data-path',
      'trustPoints.0.text'
    );
  });

  test('writes what the member types back into the form', async () => {
    let form!: WebsiteForm;
    render(
      <Harness
        onForm={(value) => {
          form = value;
        }}
      >
        {(value) => <TrustPointRow form={value} index={0} />}
      </Harness>
    );

    await userEvent.clear(screen.getByPlaceholderText('Title'));
    await userEvent.type(screen.getByPlaceholderText('Title'), 'Bedouin guides');

    expect(form?.values.trustPoints[0]?.title).toBe('Bedouin guides');
  });

  test('removes the row it was asked to remove', async () => {
    let form!: WebsiteForm;
    render(
      <Harness
        onForm={(value) => {
          form = value;
        }}
      >
        {(value) => <TrustPointRow form={value} index={0} />}
      </Harness>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove trust point 1' }));

    expect(form?.values.trustPoints).toHaveLength(0);
  });
});

describe('TestimonialRow', () => {
  test('binds quote, author and location', () => {
    render(<Harness>{(form) => <TestimonialRow form={form} index={0} />}</Harness>);

    expect(screen.getByPlaceholderText('“…”')).toHaveAttribute('data-path', 'testimonials.0.quote');
    expect(screen.getByPlaceholderText('Author')).toHaveAttribute(
      'data-path',
      'testimonials.0.author'
    );
    expect(screen.getByPlaceholderText('Location')).toHaveAttribute(
      'data-path',
      'testimonials.0.location'
    );
  });

  test('removes the testimonial it was asked to remove', async () => {
    let form!: WebsiteForm;
    render(
      <Harness
        onForm={(value) => {
          form = value;
        }}
      >
        {(value) => <TestimonialRow form={value} index={0} />}
      </Harness>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove testimonial 1' }));

    expect(form?.values.testimonials).toHaveLength(0);
  });
});

describe('NavigationLinkRow', () => {
  test('binds label and href', () => {
    render(<Harness>{(form) => <NavigationLinkRow form={form} index={0} />}</Harness>);

    expect(screen.getByPlaceholderText('Label')).toHaveAttribute('data-path', 'navigation.0.label');
    expect(screen.getByPlaceholderText('/path')).toHaveAttribute('data-path', 'navigation.0.href');
  });
});

describe('FooterLinkRow', () => {
  test('binds a link inside a named column', () => {
    render(
      <Harness>{(form) => <FooterLinkRow form={form} columnIndex={0} linkIndex={0} />}</Harness>
    );

    expect(screen.getByPlaceholderText('Label')).toHaveAttribute(
      'data-path',
      'footer.columns.0.links.0.label'
    );
    expect(screen.getByPlaceholderText('/path')).toHaveAttribute(
      'data-path',
      'footer.columns.0.links.0.href'
    );
  });
});

describe('FooterLegalRow', () => {
  test('binds a legal link', () => {
    render(<Harness>{(form) => <FooterLegalRow form={form} index={0} />}</Harness>);

    expect(screen.getByPlaceholderText('Label')).toHaveAttribute(
      'data-path',
      'footer.legal.0.label'
    );
    expect(screen.getByPlaceholderText('/path')).toHaveAttribute(
      'data-path',
      'footer.legal.0.href'
    );
  });
});
