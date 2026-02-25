import fs from 'fs';
import fsp from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import {
  getFileMimeType,
  isServableUploadFilePath,
  resolveStorageProxyPath,
} from '@/lib/utils/epaperStorage';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { path: pathSegments } = await context.params;
    const absolutePath = resolveStorageProxyPath(Array.isArray(pathSegments) ? pathSegments : []);

    if (!absolutePath) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    if (!isServableUploadFilePath(absolutePath)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    const stats = await fsp.stat(absolutePath).catch(() => null);
    if (!stats || !stats.isFile()) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const stream = fs.createReadStream(absolutePath);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        'Content-Type': getFileMimeType(absolutePath),
        'Content-Length': String(stats.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to serve public upload file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read file' },
      { status: 500 }
    );
  }
}
