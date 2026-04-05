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

/**
 * Validates and encodes a path for use in a vscode://file URL.
 * @param path The local file path.
 * @returns A safe vscode://file URL or null if the path is invalid/unsafe.
 */
export function getSafeVsCodeUrl(path: string): string | null {
  if (!path || typeof path !== 'string') return null;

  // Block directory traversal (..)
  if (path.includes('..')) return null;

  // Block control characters
  if (/[\x00-\x1F]/.test(path)) return null;

  // Normalize path: ensure it starts with '/'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Encode path segments individually to prevent injection of URI components like ? or #
  const encodedPath = normalizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `vscode://file${encodedPath}`;
}
