export const SUPER_ADMIN_ROLE = 'super_admin' as const;
export const READER_ROLE = 'reader' as const;

export const ADMIN_ROLES = [
  'admin',
  SUPER_ADMIN_ROLE,
  'reporter',
  'copy_editor',
] as const;

export const USER_ROLES = [READER_ROLE, ...ADMIN_ROLES] as const;

export const LEGACY_ROLE_MAP = {
  author: 'reporter',
  editor: 'copy_editor',
  viewer: READER_ROLE,
} as const;

export const LEGACY_USER_ROLES = Object.keys(LEGACY_ROLE_MAP) as Array<
  keyof typeof LEGACY_ROLE_MAP
>;

export const ADMIN_ROLE_QUERY_VALUES = [
  ...ADMIN_ROLES,
  'author',
  'editor',
  'viewer',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type ReaderRole = typeof READER_ROLE;
export type UserRole = (typeof USER_ROLES)[number];
export type LegacyUserRole = keyof typeof LEGACY_ROLE_MAP;

const adminRoleSet = new Set<string>(ADMIN_ROLES);
const userRoleSet = new Set<string>(USER_ROLES);
const legacyUserRoleSet = new Set<string>(LEGACY_USER_ROLES);

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && adminRoleSet.has(role);
}

export function isReaderRole(role: unknown): role is ReaderRole {
  return role === READER_ROLE;
}

export function isSuperAdminRole(role: unknown): role is typeof SUPER_ADMIN_ROLE {
  return role === SUPER_ADMIN_ROLE;
}

export function isLegacyUserRole(role: unknown): role is LegacyUserRole {
  return typeof role === 'string' && legacyUserRoleSet.has(role);
}

export function normalizeUserRole(role: unknown): UserRole | null {
  if (typeof role !== 'string') {
    return null;
  }

  if (userRoleSet.has(role)) {
    return role as UserRole;
  }

  if (isLegacyUserRole(role)) {
    return LEGACY_ROLE_MAP[role];
  }

  return null;
}

export function normalizeAdminRole(role: unknown): AdminRole | null {
  const normalized = normalizeUserRole(role);
  return normalized && isAdminRole(normalized) ? normalized : null;
}

export function isReporterRole(role: unknown): role is 'reporter' {
  return normalizeAdminRole(role) === 'reporter';
}

export function isReporterDeskRole(role: unknown): role is 'reporter' {
  return normalizeAdminRole(role) === 'reporter';
}

export function isCopyEditorRole(role: unknown): role is 'copy_editor' {
  return normalizeAdminRole(role) === 'copy_editor';
}

export function formatUserRoleLabel(role: unknown) {
  switch (normalizeUserRole(role) || role) {
    case 'super_admin':
      return 'Super Admin';
    case 'copy_editor':
      return 'Copy Editor';
    case 'reporter':
      return 'Reporter';
    case 'admin':
      return 'Admin';
    case 'reader':
    default:
      return 'Reader';
  }
}
