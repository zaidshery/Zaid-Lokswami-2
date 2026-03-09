'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { UserRole } from '@/lib/auth/roles';
import { useAppStore, type AppUser } from '@/lib/store/appStore';

function mapSessionToAppUser(
  sessionUser: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole;
    isActive?: boolean;
    savedArticles?: string[];
  } | null
): AppUser | null {
  if (!sessionUser?.email) {
    return null;
  }

  return {
    id: sessionUser.id || '',
    name: sessionUser.name?.trim() || sessionUser.email.split('@')[0] || 'Reader',
    email: sessionUser.email,
    image: sessionUser.image || null,
    role: sessionUser.role || 'reader',
    isActive: sessionUser.isActive !== false,
    savedArticles: Array.isArray(sessionUser.savedArticles)
      ? sessionUser.savedArticles
      : [],
  };
}

/** Keeps the Zustand auth slice synchronized with the NextAuth session. */
export default function AuthSync() {
  const { data: session, status } = useSession();
  const setUser = useAppStore((state) => state.setUser);
  const clearUser = useAppStore((state) => state.clearUser);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status !== 'authenticated') {
      clearUser();
      return;
    }

    const mappedUser = mapSessionToAppUser(session?.user || null);

    if (!mappedUser) {
      clearUser();
      return;
    }

    setUser(mappedUser);
  }, [clearUser, session?.user, setUser, status]);

  return null;
}
