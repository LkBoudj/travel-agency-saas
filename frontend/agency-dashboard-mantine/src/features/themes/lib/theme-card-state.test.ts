import { describe, expect, test } from 'vitest';
import { liveThemeId, themeCardState, themePublishState } from './theme-card-state.ts';

describe('themeCardState', () => {
  test('marks the draft selection as current and live when the site is published with it', () => {
    expect(themeCardState('starter', 'starter', 'starter')).toEqual({
      isCurrent: true,
      isLive: true,
      isPendingPublish: false,
    });
  });

  test('marks an activated-but-unpublished theme as current, not live, and pending publish', () => {
    expect(themeCardState('atlas', 'atlas', 'starter')).toEqual({
      isCurrent: true,
      isLive: false,
      isPendingPublish: true,
    });
  });

  test('keeps the previously live theme marked live while another one is staged', () => {
    expect(themeCardState('starter', 'atlas', 'starter')).toEqual({
      isCurrent: false,
      isLive: true,
      isPendingPublish: false,
    });
  });

  test('treats a theme as not live when the site has never been published', () => {
    expect(themeCardState('starter', 'starter', null)).toEqual({
      isCurrent: true,
      isLive: false,
      isPendingPublish: true,
    });
  });

  test('never matches a null draft against a real theme id', () => {
    expect(themeCardState('starter', null, null)).toEqual({
      isCurrent: false,
      isLive: false,
      isPendingPublish: false,
    });
  });
});

describe('themePublishState', () => {
  test('is unpublished when there is no published site', () => {
    expect(themePublishState('starter', null, false)).toBe('unpublished');
    expect(themePublishState(null, null, false)).toBe('unpublished');
  });

  test('is in-sync when the draft theme is the live theme', () => {
    expect(themePublishState('starter', 'starter', true)).toBe('in-sync');
  });

  test('is pending-publish when the draft theme differs from the live theme', () => {
    expect(themePublishState('atlas', 'starter', true)).toBe('pending-publish');
    expect(themePublishState('starter', 'atlas', true)).toBe('pending-publish');
  });

  test('is pending-publish when a live site exists but carries no theme id', () => {
    expect(themePublishState('starter', null, true)).toBe('pending-publish');
  });
});

describe('liveThemeId', () => {
  test('returns the published theme only when a site is actually published', () => {
    expect(liveThemeId('starter', true)).toBe('starter');
    expect(liveThemeId('starter', false)).toBeNull();
    expect(liveThemeId(null, true)).toBeNull();
    expect(liveThemeId(undefined, true)).toBeNull();
  });
});
