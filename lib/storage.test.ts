import assert from 'node:assert';
import { test } from 'node:test';
import { estimateProjectsStorageUsageBytes } from './storage.ts';
import type { Project } from './types.ts';

const mockProject: Project = {
  id: 'test-id',
  title: 'Test Project',
  type: 'web',
  category: 'other',
  images: [],
  githubUrl: 'https://github.com/test/repo',
  liveUrl: 'https://test.com',
  localPath: '/test/path',
  description: 'Test Description',
  status: 'idea',
  visibility: 'private',
  lastReviewDate: '2023-10-01T00:00:00.000Z',
  tasks: [],
  createdAt: '2023-10-01T00:00:00.000Z',
};

test('estimateProjectsStorageUsageBytes returns the byte size for an empty array', () => {
  const projects: Project[] = [];
  const expectedSize = new TextEncoder().encode(JSON.stringify(projects)).length;

  assert.strictEqual(estimateProjectsStorageUsageBytes(projects), expectedSize);
  assert.strictEqual(estimateProjectsStorageUsageBytes(projects), 2);
});

test('estimateProjectsStorageUsageBytes returns the byte size for a single project', () => {
  const projects: Project[] = [mockProject];
  const expectedSize = new TextEncoder().encode(JSON.stringify(projects)).length;

  assert.strictEqual(estimateProjectsStorageUsageBytes(projects), expectedSize);
});

test('estimateProjectsStorageUsageBytes counts multi-byte characters correctly', () => {
  const emojiProject: Project = {
    ...mockProject,
    title: 'Project with Emojis 🚀🌟',
    description: 'Multi-byte string: 👨‍👩‍👧‍👦',
  };
  const projects: Project[] = [emojiProject];
  const serializedProjects = JSON.stringify(projects);
  const expectedSize = new TextEncoder().encode(serializedProjects).length;

  assert.ok(expectedSize > serializedProjects.length);
  assert.strictEqual(estimateProjectsStorageUsageBytes(projects), expectedSize);
});
