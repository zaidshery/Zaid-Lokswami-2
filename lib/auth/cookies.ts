const lokswamiSessionCookieName =
  process.env.NODE_ENV === 'production'
    ? '__Secure-lokswami.session-token'
    : 'lokswami.session-token';

export const LOKSWAMI_SESSION_COOKIE = lokswamiSessionCookieName;

export const READER_SESSION_COOKIES = [LOKSWAMI_SESSION_COOKIE];
