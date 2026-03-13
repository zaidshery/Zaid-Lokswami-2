import { resolveNotificationCapability } from '@/lib/pwa/client';

export type PopupType = 'state' | 'notification' | 'personalization';

type PopupStorageState = {
  signinPromptShown: boolean;
  statePromptShown: boolean;
  notifPromptShown: boolean;
  personalizationShown: boolean;
  neverStatePrompt: boolean;
  neverNotifPrompt: boolean;
  neverPersonalizationPrompt: boolean;
  activePopup: PopupType | null;
  readCount: number;
  visitCount: number;
  hasVisitedEpaper: boolean;
  selectedState: string;
  preferredCategories: string[];
  lastTrackedPath: string;
};

export type PopupUserState = {
  isAuthenticated: boolean;
  notificationPermission:
    | NotificationPermission
    | 'unsupported'
    | 'requires-install';
};

const POPUP_STORAGE_KEY = 'lokswami_popup_manager_state_v1';

const DEFAULT_POPUP_STATE: PopupStorageState = {
  signinPromptShown: false,
  statePromptShown: false,
  notifPromptShown: false,
  personalizationShown: false,
  neverStatePrompt: false,
  neverNotifPrompt: false,
  neverPersonalizationPrompt: false,
  activePopup: null,
  readCount: 0,
  visitCount: 0,
  hasVisitedEpaper: false,
  selectedState: '',
  preferredCategories: [],
  lastTrackedPath: '',
};

function canUseStorage() {
  return typeof window !== 'undefined';
}

function normalizeState(raw: unknown): PopupStorageState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_POPUP_STATE };
  }

  const value = raw as Partial<PopupStorageState>;
  const activePopup =
    value.activePopup === 'state' ||
    value.activePopup === 'notification' ||
    value.activePopup === 'personalization'
      ? value.activePopup
      : null;

  return {
    signinPromptShown: Boolean(value.signinPromptShown),
    statePromptShown: Boolean(value.statePromptShown),
    notifPromptShown: Boolean(value.notifPromptShown),
    personalizationShown: Boolean(value.personalizationShown),
    neverStatePrompt: Boolean(value.neverStatePrompt),
    neverNotifPrompt: Boolean(value.neverNotifPrompt),
    neverPersonalizationPrompt: Boolean(value.neverPersonalizationPrompt),
    activePopup,
    readCount:
      typeof value.readCount === 'number' && Number.isFinite(value.readCount)
        ? Math.max(0, Math.floor(value.readCount))
        : 0,
    visitCount:
      typeof value.visitCount === 'number' && Number.isFinite(value.visitCount)
        ? Math.max(0, Math.floor(value.visitCount))
        : 0,
    hasVisitedEpaper: Boolean(value.hasVisitedEpaper),
    selectedState:
      typeof value.selectedState === 'string' ? value.selectedState.trim().slice(0, 80) : '',
    preferredCategories: Array.isArray(value.preferredCategories)
      ? value.preferredCategories
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim().slice(0, 40))
          .slice(0, 10)
      : [],
    lastTrackedPath:
      typeof value.lastTrackedPath === 'string' ? value.lastTrackedPath.slice(0, 200) : '',
  };
}

function readPopupStateInternal(): PopupStorageState {
  if (!canUseStorage()) {
    return { ...DEFAULT_POPUP_STATE };
  }

  try {
    const raw = window.localStorage.getItem(POPUP_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_POPUP_STATE };
    }

    return normalizeState(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_POPUP_STATE };
  }
}

function savePopupStateInternal(next: PopupStorageState) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore localStorage write failures.
  }
}

function updatePopupState(updater: (current: PopupStorageState) => PopupStorageState) {
  const current = readPopupStateInternal();
  const next = normalizeState(updater(current));
  savePopupStateInternal(next);
  return next;
}

export function readPopupState() {
  return readPopupStateInternal();
}

export function registerPathVisit(pathname: string) {
  const normalizedPath = pathname.trim();
  if (!normalizedPath || !normalizedPath.startsWith('/')) {
    return readPopupStateInternal();
  }

  return updatePopupState((current) => {
    if (current.lastTrackedPath === normalizedPath) {
      return current;
    }

    const isArticleRead = normalizedPath.startsWith('/main/article/');
    const isEpaperVisit = normalizedPath.startsWith('/main/epaper');

    return {
      ...current,
      visitCount: current.visitCount + 1,
      readCount: isArticleRead ? current.readCount + 1 : current.readCount,
      hasVisitedEpaper: current.hasVisitedEpaper || isEpaperVisit,
      lastTrackedPath: normalizedPath,
    };
  });
}

export function markSigninPromptShown() {
  return updatePopupState((current) => ({
    ...current,
    signinPromptShown: true,
  }));
}

function markPromptShown(current: PopupStorageState, popup: PopupType) {
  if (popup === 'state') {
    return { ...current, statePromptShown: true };
  }

  if (popup === 'notification') {
    return { ...current, notifPromptShown: true };
  }

  return { ...current, personalizationShown: true };
}

export function activatePopup(popup: PopupType) {
  return updatePopupState((current) => {
    const withShown = markPromptShown(current, popup);
    return {
      ...withShown,
      activePopup: popup,
    };
  });
}

export function dismissPopup(popup: PopupType) {
  return updatePopupState((current) => {
    if (current.activePopup !== popup) {
      return current;
    }

    return {
      ...current,
      activePopup: null,
    };
  });
}

export function neverShowPopupAgain(popup: PopupType) {
  return updatePopupState((current) => {
    const base = {
      ...current,
      activePopup: current.activePopup === popup ? null : current.activePopup,
    };

    if (popup === 'state') {
      return { ...base, neverStatePrompt: true, statePromptShown: true };
    }

    if (popup === 'notification') {
      return { ...base, neverNotifPrompt: true, notifPromptShown: true };
    }

    return {
      ...base,
      neverPersonalizationPrompt: true,
      personalizationShown: true,
    };
  });
}

export function saveSelectedState(value: string) {
  return updatePopupState((current) => ({
    ...current,
    selectedState: value.trim().slice(0, 80),
    activePopup: current.activePopup === 'state' ? null : current.activePopup,
  }));
}

export function savePreferredCategories(values: string[]) {
  const normalized = values
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 40))
    .slice(0, 10);

  return updatePopupState((current) => ({
    ...current,
    preferredCategories: normalized,
    activePopup:
      current.activePopup === 'personalization' ? null : current.activePopup,
  }));
}

export function resolveNotificationPermission() {
  return resolveNotificationCapability().state;
}

/**
 * Decides the next popup in priority order and guarantees one active popup at once.
 */
export function getNextPopup(userState: PopupUserState): PopupType | null {
  const state = readPopupStateInternal();

  if (state.activePopup) {
    return state.activePopup;
  }

  const shouldShowStatePrompt =
    !state.selectedState &&
    !state.neverStatePrompt &&
    !state.statePromptShown &&
    (state.readCount >= 2 || state.visitCount >= 2);

  if (shouldShowStatePrompt) {
    return 'state';
  }

  const notificationHandled =
    userState.notificationPermission === 'granted' ||
    userState.notificationPermission === 'denied' ||
    userState.notificationPermission === 'unsupported' ||
    userState.notificationPermission === 'requires-install';

  const shouldShowNotificationPrompt =
    !notificationHandled &&
    !state.neverNotifPrompt &&
    !state.notifPromptShown &&
    (state.readCount >= 3 || state.hasVisitedEpaper);

  if (shouldShowNotificationPrompt) {
    return 'notification';
  }

  const shouldShowPersonalizationPrompt =
    userState.isAuthenticated &&
    !state.neverPersonalizationPrompt &&
    !state.personalizationShown &&
    state.preferredCategories.length === 0 &&
    state.readCount >= 5;

  if (shouldShowPersonalizationPrompt) {
    return 'personalization';
  }

  return null;
}

