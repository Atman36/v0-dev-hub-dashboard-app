import assert from 'node:assert';
import { test } from 'node:test';
import { getSafeExternalUrl } from './utils.ts';

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
