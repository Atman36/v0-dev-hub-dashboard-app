import assert from 'node:assert';
import { test } from 'node:test';
import { optionalUrlSchema } from './validations.ts';

test('optionalUrlSchema accepts empty strings', () => {
  assert.strictEqual(optionalUrlSchema.safeParse('').success, true);
  assert.strictEqual(optionalUrlSchema.safeParse('   ').success, true);
});

test('optionalUrlSchema accepts valid http and https URLs', () => {
  assert.strictEqual(optionalUrlSchema.safeParse('http://example.com').success, true);
  assert.strictEqual(optionalUrlSchema.safeParse('https://example.com').success, true);
  assert.strictEqual(optionalUrlSchema.safeParse('  https://example.com  ').success, true);
});

test('optionalUrlSchema rejects invalid URLs and unsupported schemes', () => {
  assert.strictEqual(optionalUrlSchema.safeParse('not-a-url').success, false);
  assert.strictEqual(optionalUrlSchema.safeParse('javascript:alert(1)').success, false);
  assert.strictEqual(optionalUrlSchema.safeParse('file:///etc/passwd').success, false);
  assert.strictEqual(optionalUrlSchema.safeParse('data:text/plain,hello').success, false);
});
