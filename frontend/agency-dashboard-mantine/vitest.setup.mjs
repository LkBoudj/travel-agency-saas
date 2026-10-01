import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const { getComputedStyle } = window;
window.getComputedStyle = (elt) => getComputedStyle(elt);
window.HTMLElement.prototype.scrollIntoView = () => {};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom ships no FontFaceSet, and Mantine's autosize <Textarea> subscribes to
// `document.fonts` on mount — without this, any test rendering one throws
// "cannot read addEventListener of undefined" instead of testing the component.
Object.defineProperty(document, 'fonts', {
  configurable: true,
  value: {
    addEventListener: () => {},
    removeEventListener: () => {},
    load: () => Promise.resolve([]),
    check: () => true,
    ready: Promise.resolve(),
    status: 'loaded',
  },
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;
