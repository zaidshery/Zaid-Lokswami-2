export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'unknown';
export type NotificationCapabilityState =
  | NotificationPermission
  | 'unsupported'
  | 'requires-install';

export type NotificationCapability = {
  state: NotificationCapabilityState;
  permission: NotificationPermission | 'unsupported';
  canPrompt: boolean;
  isSupported: boolean;
  requiresAppInstall: boolean;
};

export const INSTALL_PROMPT_REQUEST_EVENT = 'lokswami:install-prompt:request';
export const INSTALL_PROMPT_HIDE_EVENT = 'lokswami:install-prompt:hide';

function canUseWindow() {
  return typeof window !== 'undefined';
}

function canUseNavigator() {
  return typeof navigator !== 'undefined';
}

function getUserAgent() {
  if (!canUseNavigator()) return '';
  return navigator.userAgent || '';
}

export function canRegisterServiceWorker() {
  return canUseNavigator() && 'serviceWorker' in navigator;
}

export function isStandaloneMode() {
  if (!canUseWindow()) {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true ||
    document.referrer.startsWith('android-app://')
  );
}

export function isIosSafari() {
  if (!canUseNavigator()) {
    return false;
  }

  const userAgent = getUserAgent();
  const isIosDevice =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafariBrowser =
    /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);

  return isIosDevice && isSafariBrowser;
}

export function resolveInstallPlatform(): InstallPlatform {
  if (!canUseNavigator()) {
    return 'unknown';
  }

  if (isIosSafari()) {
    return 'ios';
  }

  const userAgent = getUserAgent();
  if (/Android/i.test(userAgent)) {
    return 'android';
  }

  if (canUseWindow()) {
    return 'desktop';
  }

  return 'unknown';
}

export function resolveNotificationCapability(): NotificationCapability {
  if (!canUseWindow() || !window.isSecureContext) {
    return {
      state: 'unsupported',
      permission: 'unsupported',
      canPrompt: false,
      isSupported: false,
      requiresAppInstall: false,
    };
  }

  const hasNotificationApi = typeof Notification !== 'undefined';
  const hasPushManager = 'PushManager' in window;
  const standalone = isStandaloneMode();

  if (isIosSafari() && !standalone && (!hasNotificationApi || !hasPushManager)) {
    return {
      state: 'requires-install',
      permission: 'unsupported',
      canPrompt: false,
      isSupported: false,
      requiresAppInstall: true,
    };
  }

  if (!hasNotificationApi) {
    return {
      state: 'unsupported',
      permission: 'unsupported',
      canPrompt: false,
      isSupported: false,
      requiresAppInstall: false,
    };
  }

  const permission = Notification.permission;
  return {
    state: permission,
    permission,
    canPrompt: permission === 'default',
    isSupported: true,
    requiresAppInstall: false,
  };
}

export function requestInstallPrompt() {
  if (!canUseWindow()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(INSTALL_PROMPT_REQUEST_EVENT));
}

export function hideInstallPrompt() {
  if (!canUseWindow()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(INSTALL_PROMPT_HIDE_EVENT));
}
