import type { DefaultSession } from 'next-auth';
import 'next-auth';
import 'next-auth/jwt';
import type { UserRole } from '@/lib/auth/roles';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      userId: string;
      role: UserRole;
      isActive: boolean;
      createdAt?: string;
      savedArticles: string[];
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    userId?: string;
    role?: UserRole;
    isActive?: boolean;
    createdAt?: string;
    savedArticles?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    userId?: string;
    role?: UserRole;
    isActive?: boolean;
    createdAt?: string;
    savedArticles?: string[];
  }
}
