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

export function getSafeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('#')) {
    return trimmed;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  return getSafeExternalUrl(trimmed);
}

export function getSafeVsCodeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return null;

  let normalized = trimmed.replace(/\\/g, '/');
  if (normalized.startsWith('//')) return null;
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }

  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');
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

export function getInitials(title: string): string {
  let initials = '';

  for (let index = 0; index < title.length; index += 1) {
    const char = title[index];
    const previousChar = title[index - 1];

    if ((index === 0 || previousChar === ' ') && char !== ' ') {
      initials += char.toUpperCase();
    }

    if (initials.length === 2) {
      break;
    }
  }

  return initials;
}
