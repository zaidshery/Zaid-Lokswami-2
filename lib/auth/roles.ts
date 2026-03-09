export const ADMIN_ROLES = [
  'admin',
  'super_admin',
  'editor',
  'author',
  'viewer',
] as const;

export const READER_ROLE = 'reader' as const;

export const USER_ROLES = [READER_ROLE, ...ADMIN_ROLES] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type ReaderRole = typeof READER_ROLE;
export type UserRole = (typeof USER_ROLES)[number];

const adminRoleSet = new Set<string>(ADMIN_ROLES);

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && adminRoleSet.has(role);
}

export function isReaderRole(role: unknown): role is ReaderRole {
  return role === READER_ROLE;
}

export function formatUserRoleLabel(role: unknown) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'editor':
      return 'Editor';
    case 'author':
      return 'Author';
    case 'viewer':
      return 'Viewer';
    case 'admin':
      return 'Admin';
    case 'reader':
    default:
      return 'Reader';
  }
}
