'use client';

export function getAuthToken(): string {
  // Admin auth is now stored in an HttpOnly cookie managed by server routes.
  return '';
}

export function getAuthHeader(): Record<string, string> {
  // Keep call sites unchanged; cookies are sent automatically on same-origin requests.
  return {};
}
