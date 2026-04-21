import { clsx, type ClassValue } from 'clsx'
import { nanoid } from 'nanoid'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return nanoid();
}

export function getSafeExternalUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitizes a URL for use in href or other sensitive contexts.
 * Allows safe absolute protocols (http, https), relative paths, and anchors.
 * Blocks protocol-relative URLs (//) and dangerous schemes (javascript:, data:).
 */
export function getSafeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim();

  // Block protocol-relative URLs (e.g., //evil.com)
  if (trimmed.startsWith('//')) {
    return '';
  }

  // Allow relative paths (starting with /), anchors (#), and standard protocols (http, https)
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Treat anything else as potentially unsafe
  return '';
}

/**
 * Sanitizes a filesystem path for use with the vscode:// protocol.
 * Blocks directory traversal (..) and control characters.
 * Encodes path segments and ensures a leading slash.
 */
export function getSafeVsCodeUrl(path: string): string | null {
  if (!path) return null;

  // Block directory traversal and other suspicious patterns
  if (path.includes('..') || /[\x00-\x1F\x7F]/.test(path)) {
    return null;
  }

  // Ensure leading slash and normalize separators to forward slashes
  let normalized = path.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // Individual segments should be encoded, but we need to keep the slashes
  const encodedPath = normalized
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `vscode://file${encodedPath}`;
}

export function openExternalUrl(value: string): boolean {
  const safeUrl = getSafeExternalUrl(value);
  if (!safeUrl || typeof window === 'undefined') {
    return false;
  }

  window.open(safeUrl, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Downloads a JSON file with the given content and filename.
 * @param content The JSON content string.
 * @param filename The name of the file to download.
 */
export function downloadJsonFile(content: string, filename: string): void {
  // Guard for server-side execution
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;

  // Append to body to ensure it works in all browsers
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);

  // Revoke the object URL after a short delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
