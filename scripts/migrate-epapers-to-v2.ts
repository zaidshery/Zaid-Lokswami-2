#!/usr/bin/env ts-node

import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import EPaperArticle from '../lib/models/EPaperArticle';
import {
  getCitySlugFromName,
  normalizeCityName,
  normalizeCitySlug,
} from '../lib/constants/epaperCities';
import { parsePublishDate } from '../lib/utils/epaperStorage';
import { slugifyTitle } from '../lib/utils/epaperArticles';

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return typeof value === 'object' && value !== null ? (value as AnyRecord) : {};
}

function parsePositiveInt(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return Math.floor(parsed);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toIsoDateLabel(input: Date) {
  return input.toISOString().slice(0, 10);
}

function resolvePublishDate(raw: unknown) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(
      Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate())
    );
  }

  const parsed = parsePublishDate(String(raw ?? '').trim());
  return parsed;
}

function resolveCity(raw: AnyRecord) {
  const cityValue =
    typeof raw.city === 'string'
      ? raw.city
      : typeof raw.cityName === 'string'
        ? raw.cityName
        : typeof raw.citySlug === 'string'
          ? raw.citySlug
          : '';

  const normalizedSlug =
    getCitySlugFromName(cityValue) ||
    normalizeCitySlug(cityValue) ||
    normalizeCitySlug(String(raw.citySlug || ''));
  if (!normalizedSlug) return null;

  const normalizedName =
    normalizeCityName(cityValue) ||
    normalizeCityName(String(raw.cityName || '')) ||
    cityValue.trim();
  if (!normalizedName) return null;

  return { citySlug: normalizedSlug, cityName: normalizedName };
}

function resolvePageCount(raw: AnyRecord) {
  const oldPages = raw.pages;
  const pageCountFromField = parsePositiveInt(raw.pageCount);
  const pageCountFromOldNumber = parsePositiveInt(oldPages);
  const pageCountFromArray = Array.isArray(oldPages) ? oldPages.length : 0;

  let pageCount = Math.max(pageCountFromField, pageCountFromOldNumber, pageCountFromArray);
  const hotspots = Array.isArray(raw.articleHotspots) ? raw.articleHotspots : [];
  for (const hotspot of hotspots) {
    const page = parsePositiveInt(asRecord(hotspot).page);
    if (page > pageCount) pageCount = page;
  }

  return Math.max(1, pageCount);
}

function buildPages(raw: AnyRecord, pageCount: number) {
  const oldPages = Array.isArray(raw.pages) ? raw.pages : [];
  const map = new Map<number, { pageNumber: number; imagePath?: string; width?: number; height?: number }>();

  for (const page of oldPages) {
    const source = asRecord(page);
    const pageNumber = parsePositiveInt(source.pageNumber);
    if (!pageNumber) continue;
    map.set(pageNumber, {
      pageNumber,
      imagePath: typeof source.imagePath === 'string' ? source.imagePath.trim() : '',
      width: parsePositiveInt(source.width) || undefined,
      height: parsePositiveInt(source.height) || undefined,
    });
  }

  return Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const existing = map.get(pageNumber);
    return {
      pageNumber,
      imagePath: existing?.imagePath || '',
      width: existing?.width,
      height: existing?.height,
    };
  });
}

function isAlreadyV2(raw: AnyRecord) {
  return (
    typeof raw.citySlug === 'string' &&
    typeof raw.cityName === 'string' &&
    typeof raw.pdfPath === 'string' &&
    typeof raw.thumbnailPath === 'string' &&
    typeof raw.pageCount === 'number' &&
    Array.isArray(raw.pages)
  );
}

function normalizeLegacyHotspots(raw: AnyRecord, pageCount: number) {
  const hotspots = Array.isArray(raw.articleHotspots) ? raw.articleHotspots : [];
  const normalized: Array<{
    title: string;
    slug: string;
    pageNumber: number;
    excerpt: string;
    contentHtml: string;
    hotspot: { x: number; y: number; w: number; h: number };
  }> = [];
  const slugSet = new Set<string>();

  for (let index = 0; index < hotspots.length; index += 1) {
    const source = asRecord(hotspots[index]);
    const pageNumber = Math.max(1, Math.min(pageCount, parsePositiveInt(source.page) || 1));
    const title = typeof source.title === 'string' && source.title.trim()
      ? source.title.trim()
      : `Article ${index + 1}`;
    const text = typeof source.text === 'string' ? source.text.trim() : '';

    let x = Number.parseFloat(String(source.x ?? '0')) / 100;
    let y = Number.parseFloat(String(source.y ?? '0')) / 100;
    let w = Number.parseFloat(String(source.width ?? source.w ?? '0')) / 100;
    let h = Number.parseFloat(String(source.height ?? source.h ?? '0')) / 100;
    if (!Number.isFinite(x)) x = 0;
    if (!Number.isFinite(y)) y = 0;
    if (!Number.isFinite(w) || w <= 0) w = 0.1;
    if (!Number.isFinite(h) || h <= 0) h = 0.1;

    x = clamp01(x);
    y = clamp01(y);
    w = Math.max(0.0001, Math.min(1 - x, clamp01(w)));
    h = Math.max(0.0001, Math.min(1 - y, clamp01(h)));

    const baseSlug = slugifyTitle(title || String(source.id || `article-${index + 1}`)) || `article-${index + 1}`;
    let slug = baseSlug;
    let suffix = 2;
    while (slugSet.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    slugSet.add(slug);

    normalized.push({
      title,
      slug,
      pageNumber,
      excerpt: text.slice(0, 240),
      contentHtml: text ? `<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>` : '',
      hotspot: {
        x: Number(x.toFixed(6)),
        y: Number(y.toFixed(6)),
        w: Number(w.toFixed(6)),
        h: Number(h.toFixed(6)),
      },
    });
  }

  return normalized;
}

async function migrate() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required.');
  }

  await mongoose.connect(mongoUri, { bufferCommands: false });
  const collection = mongoose.connection.collection('epapers');

  const docs = await collection.find({}).toArray();
  let total = 0;
  let migrated = 0;
  let skipped = 0;
  let articleMigrated = 0;
  let failed = 0;

  for (const doc of docs) {
    total += 1;
    const raw = asRecord(doc);
    const docId = raw._id as Types.ObjectId;
    const label = String(docId);

    try {
      if (isAlreadyV2(raw)) {
        skipped += 1;
        continue;
      }

      const city = resolveCity(raw);
      if (!city) {
        console.warn(`[skip ${label}] Could not resolve city slug/name.`);
        skipped += 1;
        continue;
      }

      const publishDate = resolvePublishDate(raw.publishDate ?? raw.publishedAt);
      if (!publishDate) {
        console.warn(`[skip ${label}] Invalid publishDate.`);
        skipped += 1;
        continue;
      }

      const title =
        typeof raw.title === 'string' && raw.title.trim()
          ? raw.title.trim()
          : `${city.cityName} E-Paper ${toIsoDateLabel(publishDate)}`;
      const pdfPath =
        typeof raw.pdfPath === 'string' && raw.pdfPath.trim()
          ? raw.pdfPath.trim()
          : typeof raw.pdfUrl === 'string'
            ? raw.pdfUrl.trim()
            : '';
      const thumbnailPath =
        typeof raw.thumbnailPath === 'string' && raw.thumbnailPath.trim()
          ? raw.thumbnailPath.trim()
          : typeof raw.thumbnail === 'string'
            ? raw.thumbnail.trim()
            : '';
      if (!pdfPath || !thumbnailPath) {
        console.warn(`[skip ${label}] Missing pdfPath/thumbnailPath.`);
        skipped += 1;
        continue;
      }

      const duplicate = await collection.findOne({
        _id: { $ne: docId },
        citySlug: city.citySlug,
        publishDate,
      });
      if (duplicate) {
        console.warn(
          `[skip ${label}] Duplicate city/date conflict (${city.citySlug}, ${toIsoDateLabel(
            publishDate
          )}).`
        );
        skipped += 1;
        continue;
      }

      const pageCount = resolvePageCount(raw);
      const pages = buildPages(raw, pageCount);

      await collection.updateOne(
        { _id: docId },
        {
          $set: {
            citySlug: city.citySlug,
            cityName: city.cityName,
            title,
            publishDate,
            pdfPath,
            thumbnailPath,
            pageCount,
            pages,
            status:
              raw.status === 'draft' || raw.status === 'published'
                ? raw.status
                : 'published',
          },
          $unset: {
            city: '',
            pdfUrl: '',
            thumbnail: '',
            articleHotspots: '',
            description: '',
          },
        }
      );
      migrated += 1;

      const existingArticleCount = await EPaperArticle.countDocuments({
        epaperId: docId,
      });
      if (existingArticleCount > 0) {
        continue;
      }

      const legacyArticles = normalizeLegacyHotspots(raw, pageCount);
      if (legacyArticles.length === 0) {
        continue;
      }

      const articleDocs = legacyArticles.map((article) => ({
        epaperId: docId,
        pageNumber: article.pageNumber,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        contentHtml: article.contentHtml,
        coverImagePath: '',
        hotspot: article.hotspot,
      }));

      await EPaperArticle.insertMany(articleDocs, { ordered: false });
      articleMigrated += articleDocs.length;
    } catch (error: unknown) {
      failed += 1;
      console.error(
        `[fail ${label}]`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log('');
  console.log('EPaper migration summary');
  console.log(`Total scanned: ${total}`);
  console.log(`Migrated docs: ${migrated}`);
  console.log(`Skipped docs: ${skipped}`);
  console.log(`Failed docs: ${failed}`);
  console.log(`Migrated article hotspots -> EPaperArticle: ${articleMigrated}`);
}

migrate()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Migration failed:', error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
