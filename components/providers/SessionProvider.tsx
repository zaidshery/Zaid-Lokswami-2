'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

interface AuthSessionProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

/** Provides NextAuth session context to client components. */
export default function AuthSessionProvider({
  children,
  session = null,
}: AuthSessionProviderProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
