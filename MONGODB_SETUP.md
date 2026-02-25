# MongoDB & Admin CMS Setup Guide

## Overview

The Lokswami v2 website now has full MongoDB integration with JWT-based admin authentication. This guide walks you through setting up the database and using the admin CMS.

## Prerequisites

- Node.js 16+ installed
- MongoDB Atlas account (free tier available)
- Environment variables configured

## Step 1: Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in with your account
3. Create a new project named "Lokswami"
4. Create a new cluster (free M0 tier is sufficient)
5. Choose your preferred region (closest to your users)
6. Wait for the cluster to be created (~10 minutes)

## Step 2: Set Up Database Access

1. In MongoDB Atlas, go to "Database Access"
2. Click "Add New Database User"
3. Create a user with:
   - **Username:** `lokswami_user`
   - **Password:** Generate a strong password (save this!)
   - **Authentication Method:** Password
   - **Database User Privileges:** Built-in roles → `readWriteAnyDatabase@admin`

## Step 3: Configure Network Access

1. In MongoDB Atlas, go to "Network Access"
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your server's IP address

## Step 4: Get Connection String

1. In MongoDB Atlas, click "Clusters" → "Connect"
2. Choose "Connect your application"
3. Select "Node.js" driver version "4.0 or later"
4. Copy the connection string: `mongodb+srv://<username>:<password>@cluster-name.mongodb.net/<database>?retryWrites=true&w=majority`

## Step 5: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Update the following values:

```env
# Replace with your actual MongoDB URI
MONGODB_URI=mongodb+srv://lokswami_user:YOUR_PASSWORD@cluster-name.mongodb.net/lokswami?retryWrites=true&w=majority

# Generate a random JWT secret:
# On Mac/Linux: openssl rand -base64 32
# On Windows: Use an online generator or a random string
JWT_SECRET=your-random-32-character-string-here

# Admin login credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36jbMFm2
# This hash is bcrypt of 'password' - change it in production!
```

## Step 6: Seed Database with Sample Data

With MongoDB connection configured, populate the database:

```bash
npm run seed
```

This will create:
- 6 categories (National, International, Sports, Entertainment, Tech, Business)
- 3 authors (with Hindi names)
- 6 sample articles with images

Expected output:
```
✓ Connected to MongoDB
✓ Cleared existing data
✓ Seeded categories
✓ Seeded authors
✓ Seeded articles

✅ Database seeded successfully!
```

## Step 7: Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Admin CMS Usage

### Logging In

1. Navigate to `/login`
2. Enter credentials:
   - **Username:** `admin`
   - **Password:** `password` (default)
3. You'll receive a JWT token valid for 7 days

### Accessing Admin Dashboard

1. After login, go to `/admin`
2. You'll see:
   - Dashboard with stats and charts
   - Article management section
   - Quick actions and trending content

### Managing Articles

#### Create New Article

1. In admin dashboard, click "New Article"
2. Fill in the form:
   - **Title:** Article headline (required)
   - **Summary:** Brief description (required)
   - **Content:** Full article text (required)
   - **Image URL:** Cover image link (required)
   - **Category:** Select from dropdown (required)
   - **Author:** Article author name (required)
   - **Breaking News:** Toggle if it's a breaking story
   - **Trending:** Toggle if it should appear in trending section
3. Click "Create" to publish

#### Edit Article

1. Find the article in the articles list
2. Click the edit icon (pencil)
3. Update fields as needed
4. Click "Save"

#### Delete Article

1. Find the article in the list
2. Click the delete icon (trash)
3. Confirm deletion

### Available Categories

The system includes these default categories:

- **National** - Indian news and updates
- **International** - Global news coverage
- **Sports** - Sports matches and results
- **Entertainment** - Movies, celebrities, events
- **Tech** - Technology and innovation
- **Business** - Economy and finance

## API Endpoints

All admin endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Articles

#### List Articles
```
GET /api/admin/articles?category=national&limit=10&page=1
```

**Query Parameters:**
- `category` (optional): Filter by category slug
- `limit` (optional, default: 10): Results per page
- `page` (optional, default: 1): Page number

#### Get Single Article
```
GET /api/admin/articles/:id
```

#### Create Article
```
POST /api/admin/articles
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Article Title",
  "summary": "Brief summary",
  "content": "Full content",
  "image": "https://example.com/image.jpg",
  "category": "National",
  "author": "Author Name",
  "isBreaking": true,
  "isTrending": false
}
```

#### Update Article
```
PATCH /api/admin/articles/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Updated Title",
  "views": 1000
}
```

#### Delete Article
```
DELETE /api/admin/articles/:id
Authorization: Bearer <token>
```

### Login

```
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

## Project Structure

```
lib/
├── auth/
│   ├── jwt.ts          # JWT utilities
│   └── service.ts      # Auth service (login, token management)
├── db/
│   └── mongoose.ts     # MongoDB connection (singleton pattern)
├── models/
│   ├── Article.ts      # Article schema and interface
│   ├── Author.ts       # Author schema and interface
│   └── Category.ts     # Category schema and interface
└── utils/
    └── formatNumber.ts # Number formatting utility

app/
├── api/
│   └── admin/
│       ├── login/route.ts              # Login endpoint
│       └── articles/
│           ├── route.ts                # List/Create articles
│           └── [id]/route.ts           # Get/Update/Delete article
├── admin/                              # Admin panel pages
└── ...

scripts/
└── seed.ts             # Database seeding script
```

## Database Schema

### ArticleCollection

```typescript
{
  _id: ObjectId
  title: string (required, max 200 chars)
  summary: string (required, max 500 chars)
  content: string (required)
  image: string (required)
  category: string (required, enum: National | International | Sports | Entertainment | Tech | Business)
  author: string (required)
  publishedAt: Date (default: now)
  updatedAt: Date (default: now)
  views: number (default: 0)
  isBreaking: boolean (default: false)
  isTrending: boolean (default: false)
}
```

### CategoryCollection

```typescript
{
  _id: ObjectId
  name: string (required, unique)
  slug: string (required, unique)
  description: string (required)
  icon: string (optional)
}
```

### AuthorCollection

```typescript
{
  _id: ObjectId
  name: string (required)
  email: string (required, unique)
  bio: string (required)
  avatar: string (required)
}
```

## Security Notes

⚠️ **Production Checklist:**

1. **Change Admin Credentials**
   - Generate bcrypt hash of new password
   - Update `ADMIN_PASSWORD_HASH` in `.env`

2. **Rotate JWT Secret**
   - Generate a new random string: `openssl rand -base64 32`
   - Update `JWT_SECRET` in `.env.local`

3. **Enable Production Network**
   - Remove "Allow Access from Anywhere"
   - Add only your server's IP to MongoDB Atlas

4. **Use Strong Passwords**
   - MongoDB user password: 16+ chars, mixed case, numbers, symbols
   - Admin password: 12+ chars, high entropy

5. **HTTPS Only**
   - Deploy on HTTPS in production
   - Set secure cookies: `sameSite: 'strict'`

6. **Token Storage**
   - Tokens stored in `localStorage` - use `sessionStorage` for extra security
   - Token expires in 7 days - rotation recommended

7. **API Rate Limiting**
   - Add rate limiting middleware to `/api/admin/*` routes
   - Prevent brute force attacks on login endpoint

## Troubleshooting

### MongoDB Connection Error

**Error:** `MongoParseError: Invalid scheme`

**Solution:** Ensure `MONGODB_URI` starts with `mongodb+srv://` and contains correct credentials.

### Authentication Failed

**Error:** `Invalid credentials` on login

**Solution:** 
- Verify `ADMIN_USERNAME` matches in `.env.local`
- Default password is `password`
- Check `ADMIN_PASSWORD_HASH` is properly set

### Seed Script Failed

**Error:** `MONGODB_URI not defined`

**Solution:** 
1. Create `.env.local` from `.env.local.example`
2. Add your actual MongoDB URI
3. Run `npm run seed` again

### Articles Not Displaying

1. Verify seed script ran successfully
2. Check MongoDB Atlas cluster is running
3. Confirm network access allows your IP

## Next Steps

1. ✅ MongoDB configured
2. ✅ Database seeded with sample data
3. Create custom admin dashboard features
4. Add image upload to articles (currently uses URLs)
5. Implement article drafts/scheduled publishing
6. Add author profile pages
7. Implement comments/discussion system

## Support

For issues or questions:
1. Check MongoDB Atlas documentation
2. Review Next.js API routes documentation
3. Verify `.env.local` has all required variables
4. Check browser console for client-side errors
5. Check terminal for server-side errors

---

**Last Updated:** 2024
**Version:** 1.0.0
