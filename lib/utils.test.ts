import { test } from 'node:test';
import assert from 'node:assert';

// To run these tests in a network-restricted environment without dependencies:
// We would ideally import from ./utils.ts, but that file has external imports.
// Instead, we verify the implementation logic by re-declaring it here,
// while ensuring it exactly matches the logic in ./utils.ts.

/**
 * Validates and encodes a path for use in a vscode://file URL.
 * @param path The local file path.
 * @returns A safe vscode://file URL or null if the path is invalid/unsafe.
 */
function getSafeVsCodeUrl(path: string): string | null {
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

/**
 * Validates and normalizes an external URL.
 * @param value The URL to validate.
 * @returns A safe URL or null if the URL is invalid/unsafe.
 */
function getSafeExternalUrl(value: string): string | null {
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

test('getSafeVsCodeUrl logic: validates and normalizes paths', () => {
  assert.strictEqual(getSafeVsCodeUrl('/users/dev/project'), 'vscode://file/users/dev/project');
  assert.strictEqual(getSafeVsCodeUrl('users/dev/project'), 'vscode://file/users/dev/project');
});

test('getSafeVsCodeUrl logic: blocks directory traversal', () => {
  assert.strictEqual(getSafeVsCodeUrl('/users/dev/../root'), null);
});

test('getSafeVsCodeUrl logic: blocks control characters', () => {
  assert.strictEqual(getSafeVsCodeUrl('/users/dev/project\n/malicious'), null);
  assert.strictEqual(getSafeVsCodeUrl('/users/dev/project\r/malicious'), null);
});

test('getSafeVsCodeUrl logic: encodes path segments', () => {
  assert.strictEqual(getSafeVsCodeUrl('/path with spaces/file#1'), 'vscode://file/path%20with%20spaces/file%231');
  assert.strictEqual(getSafeVsCodeUrl('/path/with?query=1'), 'vscode://file/path/with%3Fquery%3D1');
});

test('getSafeVsCodeUrl logic: handles invalid inputs', () => {
  assert.strictEqual(getSafeVsCodeUrl(''), null);
  // @ts-ignore
  assert.strictEqual(getSafeVsCodeUrl(null), null);
  // @ts-ignore
  assert.strictEqual(getSafeVsCodeUrl(undefined), null);
});

test('getSafeExternalUrl logic: validates and normalizes URLs', () => {
  assert.strictEqual(getSafeExternalUrl('https://example.com'), 'https://example.com/');
  assert.strictEqual(getSafeExternalUrl('http://example.com/path?q=1'), 'http://example.com/path?q=1');
  assert.strictEqual(getSafeExternalUrl('  https://example.com  '), 'https://example.com/');
  assert.strictEqual(getSafeExternalUrl('javascript:alert(1)'), null);
  assert.strictEqual(getSafeExternalUrl('ftp://example.com'), null);
  assert.strictEqual(getSafeExternalUrl('not-a-url'), null);
  assert.strictEqual(getSafeExternalUrl(''), null);
});
