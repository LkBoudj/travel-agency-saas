/**
 * Stable website error codes, shared by the website module and the public
 * read boundary. The backend error contract is `{ statusCode, message,
 * errorCode, metadata? }`; codes are never free strings — adding a code means
 * a named constant here.
 */
export const WEBSITE_NOT_PUBLISHED = 'WEBSITE_NOT_PUBLISHED';
export const WEBSITE_DRAFT_NOT_FOUND = 'WEBSITE_DRAFT_NOT_FOUND';
export const WEBSITE_PREVIEW_TOKEN_INVALID = 'WEBSITE_PREVIEW_TOKEN_INVALID';
export const WEBSITE_SLUG_CONFLICT = 'WEBSITE_SLUG_CONFLICT';