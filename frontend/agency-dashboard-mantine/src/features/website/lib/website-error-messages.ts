import type { WebsiteErrorKind } from './website-errors.ts';

export function websiteErrorNotificationKey(kind: WebsiteErrorKind): string {
  switch (kind) {
    case 'not-published':
      return 'website.notifications.notPublished';
    case 'slug-conflict':
      return 'website.notifications.slugConflict';
    case 'network':
      return 'website.errors.network';
    default:
      return 'website.notifications.unknownError';
  }
}
