import { auth } from '@/lib/auth';

export type AdminSessionIdentity = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: 'admin';
};

export async function getAdminSession(): Promise<AdminSessionIdentity | null> {
  const session = await auth();
  const sessionUser = session?.user;
  const email = sessionUser?.email?.trim() || '';

  if (!sessionUser || !email || sessionUser.role !== 'admin') {
    return null;
  }

  return {
    id: sessionUser.id || email,
    email,
    name: sessionUser.name?.trim() || email.split('@')[0] || 'Admin',
    username: email,
    role: 'admin',
  };
}
