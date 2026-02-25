export const ARTICLE_IMAGE_UPLOAD_GUIDE =
  'Recommended: 16:9 landscape, at least 1920x1080 for crisp desktop, tablet, and mobile cards.';

const DEFAULT_MAX_LONG_EDGE = 2400;
const DEFAULT_JPEG_QUALITY = 0.9;
const RECOMMENDED_MIN_WIDTH = 1920;
const RECOMMENDED_MIN_HEIGHT = 1080;

type PreparedArticleImage = {
  file: File;
  previewDataUrl: string;
  width: number;
  height: number;
  wasResized: boolean;
};

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => resolve((reader.result as string) || '');
    reader.readAsDataURL(blob);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('Failed to load image for processing'));
    image.onload = () => resolve(image);
    image.src = dataUrl;
  });
}

function replaceFileExtension(filename: string, extension: 'jpg' | 'png') {
  const base = filename.replace(/\.[^/.]+$/, '');
  return `${base || 'article-image'}.${extension}`;
}

function getOutputMimeType(inputType: string) {
  return inputType.toLowerCase() === 'image/png' ? 'image/png' : 'image/jpeg';
}

export async function prepareArticleImageFile(
  file: File,
  options?: { maxLongEdge?: number; jpegQuality?: number }
): Promise<PreparedArticleImage> {
  const maxLongEdge = options?.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;
  const jpegQuality = options?.jpegQuality ?? DEFAULT_JPEG_QUALITY;

  const originalPreview = await readAsDataUrl(file);
  const originalImage = await loadImage(originalPreview);

  const originalWidth = Math.max(1, Math.round(originalImage.width));
  const originalHeight = Math.max(1, Math.round(originalImage.height));
  const longEdge = Math.max(originalWidth, originalHeight);

  if (longEdge <= maxLongEdge) {
    return {
      file,
      previewDataUrl: originalPreview,
      width: originalWidth,
      height: originalHeight,
      wasResized: false,
    };
  }

  const scale = maxLongEdge / longEdge;
  const resizedWidth = Math.max(1, Math.round(originalWidth * scale));
  const resizedHeight = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = resizedWidth;
  canvas.height = resizedHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not initialize canvas context');
  }

  context.drawImage(originalImage, 0, 0, resizedWidth, resizedHeight);

  const outputMime = getOutputMimeType(file.type);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Image resize failed'));
          return;
        }
        resolve(result);
      },
      outputMime,
      outputMime === 'image/jpeg' ? jpegQuality : undefined
    );
  });

  const extension = outputMime === 'image/png' ? 'png' : 'jpg';
  const resizedFile = new File([blob], replaceFileExtension(file.name, extension), {
    type: outputMime,
  });
  const previewDataUrl = await readAsDataUrl(resizedFile);

  return {
    file: resizedFile,
    previewDataUrl,
    width: resizedWidth,
    height: resizedHeight,
    wasResized: true,
  };
}

export function getArticleImageHints(width: number, height: number) {
  const hints: string[] = [];

  if (width < RECOMMENDED_MIN_WIDTH || height < RECOMMENDED_MIN_HEIGHT) {
    hints.push(
      'This image is below 1920x1080 and may look soft on large desktop cards.'
    );
  }

  if (width < height) {
    hints.push(
      'Portrait images can crop more in horizontal cards. Landscape framing works best.'
    );
  }

  return hints;
}
