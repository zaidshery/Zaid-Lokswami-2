# Lokswami Admin CMS - Quick Reference

## 🚀 Quick Start (5 minutes)

```bash
# 1. Add MongoDB URI to .env.local
MONGODB_URI=mongodb+srv://...

# 2. Install & seed database
npm install
npm run seed

# 3. Start development server
npm run dev

# 4. Login to admin
# Visit: http://localhost:3000/login
# Username: admin
# Password: password
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `lib/db/mongoose.ts` | MongoDB connection |
| `lib/models/*.ts` | Database schemas |
| `app/api/admin/*.ts` | API endpoints |
| `lib/auth/service.ts` | Login utilities |
| `.env.local` | Secrets (create from `.env.local.example`) |
| `MONGODB_SETUP.md` | Full setup guide |

---

## 🔌 API Endpoints

### Authentication
```
POST /api/admin/login
├─ Input: {username, password}
└─ Output: {token, user}
```

### Articles
```
GET    /api/admin/articles?category=X&limit=10&page=1
POST   /api/admin/articles {title, summary, content, image, category, author}
GET    /api/admin/articles/:id
PATCH  /api/admin/articles/:id {title, summary, ...}
DELETE /api/admin/articles/:id
```

---

## 🔐 Authentication

```typescript
// Login & store token
const response = await fetch('/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'password' })
});
const { token } = await response.json();
localStorage.setItem('lokswami_admin_token', token);

// Use token in requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

---

## 💾 Database Models

### Article
```typescript
{
  title: string (required)
  summary: string (required)
  content: string (required)
  image: string (required)
  category: string (National|International|Sports|Entertainment|Tech|Business)
  author: string (required)
  views: number (default: 0)
  isBreaking: boolean (default: false)
  isTrending: boolean (default: false)
  publishedAt: Date
  updatedAt: Date
}
```

### Category
```typescript
{
  name: string (unique)
  slug: string (unique)
  description: string
  icon: string? (optional)
}
```

### Author
```typescript
{
  name: string (required)
  email: string (unique)
  bio: string (required)
  avatar: string (required)
}
```

---

## 📝 npm Scripts

```bash
npm run dev              # Start development server
npm run build           # Production build
npm run start           # Start production server
npm run lint            # Check code quality
npm run seed            # Populate database with sample data
npm run hash-password   # Generate bcrypt hash for new password
```

---

## 🛠️ Helpful Commands

### Generate Password Hash
```bash
npm run hash-password
# Follow prompt, copy output to ADMIN_PASSWORD_HASH in .env.local
```

### Test API with curl
```bash
# Login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# List articles
curl http://localhost:3000/api/admin/articles

# Create article (replace TOKEN)
curl -X POST http://localhost:3000/api/admin/articles \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Article",
    "summary":"Test",
    "content":"Test content",
    "image":"https://example.com/img.jpg",
    "category":"National",
    "author":"Test Author"
  }'
```

---

## 🔍 Query Parameters

### Article List
```
GET /api/admin/articles?category=sports&limit=5&page=2
├─ category (optional): Filter by category slug
├─ limit (optional): Items per page (default: 10)
└─ page (optional): Page number (default: 1)
```

---

## ❌ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `MONGODB_URI not defined` | Missing .env.local | Create `.env.local` from template with MongoDB URI |
| `MongoParseError: Invalid scheme` | Wrong URI format | Use full connection string: `mongodb+srv://...` |
| `Invalid credentials` | Wrong username/password | Default: `admin` / `password` |
| `401 Unauthorized` | Missing or invalid token | Add `Authorization: Bearer TOKEN` header |
| `Cannot POST /api/admin/articles` | Route not found | Verify file at `app/api/admin/articles/route.ts` exists |

---

## 🔐 Security Checklist

- [ ] Add MongoDB URI to `.env.local`
- [ ] Change admin password: `npm run hash-password`
- [ ] Update `ADMIN_PASSWORD_HASH` in `.env.local`
- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] Enable HTTPS in production
- [ ] Restrict MongoDB IP access (don't use "Allow Anywhere")
- [ ] Keep `.env.local` out of git (add to `.gitignore`)
- [ ] Never commit `.env.local` file

---

## 📊 Database Info

**Seed Data Includes:**
- 6 Categories (National, International, Sports, Entertainment, Tech, Business)
- 3 Authors (with avatars)
- 6 Articles (with real images from Unsplash)

**Default Credentials:**
- Username: `admin`
- Password: `password`
- Token Expiry: 7 days

---

## 🎯 Next Steps

1. ✅ Base setup complete (you're here!)
2. Create login page at `/login`
3. Build admin dashboard at `/admin`
4. Implement article CRUD forms
5. Add image upload functionality
6. Create category/author management
7. Add search and filtering
8. Deploy to production

See [ADMIN_CMS_CHECKLIST.md](./ADMIN_CMS_CHECKLIST.md) for detailed roadmap.

---

## 📚 Resources

- [MongoDB Docs](https://docs.mongodb.com)
- [Mongoose Guide](https://mongoosejs.com/docs)
- [JWT.io](https://jwt.io)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [bcryptjs](https://www.npmjs.com/package/bcryptjs)

---

## 💡 Tips

- **Local Testing**: MongoDB free tier supports testing
- **Postman**: Use for API testing before frontend
- **Token Storage**: Currently in localStorage (consider sessionStorage for security)
- **View Counter**: Track article views by incrementing on GET request
- **Pagination**: Always implement for scalability

---

**Last Updated:** 2024 | **Version:** 1.0.0
