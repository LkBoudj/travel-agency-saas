import { render, screen } from '@test-utils';
import { describe, expect, test } from 'vitest';
import { SectionHeader } from './section-header.tsx';

/**
 * `PageHeader` owns the page's single `h1`; this is the same shape one level
 * down. The tests pin the heading level, because getting it wrong is invisible
 * in a screenshot and very visible to anyone navigating by heading.
 */
describe('SectionHeader', () => {
  test('renders a real h2 by default, not another h1', () => {
    render(<SectionHeader title="Published departures" />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Published departures' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  test('can step down a level for a nested section', () => {
    render(<SectionHeader title="Options" h={3} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Options' })).toBeInTheDocument();
  });

  test('states what the section is for when a description is given', () => {
    render(<SectionHeader title="Departures" description="Every scheduled run." />);

    expect(screen.getByText('Every scheduled run.')).toBeInTheDocument();
  });

  test('omits the description line entirely when there is none', () => {
    const { container } = render(<SectionHeader title="Departures" />);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  test('keeps a count beside the title instead of stacking it', () => {
    render(<SectionHeader title="Trips" count={<span>3 results</span>} />);

    expect(screen.getByText('3 results')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Trips');
  });

  test('renders the actions that belong to the section', () => {
    render(
      <SectionHeader title="Pricing options" actions={<button type="button">Add option</button>} />
    );

    expect(screen.getByRole('button', { name: 'Add option' })).toBeInTheDocument();
  });
});
