# Lokswami

Hindi news PWA built on Next.js 15 with TypeScript, Tailwind CSS, MongoDB, Zustand, and NextAuth Google OAuth.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- NextAuth v5 beta
- Zustand
- Framer Motion

## App Structure

Route groups keep public URLs unchanged:

- `app/(auth)` -> `/login`, `/signin`
- `app/(admin)` -> `/admin`, `/dashboard`, admin CMS pages
- `app/(reader)` -> `/main/*`, `/article/[id]`, section pages
- `app/(marketing)` -> `/`, `/about`, `/advertise`, `/careers`, `/contact`, `/digital-newsroom`

Shared components live at the top level:

- `components/ui`
- `components/layout`
- `components/forms`
- `components/providers`
- `components/auth`
- `components/ai-chat`

## Authentication

- Single auth system: NextAuth with Google OAuth
- Reader sign-in page: `/signin`
- Admin sign-in page: `/login`
- Admin access is allowlist-based in `lib/auth.ts`
- Middleware protects `/admin/*` plus reader-only routes such as `/main/saved` and `/main/preferences`

## Environment

Copy `.env.example` to `.env.local` and set the values you actually use.

Minimum local setup:

```env
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Also supported:

- `JWT_SECRET` or `AUTH_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `BHASHINI_*`
- `OCR_*`
- `NEXT_IMAGE_ALLOWED_HOSTS`

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

## Seeding

Seed data comes from `scripts/seed-fixtures.json`.

- `npm run seed` executes `scripts/seed.js`
- Fixtures are intentionally small
- Seeding recreates `Article`, `Category`, and `Author` data

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

AI and utility:

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

## Deployment

- Set `NEXTAUTH_URL` to the production origin
- Add `https://<your-domain>/api/auth/callback/google` to the Google OAuth client
- Keep `NEXTAUTH_SECRET` at 32+ characters
- Use a persistent MongoDB instance
- Configure Cloudinary if production uploads are enabled
- `public/uploads/*` and `data/articles.json` are gitignored local/generated data

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
