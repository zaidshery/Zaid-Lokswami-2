import type { DefaultSession } from 'next-auth';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'reader' | 'admin';
      savedArticles: string[];
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    role?: 'reader' | 'admin';
    savedArticles?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'reader' | 'admin';
    savedArticles?: string[];
  }
}
