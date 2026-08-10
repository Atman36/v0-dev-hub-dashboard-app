import assert from 'node:assert';
import { test, beforeEach, afterEach } from 'node:test';
import { storage, estimateProjectsStorageUsageBytes } from './storage.ts';
import type { Project } from './types.ts';

let mockStore: Record<string, string> = {};

class MockDOMException extends Error {
  constructor(message: string, name: string) {
    super(message);
    this.name = name;
  }
}

beforeEach(() => {
  mockStore = {};

  // @ts-expect-error Mocking window
  globalThis.window = {};

  // @ts-expect-error Mocking DOMException
  globalThis.DOMException = MockDOMException;

  // @ts-expect-error Mocking localStorage
  globalThis.localStorage = {
    getItem: (key: string) => mockStore[key] || null,
    setItem: (key: string, value: string) => {
      if (value === '["QUOTA_EXCEEDED"]') {
        throw new MockDOMException('Quota exceeded', 'QuotaExceededError');
      }
      if (value === '["STORAGE_ERROR"]') {
        throw new Error('Some other error');
      }
      mockStore[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStore[key];
    },
    clear: () => {
      mockStore = {};
    },
  };
});

afterEach(() => {
  // @ts-expect-error Cleaning up mock window
  delete globalThis.window;
  // @ts-expect-error Cleaning up mock localStorage
  delete globalThis.localStorage;
  // @ts-expect-error Cleaning up mock DOMException
  delete globalThis.DOMException;
});

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

test('getProjects returns an empty array when storage is empty', () => {
  const projects = storage.getProjects();
  assert.deepStrictEqual(projects, []);
});

test('getProjects ignores invalid stored payloads', () => {
  globalThis.localStorage.setItem('devhub_projects', 'invalid json');
  const projects = storage.getProjects();
  assert.deepStrictEqual(projects, []);

  globalThis.localStorage.setItem('devhub_projects', JSON.stringify({ not: 'an array' }));
  const projects2 = storage.getProjects();
  assert.deepStrictEqual(projects2, []);
});

test('saveProjects writes valid payloads', () => {
  const result = storage.saveProjects([mockProject]);
  assert.deepStrictEqual(result, { ok: true });

  const savedData = globalThis.localStorage.getItem('devhub_projects');
  assert.ok(savedData);
  const parsed = JSON.parse(savedData);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].id, mockProject.id);
});

test('saveProjects returns correct error shape on quota failures', () => {
  // We simulate quota error by passing a specific object that will stringify to our magic string
  const largeObject = { toJSON: () => 'QUOTA_EXCEEDED' };
  const result = storage.saveProjects([largeObject] as any);
  assert.deepStrictEqual(result, {
    ok: false,
    code: 'quota_exceeded',
    message: 'Storage full, compress/remove screenshots.',
  });
});

test('saveProjects returns correct error shape on generic storage failures', () => {
  const errorObject = { toJSON: () => 'STORAGE_ERROR' };
  const result = storage.saveProjects([errorObject] as any);
  assert.deepStrictEqual(result, {
    ok: false,
    code: 'storage_error',
    message: 'Failed to save projects to local storage.',
  });
});

test('addProject appends a project', () => {
  storage.addProject(mockProject);

  const savedData = globalThis.localStorage.getItem('devhub_projects');
  assert.ok(savedData);
  const parsed = JSON.parse(savedData);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].id, mockProject.id);

  const anotherProject: Project = { ...mockProject, id: 'another-id' };
  storage.addProject(anotherProject);

  const savedData2 = globalThis.localStorage.getItem('devhub_projects');
  assert.ok(savedData2);
  const parsed2 = JSON.parse(savedData2);
  assert.strictEqual(parsed2.length, 2);
  assert.strictEqual(parsed2[1].id, 'another-id');
});

test('updateProject updates an existing project', () => {
  storage.saveProjects([mockProject]);

  const result = storage.updateProject(mockProject.id, { title: 'Updated Title' });
  assert.deepStrictEqual(result, { ok: true });

  const projects = storage.getProjects();
  assert.strictEqual(projects.length, 1);
  assert.strictEqual(projects[0].title, 'Updated Title');
});

test('updateProject returns an error when project is missing', () => {
  storage.saveProjects([mockProject]);

  const result = storage.updateProject('non-existent-id', { title: 'Updated Title' });
  assert.deepStrictEqual(result, { ok: false, code: 'storage_error', message: 'Project not found.' });
});

test('deleteProject removes a project', () => {
  storage.saveProjects([mockProject, { ...mockProject, id: 'another-id' }]);

  const result = storage.deleteProject(mockProject.id);
  assert.deepStrictEqual(result, { ok: true });

  const projects = storage.getProjects();
  assert.strictEqual(projects.length, 1);
  assert.strictEqual(projects[0].id, 'another-id');
});

test('exportProjects returns the serialized envelope', () => {
  storage.saveProjects([mockProject]);
  const serialized = storage.exportProjects();

  assert.strictEqual(typeof serialized, 'string');
  const parsed = JSON.parse(serialized);

  // Verify envelope shape
  assert.strictEqual(parsed.format, 'devhub.projects');
  assert.strictEqual(parsed.version, 1);
  assert.ok(parsed.exported_at);
  assert.ok(Array.isArray(parsed.projects));
  assert.strictEqual(parsed.projects.length, 1);

  // Checking that export logic correctly mapped some specific fields
  assert.strictEqual(parsed.projects[0].id, mockProject.id);
  assert.strictEqual(parsed.projects[0].title, mockProject.title);
});

test('importProjects with replace mode overrides existing data', () => {
  storage.saveProjects([{ ...mockProject, id: 'old-project' }]);

  const envelope = {
    format: 'devhub.projects',
    version: 1,
    exported_at: new Date().toISOString(),
    projects: [{ ...mockProject, id: 'imported-project' }]
  };

  const result = storage.importProjects(JSON.stringify(envelope), 'replace');

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.mode, 'replace');
  assert.strictEqual(result.imported, 1);
  assert.strictEqual(result.skipped, 0);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.detectedFormat, 'devhub.projects');

  const projects = storage.getProjects();
  assert.strictEqual(projects.length, 1);
  assert.strictEqual(projects[0].id, 'imported-project');
});

test('importProjects with merge mode merges by id and preserves non-overlapping items', () => {
  const existingProject1 = { ...mockProject, id: 'project-1', title: 'Old Title 1' };
  const existingProject2 = { ...mockProject, id: 'project-2', title: 'Old Title 2' };
  storage.saveProjects([existingProject1, existingProject2]);

  const envelope = {
    format: 'devhub.projects',
    version: 1,
    exported_at: new Date().toISOString(),
    projects: [
      { ...mockProject, id: 'project-1', title: 'New Title 1' }, // Override existing
      { ...mockProject, id: 'project-3', title: 'Title 3' }      // New project
    ]
  };

  const result = storage.importProjects(JSON.stringify(envelope), 'merge');

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.mode, 'merge');
  assert.strictEqual(result.imported, 2);
  assert.strictEqual(result.total, 3);

  const projects = storage.getProjects();
  assert.strictEqual(projects.length, 3);

  const p1 = projects.find(p => p.id === 'project-1');
  const p2 = projects.find(p => p.id === 'project-2');
  const p3 = projects.find(p => p.id === 'project-3');

  assert.strictEqual(p1?.title, 'New Title 1'); // Overridden
  assert.strictEqual(p2?.title, 'Old Title 2'); // Preserved
  assert.strictEqual(p3?.title, 'Title 3');     // Merged
});
