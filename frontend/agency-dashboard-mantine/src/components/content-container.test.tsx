import { render, screen } from '@test-utils';
import { describe, expect, test } from 'vitest';
import { ContentContainer } from './content-container.tsx';

describe('ContentContainer', () => {
  test('renders its children', () => {
    render(
      <ContentContainer>
        <p>page body</p>
      </ContentContainer>
    );

    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  test('centres the page and caps how wide it may get', () => {
    render(
      <ContentContainer>
        <p>page body</p>
      </ContentContainer>
    );

    // `padding="0"` on AppShell means the gutter has to live here, once. It is a
    // responsive `px`/`py`, which Mantine compiles into a media-query class that
    // jsdom cannot read, so only the width contract is asserted here.
    const container = screen.getByText('page body').parentElement as HTMLElement;
    expect(container.style.width).toBe('100%');
    expect(container.style.maxWidth).toBe('90rem');
    expect(container.style.marginInline).toBe('auto');
  });

  test('lets a page opt out of the width cap for a wide table', () => {
    render(
      <ContentContainer maw="none">
        <p>page body</p>
      </ContentContainer>
    );

    const container = screen.getByText('page body').parentElement as HTMLElement;
    expect(container.style.maxWidth).toBe('none');
  });
});
