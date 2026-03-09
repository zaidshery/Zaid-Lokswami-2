import type { NextRequest } from 'next/server';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { LOKSWAMI_SESSION_COOKIE } from '@/lib/auth/cookies';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/models/User';

type AuthIntent = 'admin' | 'reader';
type SyncableUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: 'reader' | 'admin';
  savedArticles?: string[];
};

const AUTH_INTENT_COOKIE = 'lokswami-auth-intent';
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() || '';
const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || '';

export const allowedAdminEmails = ['tech.lokswami@gmail.com'];
export const isAdminGoogleAuthConfigured = Boolean(
  googleClientId && googleClientSecret && nextAuthSecret && nextAuthUrl
);

const normalizedAllowedAdminEmails = new Set(
  allowedAdminEmails
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
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

function buildFallbackProfile(
  user: SyncableUser,
  role: 'reader' | 'admin'
) {
  const normalizedEmail = normalizeEmail(user.email);

  return {
    id: user.id?.trim() || normalizedEmail || `${role}-user`,
    name: resolveDisplayName(user),
    email: normalizedEmail,
    image: user.image?.trim() || null,
    role,
    savedArticles: Array.isArray(user.savedArticles) ? user.savedArticles : [],
  };
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

async function upsertSessionUser(user: SyncableUser, authIntent: AuthIntent) {
  const normalizedEmail = normalizeEmail(user.email);
  if (!normalizedEmail) {
    return null;
  }

  await connectDB();

  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  const persistedRole =
    authIntent === 'admin'
      ? 'admin'
      : existingUser?.role === 'admin'
        ? 'admin'
        : 'reader';

  const dbUser = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        name: resolveDisplayName(user),
        email: normalizedEmail,
        image: user.image?.trim() || '',
        role: persistedRole,
      },
      $setOnInsert: {
        savedArticles: [],
        preferredLanguage: 'hi',
        preferredCategories: [],
        notificationsEnabled: false,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  if (!dbUser) {
    return null;
  }

  return {
    id: String(dbUser._id),
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image || null,
    savedArticles: normalizeSavedArticles(dbUser.savedArticles),
  };
}

async function getUserProfile(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  await connectDB();

  const dbUser = await User.findOne({ email: normalizedEmail }).lean();
  if (!dbUser) {
    return null;
  }

  return {
    id: String(dbUser._id),
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image || null,
    savedArticles: normalizeSavedArticles(dbUser.savedArticles),
  };
}

function isAllowedAdminEmail(email: string) {
  return normalizedAllowedAdminEmails.has(normalizeEmail(email));
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
          return false;
        }

        if (authIntent === 'admin' && !isAllowedAdminEmail(normalizedEmail)) {
          return false;
        }

        const role = authIntent === 'admin' ? 'admin' : 'reader';
        const fallbackProfile = buildFallbackProfile(user, role);

        try {
          const syncedUser = await upsertSessionUser(user, authIntent);
          const resolvedProfile = syncedUser
            ? { ...fallbackProfile, ...syncedUser }
            : fallbackProfile;

          user.id = resolvedProfile.id;
          user.name = resolvedProfile.name;
          user.email = resolvedProfile.email;
          user.image = resolvedProfile.image;
          user.role = role;
          user.savedArticles = resolvedProfile.savedArticles;
        } catch (error) {
          console.warn(
            'Falling back to session-only Google auth because user sync failed:',
            error
          );
          user.id = fallbackProfile.id;
          user.name = fallbackProfile.name;
          user.email = fallbackProfile.email;
          user.image = fallbackProfile.image;
          user.role = role;
          user.savedArticles = fallbackProfile.savedArticles;
        }

        return true;
      },
      async jwt({ token, user, account }) {
        if (account?.provider === 'google' && user) {
          token.id = user.id || token.sub || '';
          token.role = user.role === 'admin' ? 'admin' : 'reader';
          token.savedArticles = Array.isArray(user.savedArticles)
            ? user.savedArticles
            : [];
        }

        return token;
      },
      async session({ session, token }) {
        const sessionEmail = normalizeEmail(session.user?.email || token.email);
        const sessionRole = token.role === 'admin' ? 'admin' : 'reader';

        session.user.id = typeof token.id === 'string' ? token.id : '';
        session.user.role = sessionRole;
        session.user.savedArticles = Array.isArray(token.savedArticles)
          ? token.savedArticles
          : [];

        if (sessionEmail) {
          session.user.email = sessionEmail;
        }

        if (typeof token.name === 'string' && token.name.trim()) {
          session.user.name = token.name;
        }

        if (typeof token.picture === 'string') {
          session.user.image = token.picture;
        }

        if (sessionRole === 'reader' && sessionEmail) {
          try {
            const userProfile = await getUserProfile(sessionEmail);
            if (userProfile) {
              session.user.id = userProfile.id;
              session.user.name = userProfile.name;
              session.user.email = userProfile.email;
              session.user.image = userProfile.image;
              session.user.savedArticles = userProfile.savedArticles;
            }
          } catch (error) {
            console.error('Failed to hydrate reader session:', error);
          }
        }

        return session;
      },
      async redirect({ url, baseUrl }) {
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }

        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.origin === baseUrl) {
            return url;
          }
        } catch {
          return baseUrl;
        }

        return baseUrl;
      },
    },
  };
}

export const authOptions = buildAuthOptions();

export const { handlers, auth, signIn, signOut } = NextAuth((request) =>
  buildAuthOptions(request)
);
