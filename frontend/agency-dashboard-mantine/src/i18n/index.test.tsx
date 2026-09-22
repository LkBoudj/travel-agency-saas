import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAppLocale } from './hooks/use-app-locale';
import { LOCALE_STORAGE_KEY } from './locales';
import { setLocale } from './index';

describe('i18n document sync', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    setLocale('en');
    window.localStorage.clear();
  });

  it('applies rtl + ar on the <html> element when ar is selected', async () => {
    setLocale('ar');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('applies ltr + en when en is selected', async () => {
    setLocale('ar');
    await new Promise((resolve) => setTimeout(resolve, 50));
    setLocale('en');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('persists the chosen locale under the shared storage key', async () => {
    setLocale('ar');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ar');
  });

  it('exports a reactive useAppLocale hook', async () => {
    const { renderHook, waitFor } = await import('@testing-library/react');

    const { result } = renderHook(() => useAppLocale());
    expect(result.current).toBe('en');

    setLocale('ar');
    await waitFor(() => expect(result.current).toBe('ar'));
  });
});
