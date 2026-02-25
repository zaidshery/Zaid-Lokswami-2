import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import EPaper from '@/lib/models/EPaper';
import { verifyAdminToken } from '@/lib/auth/adminToken';
import {
  EPAPER_CITY_OPTIONS,
  getCityNameFromSlug,
  normalizeCityName,
  normalizeCitySlug,
} from '@/lib/constants/epaperCities';
import {
  deleteEpaperDirectory,
  formatPublishDateFolder,
  getImageDimensions,
  inferPdfPageCount,
  parsePublishDate,
  resolveImageTargetName,
  saveUpload,
} from '@/lib/utils/epaperStorage';

function resolveCityName(citySlug: string, rawCityName: string) {
  const normalizedInputName = normalizeCityName(rawCityName);
  if (normalizedInputName) return normalizedInputName;

  const fromSlug = getCityNameFromSlug(citySlug);
  if (fromSlug) return fromSlug;

  return rawCityName.trim();
}

function parseOptionalPageCount(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return Math.floor(parsed);
}

function isFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value);
}

function mapEpaper(epaper: unknown) {
  const source =
    typeof epaper === 'object' && epaper !== null ? (epaper as Record<string, unknown>) : {};
  const publishDate = new Date(String(source.publishDate || ''));
  return {
    _id: String(source._id),
    citySlug: String(source.citySlug || ''),
    cityName: String(source.cityName || ''),
    title: String(source.title || ''),
    publishDate: Number.isNaN(publishDate.getTime())
      ? ''
      : publishDate.toISOString().slice(0, 10),
    pdfPath: String(source.pdfPath || ''),
    thumbnailPath: String(source.thumbnailPath || ''),
    pageCount: Number(source.pageCount || 0),
    pages: Array.isArray(source.pages) ? source.pages : [],
    status: source.status === 'published' ? 'published' : 'draft',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export async function POST(req: NextRequest) {
  let cleanupCitySlug = '';
  let cleanupPublishDateFolder = '';

  try {
    const admin = verifyAdminToken(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const formData = await req.formData();

    const citySlug = normalizeCitySlug(String(formData.get('citySlug') || ''));
    const rawCityName = String(formData.get('cityName') || '').trim();
    const title = String(formData.get('title') || '').trim();
    const publishDateInput = String(formData.get('publishDate') || '').trim();
    const optionalPageCount = parseOptionalPageCount(String(formData.get('pageCount') || ''));
    const statusInput = String(formData.get('status') || '').trim().toLowerCase();

    const pdf = formData.get('pdf');
    const thumbnail = formData.get('thumbnail');
    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    const pageImageFiles = formData
      .getAll('pageImages')
      .filter(isFile)
      .filter((file) => file.size > 0)
      .sort((a, b) => collator.compare(a.name || '', b.name || ''));

    if (!citySlug) {
      return NextResponse.json(
        { success: false, error: 'citySlug is required and must be valid' },
        { status: 400 }
      );
    }
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'title is required' },
        { status: 400 }
      );
    }
    if (!publishDateInput) {
      return NextResponse.json(
        { success: false, error: 'publishDate is required' },
        { status: 400 }
      );
    }
    if (!isFile(pdf) || pdf.size <= 0) {
      return NextResponse.json(
        { success: false, error: 'PDF file is required' },
        { status: 400 }
      );
    }
    if (!isFile(thumbnail) || thumbnail.size <= 0) {
      return NextResponse.json(
        { success: false, error: 'Thumbnail file is required' },
        { status: 400 }
      );
    }

    const publishDate = parsePublishDate(publishDateInput);
    if (!publishDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'publishDate must be valid (YYYY-MM-DD or DD-MM-YYYY)',
        },
        { status: 400 }
      );
    }

    const cityName = resolveCityName(citySlug, rawCityName);
    if (!cityName) {
      return NextResponse.json(
        {
          success: false,
          error: `cityName is required for "${citySlug}". Known slugs: ${EPAPER_CITY_OPTIONS.map((item) => item.slug).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const existing = await EPaper.findOne({
      citySlug,
      publishDate,
    })
      .select('_id')
      .lean();
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `E-paper already exists for ${citySlug} on ${publishDate.toISOString().slice(0, 10)}`,
        },
        { status: 409 }
      );
    }

    const publishDateFolder = formatPublishDateFolder(publishDate);
    const targetDir = `${citySlug}/${publishDateFolder}`;
    cleanupCitySlug = citySlug;
    cleanupPublishDateFolder = publishDateFolder;

    const inferredPageCount = await inferPdfPageCount(pdf);
    const pageCount = Math.max(
      pageImageFiles.length,
      optionalPageCount,
      inferredPageCount > 0 ? inferredPageCount : 0
    );

    if (pageCount < 1) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not infer PDF page count. Please upload page images or provide pageCount.',
        },
        { status: 400 }
      );
    }
    if (pageCount > 1000) {
      return NextResponse.json(
        { success: false, error: 'pageCount is too high (max 1000)' },
        { status: 400 }
      );
    }

    const pdfPath = await saveUpload(pdf, targetDir, 'epaper.pdf');
    const thumbnailPath = await saveUpload(
      thumbnail,
      targetDir,
      resolveImageTargetName('thumbnail', thumbnail)
    );

    const pages: Array<{
      pageNumber: number;
      imagePath?: string;
      width?: number;
      height?: number;
    }> = Array.from({ length: pageCount }, (_, index) => ({
      pageNumber: index + 1,
    }));

    for (let index = 0; index < pageImageFiles.length; index += 1) {
      const pageNumber = index + 1;
      const file = pageImageFiles[index];
      const imagePath = await saveUpload(
        file,
        `${targetDir}/pages`,
        resolveImageTargetName('page', file, pageNumber)
      );
      const dimensions = await getImageDimensions(file);

      pages[index] = {
        pageNumber,
        imagePath,
        width: dimensions?.width,
        height: dimensions?.height,
      };
    }

    const epaper = await EPaper.create({
      citySlug,
      cityName,
      title,
      publishDate,
      pdfPath,
      thumbnailPath,
      pageCount,
      pages,
      status: statusInput === 'published' ? 'published' : 'draft',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'E-paper uploaded successfully',
        warning:
          pageImageFiles.length === 0
            ? 'Add page images to enable hotspot drawing'
            : null,
        data: mapEpaper(epaper.toObject()),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Only PDF files are allowed') || message.includes('PDF size exceeds')) {
      return NextResponse.json(
        { success: false, error: 'PDF file must be valid and under 25MB' },
        { status: 400 }
      );
    }
    if (message.includes('PDF file signature is invalid')) {
      return NextResponse.json(
        { success: false, error: 'Uploaded PDF is invalid or corrupted' },
        { status: 400 }
      );
    }
    if (
      message.includes('Only JPG, PNG, or WEBP images are allowed') ||
      message.includes('Image size exceeds 10MB')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thumbnail/page images must be JPG, PNG, or WEBP and under 10MB',
        },
        { status: 400 }
      );
    }
    if (message.includes('Image signature is invalid')) {
      return NextResponse.json(
        { success: false, error: 'One or more image files are invalid or corrupted' },
        { status: 400 }
      );
    }

    const duplicateCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000;
    if (duplicateCode) {
      return NextResponse.json(
        { success: false, error: 'An e-paper for this city/date already exists' },
        { status: 409 }
      );
    }

    if (
      /No writable e-paper storage directory available|EACCES|EPERM|EROFS|ENOSPC/i.test(
        message
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Server storage is not writable. Set EPAPER_STORAGE_UPLOADS_BASE_DIR to a writable directory and retry.',
        },
        { status: 500 }
      );
    }

    if (cleanupCitySlug && cleanupPublishDateFolder) {
      await deleteEpaperDirectory(cleanupCitySlug, cleanupPublishDateFolder);
    }

    console.error('Failed to upload e-paper:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          message && process.env.NODE_ENV !== 'production'
            ? `Failed to upload e-paper: ${message}`
            : 'Failed to upload e-paper',
      },
      { status: 500 }
    );
  }
}
