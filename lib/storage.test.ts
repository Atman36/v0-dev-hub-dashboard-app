import assert from 'node:assert';
import { test } from 'node:test';
import { estimateProjectsStorageUsageBytes, storage } from './storage.ts';
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

test('deleteProject persists an existing deletion once and skips storage for a missing project', (t) => {
  let storedProjects = JSON.stringify([mockProject]);
  let writes = 0;
  const globals = globalThis as Record<string, unknown>;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => storedProjects,
      setItem: (_key: string, value: string) => {
        writes += 1;
        storedProjects = value;
      },
    },
  });

  t.after(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      delete globals.window;
    }
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
    } else {
      delete globals.localStorage;
    }
  });

  assert.deepStrictEqual(storage.deleteProject(mockProject.id), { ok: true });
  assert.strictEqual(writes, 1);
  assert.deepStrictEqual(JSON.parse(storedProjects), []);

  assert.deepStrictEqual(storage.deleteProject(mockProject.id), {
    ok: false,
    code: 'storage_error',
    message: 'Project not found.',
  });
  assert.strictEqual(writes, 1);
});
