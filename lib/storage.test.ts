import { test } from 'node:test';
import assert from 'node:assert';
import { estimateProjectsStorageUsageBytes } from './storage';
import { Project } from './types';

const mockProject: Project = {
  id: 'test-id',
  title: 'Test Project',
  type: 'web',
  category: 'personal',
  images: [],
  githubUrl: 'https://github.com/test/repo',
  liveUrl: 'https://test.com',
  localPath: '/test/path',
  description: 'Test Description',
  status: 'idea',
  lastReviewDate: '2023-10-01T00:00:00.000Z',
  tasks: [],
  createdAt: '2023-10-01T00:00:00.000Z',
};

test('estimateProjectsStorageUsageBytes: returns correct size for empty array', () => {
  const projects: Project[] = [];
  const expectedSize = new TextEncoder().encode(JSON.stringify(projects)).length;
  assert.strictEqual(estimateProjectsStorageUsageBytes(projects), expectedSize);
  assert.strictEqual(estimateProjectsStorageUsageBytes(projects), 2); // '[]'
});

test('estimateProjectsStorageUsageBytes: returns correct size for single project', () => {
  const projects: Project[] = [mockProject];
  const expectedSize = new TextEncoder().encode(JSON.stringify(projects)).length;
  assert.strictEqual(estimateProjectsStorageUsageBytes(projects), expectedSize);
});

test('estimateProjectsStorageUsageBytes: handles multi-byte characters correctly', () => {
  const emojiProject: Project = {
    ...mockProject,
    title: 'Project with Emojis 🚀🌟',
    description: 'Multi-byte string: 👨‍👩‍👧‍👦',
  };
  const projects: Project[] = [emojiProject];
  const expectedSize = new TextEncoder().encode(JSON.stringify(projects)).length;

  // Ensure the size is calculated by bytes, not characters
  const charLength = JSON.stringify(projects).length;
  assert.ok(expectedSize > charLength);
  assert.strictEqual(estimateProjectsStorageUsageBytes(projects), expectedSize);
});
