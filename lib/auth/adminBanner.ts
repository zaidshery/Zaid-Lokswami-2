export const ADMIN_SIGNIN_BANNER_PENDING_KEY = 'lokswami-admin-signin-banner-pending';
export const ADMIN_SIGNIN_BANNER_DISMISSED_KEY =
  'lokswami-admin-signin-banner-dismissed';

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function armAdminSigninBanner() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(ADMIN_SIGNIN_BANNER_PENDING_KEY, '1');
  window.sessionStorage.removeItem(ADMIN_SIGNIN_BANNER_DISMISSED_KEY);
}

export function dismissAdminSigninBanner() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(ADMIN_SIGNIN_BANNER_DISMISSED_KEY, '1');
  window.sessionStorage.removeItem(ADMIN_SIGNIN_BANNER_PENDING_KEY);
}

export function shouldShowAdminSigninBanner() {
  if (!canUseSessionStorage()) {
    return false;
  }

  return (
    window.sessionStorage.getItem(ADMIN_SIGNIN_BANNER_PENDING_KEY) === '1' &&
    window.sessionStorage.getItem(ADMIN_SIGNIN_BANNER_DISMISSED_KEY) !== '1'
  );
}
