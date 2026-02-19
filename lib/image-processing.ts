interface ProcessImageOptions {
  maxDimension?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg';
}

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_FORMAT: NonNullable<ProcessImageOptions['format']> = 'image/webp';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadImageFromObjectUrl(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/webp' | 'image/jpeg',
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Invalid image data'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
}

export async function processImageFile(
  file: File,
  options: ProcessImageOptions = {}
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Unsupported file type');
  }

  const maxDimension = Math.max(1, options.maxDimension ?? DEFAULT_MAX_DIMENSION);
  const quality = clamp(options.quality ?? DEFAULT_QUALITY, 0.1, 1);
  const format: NonNullable<ProcessImageOptions['format']> = options.format ?? DEFAULT_FORMAT;

  const image = await loadImageFromObjectUrl(file);
  const width = image.naturalWidth;
  const height = image.naturalHeight;

  if (!width || !height) {
    throw new Error('Invalid image size');
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available');
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  let blob = await canvasToBlob(canvas, format, quality);
  if (!blob && format === 'image/webp') {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }
  if (!blob) {
    throw new Error('Failed to process image');
  }

  return blobToDataUrl(blob);
}
