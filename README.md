# Lokswami

Hindi news PWA built with Next.js 15, TypeScript, Tailwind CSS, MongoDB, Zustand, and NextAuth.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- NextAuth v5 beta
- Zustand
- Framer Motion

## Route Groups

Internal route groups keep the public URLs unchanged:

- `app/(auth)` - `/login`, `/signin`
- `app/(admin)` - `/admin`, `/dashboard`, admin CMS pages
- `app/(reader)` - `/main/*`, `/article/[id]`, category/news pages
- `app/(marketing)` - `/`, `/about`, `/advertise`, `/careers`, `/contact`, `/digital-newsroom`

## Authentication

- Single auth system: NextAuth with Google OAuth
- Admin sign-in uses `/login`
- Reader sign-in uses `/signin`
- Admin access is restricted by the email allowlist in [lib/auth.ts](./lib/auth.ts)
- Middleware protects `/admin/*` and reader-only routes such as `/main/saved` and `/main/preferences`

## Components

Top-level component structure:

- `components/ui`
- `components/layout`
- `components/forms`
- `components/providers`
- `components/auth`
- `components/ai-chat`

## Environment Variables

Minimum required to run auth and the app locally:

```env
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Also supported:

- `JWT_SECRET` or `AUTH_SECRET` as alternate session/JWT secrets
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` for media uploads
- `OPENAI_API_KEY`, `OPENAI_MODEL` for AI endpoints
- `BHASHINI_*` variables for TTS
- `OCR_*` variables for e-paper OCR
- `NEXT_IMAGE_ALLOWED_HOSTS` for extra remote image hosts

Use `.env.local.example` as a starting point, then set the values actually used by the current auth flow above.

## Local Development

```bash
npm install
npm run seed
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Database Seeding

Seed data now comes from [scripts/seed-fixtures.json](./scripts/seed-fixtures.json).

- The fixture file is intentionally small: 5 sample articles max
- `npm run seed` executes [scripts/seed.js](./scripts/seed.js)
- Seeding clears and recreates `Article`, `Category`, and `Author` data

```bash
npm run seed
```

## API Overview

Auth:

- `GET/POST /api/auth/[...nextauth]`

Admin CMS:

- `/api/admin/articles`
- `/api/admin/categories`
- `/api/admin/stories`
- `/api/admin/videos`
- `/api/admin/epapers`
- `/api/admin/media`
- `/api/admin/upload`
- `/api/admin/contact-messages`

Public content:

- `/api/articles/latest`
- `/api/videos/latest`
- `/api/shorts/latest`
- `/api/epapers`
- `/api/epapers/latest`
- `/api/public/epapers/[id]/pdf`
- `/api/public/uploads/[...path]`

AI and utility endpoints:

- `/api/ai/search`
- `/api/ai/summary`
- `/api/ai/tts`
- `/api/ai/suggestions`
- `/api/ai/categories`
- `/api/analytics/track`
- `/api/contact`
- `/api/advertise/inquiry`
- `/api/careers/apply`
- `/api/subscribe`
- `/api/health`

## Deployment Notes

- Set `NEXTAUTH_URL` to the production origin
- Add the production callback URL to your Google OAuth client:
  - `https://<your-domain>/api/auth/callback/google`
- Keep `NEXTAUTH_SECRET` at 32+ characters
- Use a persistent MongoDB instance in production
- `public/uploads/*` and `data/articles.json` are gitignored for local/generated data
- If you rely on media uploads in production, configure Cloudinary

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run seed
npm run hash-password
npm run migrate:epapers
```
