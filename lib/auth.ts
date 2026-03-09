import type { NextRequest } from 'next/server';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { LOKSWAMI_SESSION_COOKIE } from '@/lib/auth/cookies';
import { normalizeRedirectPath } from '@/lib/auth/redirect';
import {
  isAdminRole,
  isReaderRole,
  type UserRole,
} from '@/lib/auth/roles';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/models/User';

type AuthIntent = 'admin' | 'reader';
type SyncableUser = {
  id?: string;
  userId?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: UserRole;
  isActive?: boolean;
  createdAt?: string;
  savedArticles?: string[];
};

type DbUserRecord = {
  _id?: unknown;
  name?: string;
  email?: string;
  image?: string;
  role?: unknown;
  isActive?: boolean;
  createdAt?: Date | string;
  savedArticles?: unknown;
};

type SessionProfile = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  savedArticles: string[];
};

const AUTH_INTENT_COOKIE = 'lokswami-auth-intent';
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() || '';
const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || '';

export const isAdminGoogleAuthConfigured = Boolean(
  googleClientId && googleClientSecret && nextAuthSecret && nextAuthUrl
);

function getAuthIntent(request?: NextRequest): AuthIntent {
  return request?.cookies.get(AUTH_INTENT_COOKIE)?.value === 'admin'
    ? 'admin'
    : 'reader';
}

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function resolveDisplayName(user: SyncableUser) {
  const normalizedName = user.name?.trim();
  if (normalizedName) {
    return normalizedName;
  }

  const emailPrefix = normalizeEmail(user.email).split('@')[0]?.trim();
  return emailPrefix || 'User';
}

function normalizeSavedArticles(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((articleId) => String(articleId));
}

function normalizeRole(value: unknown): UserRole | null {
  if (isReaderRole(value) || isAdminRole(value)) {
    return value;
  }

  return null;
}

function normalizeCreatedAt(value: Date | string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function getAuthErrorRedirect(authIntent: AuthIntent, errorCode: string) {
  return `${authIntent === 'admin' ? '/login' : '/signin'}?error=${encodeURIComponent(errorCode)}`;
}

function buildFallbackProfile(user: SyncableUser, role: UserRole): SessionProfile {
  const normalizedEmail = normalizeEmail(user.email);

  return {
    userId: user.userId?.trim() || user.id?.trim() || normalizedEmail || `${role}-user`,
    name: resolveDisplayName(user),
    email: normalizedEmail,
    image: user.image?.trim() || null,
    role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    savedArticles: Array.isArray(user.savedArticles) ? user.savedArticles : [],
  };
}

function buildSessionProfileFromDbUser(dbUser: DbUserRecord): SessionProfile | null {
  const email = normalizeEmail(dbUser.email);
  const role = normalizeRole(dbUser.role);

  if (!email || !role) {
    return null;
  }

  const userId = typeof dbUser._id?.toString === 'function' ? dbUser._id.toString() : '';
  if (!userId) {
    return null;
  }

  return {
    userId,
    name: (dbUser.name || '').trim() || email.split('@')[0] || 'User',
    email,
    image: (dbUser.image || '').trim() || null,
    role,
    isActive: dbUser.isActive !== false,
    createdAt: normalizeCreatedAt(dbUser.createdAt),
    savedArticles: normalizeSavedArticles(dbUser.savedArticles),
  };
}

function assignProfileToUser(user: SyncableUser, profile: SessionProfile) {
  user.id = profile.userId;
  user.userId = profile.userId;
  user.name = profile.name;
  user.email = profile.email;
  user.image = profile.image;
  user.role = profile.role;
  user.isActive = profile.isActive;
  user.createdAt = profile.createdAt;
  user.savedArticles = profile.savedArticles;
}

function buildProviders() {
  if (!googleClientId || !googleClientSecret) {
    return [];
  }

  return [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ];
}

async function getUserByEmail(email: string) {
  await connectDB();
  return User.findOne({ email }).lean<DbUserRecord | null>();
}

async function createReaderUser(user: SyncableUser) {
  await connectDB();

  const createdUser = await User.create({
    name: resolveDisplayName(user),
    email: normalizeEmail(user.email),
    image: user.image?.trim() || '',
    role: 'reader',
    isActive: true,
    lastLoginAt: new Date(),
    savedArticles: [],
    preferredLanguage: 'hi',
    preferredCategories: [],
    notificationsEnabled: false,
  });

  return User.findById(createdUser._id).lean<DbUserRecord | null>();
}

async function touchUserForLogin(existingUser: DbUserRecord, user: SyncableUser) {
  await connectDB();

  const nextName = resolveDisplayName(user);
  const nextImage = user.image?.trim() || '';

  const updatedUser = await User.findByIdAndUpdate(
    existingUser._id,
    {
      $set: {
        name: nextName,
        image: nextImage,
        lastLoginAt: new Date(),
      },
    },
    { new: true }
  ).lean<DbUserRecord | null>();

  return updatedUser;
}

function resolveAuthPages(authIntent: AuthIntent) {
  if (authIntent === 'admin') {
    return {
      signIn: '/login',
      error: '/login',
    };
  }

  return {
    signIn: '/signin',
    error: '/signin',
  };
}

function resolveSafeRedirectPath(path: string, baseUrl: string): string | null {
  const normalizedPath = normalizeRedirectPath(path, '');
  if (!normalizedPath) {
    return null;
  }

  const parsedPath = new URL(normalizedPath, baseUrl);
  if (parsedPath.pathname === '/signin' || parsedPath.pathname === '/login') {
    if (parsedPath.searchParams.has('error')) {
      return parsedPath.toString();
    }

    return (
      resolveSafeRedirectUrl(parsedPath.searchParams.get('redirect'), baseUrl) ||
      resolveSafeRedirectUrl(parsedPath.searchParams.get('callbackUrl'), baseUrl) ||
      null
    );
  }

  return parsedPath.toString();
}

function resolveSafeRedirectUrl(
  url: string | null | undefined,
  baseUrl: string
): string | null {
  const next = (url || '').trim();
  if (!next) {
    return null;
  }

  if (next.startsWith('/')) {
    return resolveSafeRedirectPath(next, baseUrl);
  }

  try {
    const parsedUrl = new URL(next);
    if (parsedUrl.origin !== baseUrl) {
      return null;
    }

    return resolveSafeRedirectPath(
      `${parsedUrl.pathname}${parsedUrl.search}`,
      baseUrl
    );
  } catch {
    return null;
  }
}

function buildAuthOptions(request?: NextRequest): NextAuthConfig {
  const authIntent = getAuthIntent(request);

  return {
    session: {
      strategy: 'jwt',
    },
    cookies: {
      sessionToken: {
        name: LOKSWAMI_SESSION_COOKIE,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: process.env.NODE_ENV === 'production',
        },
      },
    },
    pages: resolveAuthPages(authIntent),
    secret: nextAuthSecret || undefined,
    trustHost: true,
    providers: buildProviders(),
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider !== 'google') {
          return false;
        }

        const normalizedEmail = normalizeEmail(user.email);
        if (!normalizedEmail) {
          return getAuthErrorRedirect(authIntent, 'default');
        }

        try {
          const existingUser = await getUserByEmail(normalizedEmail);

          if (!existingUser) {
            if (authIntent === 'admin') {
              return getAuthErrorRedirect('admin', 'not_invited');
            }

            const createdReader = await createReaderUser(user);
            const createdProfile =
              (createdReader && buildSessionProfileFromDbUser(createdReader)) ||
              buildFallbackProfile(user, 'reader');

            assignProfileToUser(user, createdProfile);
            return true;
          }

          const existingRole = normalizeRole(existingUser.role);
          if (!existingRole) {
            return getAuthErrorRedirect(authIntent, 'default');
          }

          if (isAdminRole(existingRole)) {
            if (existingUser.isActive === false) {
              return getAuthErrorRedirect(authIntent, 'inactive');
            }

            const updatedAdmin = await touchUserForLogin(existingUser, user);
            const adminProfile =
              (updatedAdmin && buildSessionProfileFromDbUser(updatedAdmin)) ||
              buildFallbackProfile(user, existingRole);

            assignProfileToUser(user, adminProfile);

            if (authIntent === 'reader') {
              return '/admin';
            }

            return true;
          }

          if (authIntent === 'admin') {
            return getAuthErrorRedirect('admin', 'not_invited');
          }

          const updatedReader = await touchUserForLogin(existingUser, user);
          const readerProfile =
            (updatedReader && buildSessionProfileFromDbUser(updatedReader)) ||
            buildFallbackProfile(user, 'reader');

          assignProfileToUser(user, readerProfile);
          return true;
        } catch (error) {
          console.error('NextAuth sign-in failed:', error);
          return getAuthErrorRedirect(authIntent, 'default');
        }
      },
      async jwt({ token, user }) {
        if (user) {
          const userId =
            user.userId ||
            user.id ||
            (typeof token.sub === 'string' ? token.sub : '') ||
            '';

          token.id = userId;
          token.userId = userId;
          token.role = user.role || 'reader';
          token.isActive = user.isActive !== false;
          token.savedArticles = Array.isArray(user.savedArticles)
            ? user.savedArticles
            : [];
          token.createdAt = user.createdAt;
        }

        return token;
      },
      async session({ session, token }) {
        const sessionEmail = normalizeEmail(session.user?.email || token.email);
        const fallbackRole = normalizeRole(token.role) || 'reader';
        const fallbackUserId =
          (typeof token.userId === 'string' && token.userId) ||
          (typeof token.id === 'string' && token.id) ||
          '';

        session.user.id = fallbackUserId;
        session.user.userId = fallbackUserId;
        session.user.role = fallbackRole;
        session.user.isActive = token.isActive !== false;
        session.user.savedArticles = Array.isArray(token.savedArticles)
          ? token.savedArticles
          : [];
        session.user.createdAt =
          typeof token.createdAt === 'string' ? token.createdAt : undefined;

        if (sessionEmail) {
          session.user.email = sessionEmail;
        }

        if (typeof token.name === 'string' && token.name.trim()) {
          session.user.name = token.name;
        }

        if (typeof token.picture === 'string') {
          session.user.image = token.picture;
        }

        if (!sessionEmail) {
          return session;
        }

        try {
          const dbUser = await getUserByEmail(sessionEmail);
          const dbProfile = dbUser && buildSessionProfileFromDbUser(dbUser);

          if (dbProfile) {
            session.user.id = dbProfile.userId;
            session.user.userId = dbProfile.userId;
            session.user.role = dbProfile.role;
            session.user.isActive = dbProfile.isActive;
            session.user.name = dbProfile.name;
            session.user.email = dbProfile.email;
            session.user.image = dbProfile.image;
            session.user.createdAt = dbProfile.createdAt;
            session.user.savedArticles = dbProfile.savedArticles;

            token.id = dbProfile.userId;
            token.userId = dbProfile.userId;
            token.role = dbProfile.role;
            token.isActive = dbProfile.isActive;
            token.createdAt = dbProfile.createdAt;
            token.savedArticles = dbProfile.savedArticles;
          }
        } catch (error) {
          console.error('Failed to hydrate session from MongoDB:', error);
        }

        return session;
      },
      async redirect({ url, baseUrl }) {
        const resolvedUrl = resolveSafeRedirectUrl(url, baseUrl);

        if (resolvedUrl) {
          const parsedUrl = new URL(resolvedUrl);
          if (parsedUrl.searchParams.has('error')) {
            return resolvedUrl;
          }
        }

        if (authIntent === 'admin') {
          return `${baseUrl}/admin`;
        }

        if (!resolvedUrl) {
          return `${baseUrl}/main`;
        }

        return resolvedUrl;
      },
    },
  };
}

export const authOptions = buildAuthOptions();

export const { handlers, auth, signIn, signOut } = NextAuth((request) =>
  buildAuthOptions(request)
);
