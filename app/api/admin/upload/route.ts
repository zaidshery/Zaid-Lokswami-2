import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth/adminToken';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

type UploadPurpose = 'image' | 'epaper-thumbnail' | 'epaper-paper' | 'video-thumbnail';

function parseUploadPurpose(value: FormDataEntryValue | null): UploadPurpose {
  if (value === 'epaper-thumbnail') return 'epaper-thumbnail';
  if (value === 'epaper-paper') return 'epaper-paper';
  if (value === 'video-thumbnail') return 'video-thumbnail';
  return 'image';
}

function bytesToMb(mb: number) {
  return mb * 1024 * 1024;
}

function getUploadSubdir(purpose: UploadPurpose) {
  if (purpose === 'epaper-thumbnail') return 'uploads/epapers/thumbnails';
  if (purpose === 'epaper-paper') return 'uploads/epapers/papers';
  if (purpose === 'video-thumbnail') return 'uploads/videos/thumbnails';
  return 'uploads/images';
}

function getFileExtension(file: File, purpose: UploadPurpose) {
  if (purpose === 'epaper-paper') return 'pdf';

  const mime = file.type.toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'application/pdf') return 'pdf';

  const fromName = path.extname(file.name || '').toLowerCase().replace('.', '');
  if (fromName) return fromName;

  return purpose === 'image' ? 'jpg' : 'bin';
}

function getFileRules(purpose: UploadPurpose) {
  if (purpose === 'video-thumbnail') {
    return {
      maxSize: bytesToMb(10),
      typeMessage: 'Video thumbnail must be JPG, JPEG, PNG, or PDF',
      sizeMessage: 'Video thumbnail size must be less than 10MB',
      isAllowed: (file: File) => {
        const mime = file.type.toLowerCase();
        const name = file.name.toLowerCase();
        return (
          mime === 'image/jpeg' ||
          mime === 'image/jpg' ||
          mime === 'image/png' ||
          mime === 'application/pdf' ||
          name.endsWith('.jpg') ||
          name.endsWith('.jpeg') ||
          name.endsWith('.png') ||
          name.endsWith('.pdf')
        );
      },
    };
  }

  if (purpose === 'epaper-thumbnail') {
    return {
      maxSize: bytesToMb(10),
      typeMessage: 'Thumbnail must be JPG, PNG, or PDF',
      sizeMessage: 'Thumbnail size must be less than 10MB',
      isAllowed: (file: File) => {
        const mime = file.type.toLowerCase();
        const name = file.name.toLowerCase();
        return (
          mime === 'image/jpeg' ||
          mime === 'image/jpg' ||
          mime === 'image/png' ||
          mime === 'application/pdf' ||
          name.endsWith('.jpg') ||
          name.endsWith('.jpeg') ||
          name.endsWith('.png') ||
          name.endsWith('.pdf')
        );
      },
    };
  }

  if (purpose === 'epaper-paper') {
    return {
      maxSize: bytesToMb(25),
      typeMessage: 'E-paper file must be PDF',
      sizeMessage: 'E-paper PDF size must be less than 25MB',
      isAllowed: (file: File) => {
        const mime = file.type.toLowerCase();
        const name = file.name.toLowerCase();
        return mime === 'application/pdf' || name.endsWith('.pdf');
      },
    };
  }

  return {
    maxSize: bytesToMb(5),
    typeMessage: 'Only image files are allowed',
    sizeMessage: 'Image size must be less than 5MB',
    isAllowed: (file: File) => {
      const mime = file.type.toLowerCase();
      const name = file.name.toLowerCase();
      return mime.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png');
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = verifyAdminToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const purpose = parseUploadPurpose(formData.get('purpose'));

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const rules = getFileRules(purpose);

    if (!rules.isAllowed(file)) {
      return NextResponse.json(
        { success: false, error: rules.typeMessage },
        { status: 400 }
      );
    }

    if (file.size > rules.maxSize) {
      return NextResponse.json(
        { success: false, error: rules.sizeMessage },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = getFileExtension(file, purpose);
    const subdir = getUploadSubdir(purpose);
    const uploadRoot = path.join(process.cwd(), 'public', ...subdir.split('/'));
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
    const outputPath = path.join(uploadRoot, filename);
    const url = `/${subdir}/${filename}`;

    await fs.mkdir(uploadRoot, { recursive: true });
    await fs.writeFile(outputPath, buffer);

    return NextResponse.json(
      {
        success: true,
        message: 'File uploaded successfully',
        data: {
          url,
          filename,
          size: file.size,
          type: file.type,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
