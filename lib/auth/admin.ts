import { auth } from '@/lib/auth';
import { isAdminRole, type AdminRole } from '@/lib/auth/roles';

export type AdminSessionIdentity = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: AdminRole;
};

export async function getAdminSession(): Promise<AdminSessionIdentity | null> {
  const session = await auth();
  const sessionUser = session?.user;
  const email = sessionUser?.email?.trim() || '';
  const role = sessionUser?.role;

  if (!sessionUser || !email || !isAdminRole(role) || sessionUser.isActive === false) {
    return null;
  }

  return {
    id: sessionUser.userId || sessionUser.id || email,
    email,
    name: sessionUser.name?.trim() || email.split('@')[0] || 'Admin',
    username: email,
    role,
  };
}
