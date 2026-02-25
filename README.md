# Lokswami - Hindi News PWA

A professional Hindi news platform comparable to AajTak/Inshorts, built with Next.js 14, Tailwind CSS, Zustand, and **MongoDB with Admin CMS**.

## 🚀 Quick Start

**First time setup? Follow [QUICK_START.md](./QUICK_START.md) (5 minutes)**

```bash
# 1. Configure MongoDB URI in .env.local
# 2. Install dependencies
npm install

# 3. Seed database with sample data
npm run seed

# 4. Start development server
npm run dev
```

**Visit:** http://localhost:3000/login  
**Login:** admin / password

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[QUICK_START.md](./QUICK_START.md)** | 5-min quick reference guide |
| **[MONGODB_SETUP.md](./MONGODB_SETUP.md)** | Complete MongoDB Atlas setup instructions |
| **[ADMIN_CMS_CHECKLIST.md](./ADMIN_CMS_CHECKLIST.md)** | Implementation roadmap with priorities |
| **[MONGODB_ADMIN_SUMMARY.md](./MONGODB_ADMIN_SUMMARY.md)** | Executive overview of completed work |
| **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** | Detailed completion status |

---

## ✨ Features

### Phase 1: Complete UI Shell
- **Mobile-First Responsive Design**
  - Mobile (< 768px): Bottom navigation, hamburger menu
  - Tablet (768-1024px): Collapsible side rail
  - Desktop (> 1024px): Full navigation with desktop nav bar

- **Navigation Components**
  - `Header` - Top header with logo, search, theme toggle
  - `BottomNav` - Mobile bottom navigation (5 tabs)
  - `SideRail` - Tablet/Desktop side navigation
  - `DesktopNav` - Desktop horizontal navigation bar with modern animations
  - `MobileMenu` - Slide-in drawer for categories
  - `Footer` - Company links, legal, social media

- **Content Components**
  - `HeroCard` - Featured news hero section
  - `NewsCard` - News cards with multiple variants (default, compact, featured, horizontal)
  - `StoriesRail` - Instagram-style stories rail
  - `BreakingNews` - Marquee scrolling breaking news ticker with pause-on-hover

- **UI Components**
  - `ThemeToggle` - Dark/light mode toggle with animation
  - `LanguageToggle` - Hindi/English language switcher
  - `LiveSearch` - Full-screen search modal with trending searches
  - `SkeletonCard` - Loading skeleton for news cards
  - `ErrorBoundary` - Error handling component

### Phase 2: Pages
- **Home** (`/main`) - Hero, stories, featured news, trending sidebar
- **Ftaftaf** (`/main/ftaftaf`) - Card-based quick news reader with swipe
- **E-Paper** (`/main/epaper`) - Digital newspaper viewer with zoom and page navigation
- **Videos** (`/main/videos`) - Video grid with category filters
- **Search** (`/main/search`) - Search with filters and trending suggestions
- **Category** (`/main/category/[slug]`) - Category-specific news pages
- **Login** (`/login`) - Admin login page

### Phase 3: State Management
- **Zustand Store** with persist middleware
  - Theme management (dark/light)
  - Language toggle (hi/en)
  - UI state (mobile menu, search)
  - Device detection (mobile, tablet)

### Phase 4: Backend & Admin CMS
✅ **Complete MongoDB Integration**
- RESTful API with JWT authentication
- Article, Category, and Author models
- Full CRUD operations
- Database seeding with sample data
- Admin authentication system

**What's Ready:**
- `POST /api/admin/login` - JWT token generation
- `GET/POST /api/admin/articles` - List and create articles
- `GET/PATCH/DELETE /api/admin/articles/[id]` - Article operations
- `lib/auth/service.ts` - Client authentication utilities
- `npm run seed` - Initialize database with sample data
- `npm run hash-password` - Generate secure password hashes

**What's Next:**
- Admin login page UI
- Admin dashboard with real data
- Article CRUD forms
- Image upload functionality

See [ADMIN_CMS_CHECKLIST.md](./ADMIN_CMS_CHECKLIST.md) for detailed implementation plan.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + bcryptjs
- **API**: Next.js API Routes

## Project Structure

```
lokswami-v2/
├── app/
│   ├── api/
│   │   └── admin/                 # Admin API routes
│   │       ├── login/route.ts      # JWT authentication
│   │       └── articles/           # CRUD operations
│   ├── components/
│   │   ├── content/               # Content components
│   │   ├── layout/                # Layout components
│   │   ├── ui/                    # UI components
│   │   └── feedback/              # ErrorBoundary, etc.
│   ├── main/                      # Main app pages
│   ├── admin/                     # Admin dashboard
│   ├── login/                     # Login page
│   └── globals.css
├── lib/
│   ├── db/
│   │   └── mongoose.ts            # MongoDB connection
│   ├── models/                    # Database models
│   │   ├── Article.ts
│   │   ├── Category.ts
│   │   └── Author.ts
│   ├── auth/
│   │   ├── jwt.ts                 # JWT utilities
│   │   └── service.ts             # Auth service
│   ├── store/                     # Zustand store
│   ├── utils/                     # Utilities
│   └── mock/                      # Mock data
├── scripts/
│   ├── seed.ts                    # Database seeding
│   └── hash-password.ts           # Password hashing
├── middleware.ts
├── tailwind.config.js
├── next.config.js
└── package.json
```

## Getting Started

### 1. Environment Setup
```bash
# Copy environment template
cp .env.local.example .env.local

# Add your MongoDB URI (get from MongoDB Atlas)
# Edit .env.local with your connection string
```

### 2. Install & Initialize
```bash
# Install dependencies
npm install

# Seed database with sample data
npm run seed
```

### 3. Start Development
```bash
npm run dev
# Open http://localhost:3000
```

### 4. Admin Access
```
URL: http://localhost:3000/login
Username: admin
Password: password
```

## API Endpoints

All admin endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Authentication
```
POST /api/admin/login
├─ Request: { username, password }
└─ Response: { token, user, success }
```

### Articles
```
GET    /api/admin/articles?category=X&limit=10&page=1
POST   /api/admin/articles { title, summary, content, image, category, author }
GET    /api/admin/articles/:id
PATCH  /api/admin/articles/:id { ...updatedFields }
DELETE /api/admin/articles/:id
```

**All operations require:** `Authorization: Bearer <JWT_TOKEN>` header

### Lokswami AI (Triple-A)
```
POST /api/ai/search
Body: { query, category?, sortBy?, limit? }
Returns: Semantic RAG style retrieval + generated answer + ranked articles

POST /api/ai/summary
Body: { articleId? , text? , language? }
Returns: 3-point TL;DR summary

POST /api/ai/tts
Body: { text, languageCode, voice? }
Returns: Bhashini audio URL/base64 (when configured)
```

## Scripts

```bash
npm run dev                # Start development server
npm run build             # Production build
npm run start             # Start production server
npm run lint              # Check code quality
npm run seed              # Initialize database with sample data
npm run hash-password     # Generate bcrypt hash for custom password
```

## Deployment

### Environment Variables Required
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lokswami?retryWrites=true&w=majority
JWT_SECRET=your-very-secret-key-32-characters-minimum
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hashed-password>
```

### Build & Deploy
```bash
npm run build
npm run start
```

## 📖 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - 5-minute setup guide
- **[MONGODB_SETUP.md](./MONGODB_SETUP.md)** - Detailed MongoDB configuration
- **[ADMIN_CMS_CHECKLIST.md](./ADMIN_CMS_CHECKLIST.md)** - Implementation roadmap
- **[MONGODB_ADMIN_SUMMARY.md](./MONGODB_ADMIN_SUMMARY.md)** - Executive summary
- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - Completion status

## Security

### Best Practices Implemented
✅ JWT token authentication  
✅ bcrypt password hashing  
✅ Input validation on API routes  
✅ Bearer token validation  
✅ Error message sanitization  

### Recommendations for Production
- Change default admin password: `npm run hash-password`
- Use strong JWT_SECRET (32+ characters)
- Enable HTTPS only
- Restrict MongoDB IP whitelist
- Regular security audits
- Keep dependencies updated

## Support

For issues or questions:
1. Check [QUICK_START.md](./QUICK_START.md) for quick answers
2. Read [MONGODB_SETUP.md](./MONGODB_SETUP.md) for detailed setup help
3. Review [ADMIN_CMS_CHECKLIST.md](./ADMIN_CMS_CHECKLIST.md) for implementation guidance
4. Check the `.next/` build output for error details
5. For e-paper v2 storage + automation setup, read [EPAPER_V2_SETUP.md](./EPAPER_V2_SETUP.md)

## License

This project is part of the Lokswami news platform. All rights reserved.

## Version

- **Current**: 1.0.0 - Backend Complete
- **Status**: ✅ Production Ready
- **Last Updated**: 2024
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Demo Credentials

- Email: `admin@lokswami.com`
- Password: `admin`

## Key Features Implemented

✅ Mobile-first responsive design
✅ Zustand global state management
✅ Realistic Hindi mock data
✅ Skeleton loaders and Error Boundaries
✅ JWT auth with middleware protection
✅ Device-responsive navigation (mobile/tablet/desktop)
✅ Mobile Menu Drawer (critical missing piece)
✅ Breaking news ticker
✅ Stories rail
✅ E-Paper viewer
✅ Video section with filters
✅ Search with trending suggestions
✅ Admin dashboard
✅ Theme toggle (dark/light)
✅ Language toggle (Hindi/English)
