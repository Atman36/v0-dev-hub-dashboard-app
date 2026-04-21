import assert from 'node:assert';
import { afterEach, test } from 'node:test';
import {
  cn,
  downloadJsonFile,
  generateId,
  getInitials,
  getSafeExternalUrl,
  openExternalUrl,
} from './utils.ts';

const globalScope = globalThis as any;

const originalWindow = globalScope.window;
const originalDocument = globalScope.document;
const originalURL = globalScope.URL;
const originalBlob = globalScope.Blob;
const originalSetTimeout = globalScope.setTimeout;

afterEach(() => {
  globalScope.window = originalWindow;
  globalScope.document = originalDocument;
  globalScope.URL = originalURL;
  globalScope.Blob = originalBlob;
  globalScope.setTimeout = originalSetTimeout;
});

test('cn merges class names', () => {
  assert.strictEqual(cn('px-2', 'py-1'), 'px-2 py-1');
  assert.strictEqual(cn('px-2', false && 'hidden', 'px-4'), 'px-4');
});

test('generateId returns a non-empty string', () => {
  const id = generateId();
  assert.strictEqual(typeof id, 'string');
  assert.ok(id.length > 0);
});

test('getSafeExternalUrl returns null for empty or whitespace strings', () => {
  assert.strictEqual(getSafeExternalUrl(''), null);
  assert.strictEqual(getSafeExternalUrl('   '), null);
});

test('getSafeExternalUrl returns null for invalid URLs', () => {
  assert.strictEqual(getSafeExternalUrl('not-a-url'), null);
  assert.strictEqual(getSafeExternalUrl('http//missing-colon.com'), null);
});

test('getSafeExternalUrl returns null for unsupported protocols', () => {
  assert.strictEqual(getSafeExternalUrl('javascript:alert(1)'), null);
  assert.strictEqual(getSafeExternalUrl('ftp://example.com'), null);
  assert.strictEqual(getSafeExternalUrl('file:///etc/passwd'), null);
  assert.strictEqual(getSafeExternalUrl('data:text/plain,hello'), null);
});

test('getSafeExternalUrl returns null for URLs without protocol', () => {
  assert.strictEqual(getSafeExternalUrl('www.google.com'), null);
  assert.strictEqual(getSafeExternalUrl('google.com'), null);
});

test('getSafeExternalUrl returns canonical URL for valid http and https URLs', () => {
  assert.strictEqual(getSafeExternalUrl('http://example.com'), 'http://example.com/');
  assert.strictEqual(
    getSafeExternalUrl('https://example.com/path?query=1'),
    'https://example.com/path?query=1',
  );
  assert.strictEqual(getSafeExternalUrl('https://google.com'), 'https://google.com/');
});

test('getSafeExternalUrl trims leading and trailing whitespace', () => {
  assert.strictEqual(getSafeExternalUrl('  https://example.com  '), 'https://example.com/');
});

test('openExternalUrl opens valid URLs in a new tab', () => {
  let opened: { url: string; target: string; features: string } | null = null;

  globalScope.window = {
    open: (url: string | URL | undefined, target?: string, features?: string) => {
      opened = {
        url: String(url),
        target: target ?? '',
        features: features ?? '',
      };
      return null;
    },
  } as unknown;

  assert.strictEqual(openExternalUrl('https://example.com'), true);
  assert.deepStrictEqual(opened, {
    url: 'https://example.com/',
    target: '_blank',
    features: 'noopener,noreferrer',
  });
  assert.strictEqual(openExternalUrl('javascript:alert(1)'), false);
});

test('openExternalUrl returns false when window is unavailable', () => {
  globalScope.window = undefined;
  assert.strictEqual(openExternalUrl('https://example.com'), false);
});

test('downloadJsonFile creates a blob URL, clicks the link, and revokes the URL', () => {
  let linkClicked = false;
  let linkAppended = false;
  let linkRemoved = false;
  let revokedUrl = '';

  const mockLink = {
    href: '',
    download: '',
    click: () => {
      linkClicked = true;
    },
  };

  globalScope.window = {} as unknown;
  globalScope.Blob = class MockBlob {
    constructor(content: unknown[], options: { type: string }) {
      assert.deepStrictEqual(content, ['{"a":1}']);
      assert.strictEqual(options.type, 'application/json');
    }
  } as unknown;
  globalScope.URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: (url: string | URL) => {
      revokedUrl = String(url);
    },
  } as unknown;
  globalScope.document = {
    createElement: (tag: string) => {
      assert.strictEqual(tag, 'a');
      return mockLink;
    },
    body: {
      appendChild: (element: unknown) => {
        assert.strictEqual(element, mockLink);
        linkAppended = true;
      },
      removeChild: (element: unknown) => {
        assert.strictEqual(element, mockLink);
        linkRemoved = true;
      },
    },
  } as unknown;
  globalScope.setTimeout = ((callback: (...args: never[]) => void, delay?: number) => {
    assert.strictEqual(delay, 1000);
    callback();
    return 0;
  }) as unknown;

  downloadJsonFile('{"a":1}', 'test.json');

  assert.strictEqual(mockLink.href, 'blob:mock-url');
  assert.strictEqual(mockLink.download, 'test.json');
  assert.strictEqual(linkAppended, true);
  assert.strictEqual(linkClicked, true);
  assert.strictEqual(linkRemoved, true);
  assert.strictEqual(revokedUrl, 'blob:mock-url');
});

test('getInitials extracts first two initials', () => {
  assert.strictEqual(getInitials('Hello World'), 'HW');
  assert.strictEqual(getInitials('Single'), 'S');
  assert.strictEqual(getInitials('multiple words here'), 'MW');
  assert.strictEqual(getInitials('  leading spaces'), 'LS');
  assert.strictEqual(getInitials('trailing spaces  '), 'TS');
  assert.strictEqual(getInitials('many   spaces'), 'MS');
  assert.strictEqual(getInitials('a'), 'A');
  assert.strictEqual(getInitials(''), '');
});
