const mongoose = require('mongoose');
const Article = require('../lib/models/Article');
const Category = require('../lib/models/Category');
const Author = require('../lib/models/Author');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lokswami';

const categories = [
  { name: 'National', slug: 'national', description: 'National news and updates' },
  { name: 'International', slug: 'international', description: 'International news coverage' },
  { name: 'Sports', slug: 'sports', description: 'Sports news and updates' },
  { name: 'Entertainment', slug: 'entertainment', description: 'Entertainment and celebrity news' },
  { name: 'Tech', slug: 'tech', description: 'Technology and innovation news' },
  { name: 'Business', slug: 'business', description: 'Business and economy news' },
];

const authors = [
  {
    name: 'राज कुमार',
    email: 'raj@lokswami.com',
    bio: 'Senior journalist with 10+ years of experience',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=raj',
  },
  {
    name: 'प्रिया शर्मा',
    email: 'priya@lokswami.com',
    bio: 'Entertainment correspondent',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
  },
  {
    name: 'अमित पटेल',
    email: 'amit@lokswami.com',
    bio: 'Sports editor',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amit',
  },
];

const articles = [
  {
    title: 'राष्ट्रीय समाचार: नई नीति घोषणा',
    summary: 'सरकार ने आज एक महत्वपूर्ण आर्थिक नीति की घोषणा की है।',
    content: 'विस्तृत समाचार सामग्री यहां आएगी। यह एक नई नीति है जो अर्थव्यवस्था को बदलने के लिए तैयार है।',
    image: 'https://images.unsplash.com/photo-1557804506-669714d2e745?w=800',
    category: 'National',
    author: 'राज कुमार',
    isBreaking: true,
    isTrending: true,
    views: 125000,
    publishedAt: new Date(),
  },
  {
    title: 'क्रिकेट: भारत बनाम ऑस्ट्रेलिया',
    summary: 'आज का महत्वपूर्ण क्रिकेट मैच शुरू गया।',
    content: 'खेल के आंकड़े और विश्लेषण यहां दिए गए हैं।',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
    category: 'Sports',
    author: 'अमित पटेल',
    isBreaking: false,
    isTrending: true,
    views: 85000,
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    title: 'बॉलीवुड: नई फिल्म रिलीज',
    summary: 'एक बड़ी बॉलीवुड फिल्म आज रिलीज हुई।',
    content: 'फिल्म की समीक्षा और दर्शकों की प्रतिक्रिया।',
    image: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800',
    category: 'Entertainment',
    author: 'प्रिया शर्मा',
    isBreaking: false,
    isTrending: true,
    views: 95000,
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    title: 'तकनीकी विकास: AI का नया संस्करण',
    summary: 'कृत्रिम बुद्धिमत्ता में बड़ी प्रगति हुई है।',
    content: 'नई तकनीकी प्रगति और भविष्य की संभावनाएं।',
    image: 'https://images.unsplash.com/photo-1677442d019cecf8f7a1c3bf4fb96e6ad91e8c55?w=800',
    category: 'Tech',
    author: 'राज कुमार',
    isBreaking: false,
    isTrending: false,
    views: 45000,
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    title: 'व्यापार: शेयर बाजार में उछाल',
    summary: 'शेयर बाजार में आज सकारात्मक रुझान देखे गए।',
    content: 'बाजार विश्लेषण और निवेश के सुझाव।',
    image: 'https://images.unsplash.com/photo-1460925895917-adf4e20df82f?w=800',
    category: 'Business',
    author: 'राज कुमार',
    isBreaking: false,
    isTrending: false,
    views: 32000,
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
  {
    title: 'अंतर्राष्ट्रीय: जलवायु सम्मेलन',
    summary: 'विश्व की प्रमुख शक्तियां जलवायु परिवर्तन पर चर्चा कर रही हैं।',
    content: 'सम्मेलन के मुख्य बिंदु और समझौते।',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
    category: 'International',
    author: 'प्रिया शर्मा',
    isBreaking: false,
    isTrending: false,
    views: 55000,
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await Article.deleteMany({});
    await Category.deleteMany({});
    await Author.deleteMany({});
    console.log('✓ Cleared existing data');

    // Seed categories
    await Category.insertMany(categories);
    console.log('✓ Seeded categories');

    // Seed authors
    await Author.insertMany(authors);
    console.log('✓ Seeded authors');

    // Seed articles
    await Article.insertMany(articles);
    console.log('✓ Seeded articles');

    console.log('\n✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
