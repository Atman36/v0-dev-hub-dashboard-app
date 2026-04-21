import { test } from 'node:test';
import assert from 'node:assert';
import {
  normalizeToProject,
  PROJECT_EXCHANGE_FORMAT,
  PROJECT_EXCHANGE_VERSION,
  serializeProjectsForExport,
  toTasks,
} from './project-exchange.ts';
import type { Project } from './types.ts';

test('normalizeToProject: returns null for non-record candidates', () => {
  assert.strictEqual(normalizeToProject(null), null);
  assert.strictEqual(normalizeToProject(undefined), null);
  assert.strictEqual(normalizeToProject(123), null);
  assert.strictEqual(normalizeToProject('string'), null);
  assert.strictEqual(normalizeToProject([]), null);
});

test('normalizeToProject: returns null for record missing title', () => {
  const candidate = {
    description: 'A project without a title',
  };
  assert.strictEqual(normalizeToProject(candidate), null);
});

test('normalizeToProject: parses a valid minimal project', () => {
  const candidate = {
    title: 'Minimal Project',
  };
  const project = normalizeToProject(candidate);
  assert.notStrictEqual(project, null);
  if (project) {
    assert.strictEqual(project.title, 'Minimal Project');
    assert.strictEqual(project.type, 'web'); // Default value
    assert.strictEqual(project.category, 'other'); // Default value
    assert.strictEqual(project.status, 'idea'); // Default value
    assert.ok(project.id);
    assert.ok(project.createdAt);
    assert.ok(project.lastReviewDate);
    assert.deepStrictEqual(project.tasks, []);
    assert.deepStrictEqual(project.images, []);
  }
});

test('normalizeToProject: handles field aliases', () => {
  const candidate = {
    title: 'Aliased Project',
    github_url: 'https://github.com/user/repo',
    live_url: 'https://example.com',
    local_path: '/path/to/project',
    created_at: '2023-01-01T10:00:00Z',
    last_review_date: '2023-01-02T10:00:00Z',
  };
  const project = normalizeToProject(candidate);
  assert.notStrictEqual(project, null);
  if (project) {
    assert.strictEqual(project.githubUrl, 'https://github.com/user/repo');
    assert.strictEqual(project.liveUrl, 'https://example.com');
    assert.strictEqual(project.localPath, '/path/to/project');
    assert.strictEqual(project.createdAt, '2023-01-01T10:00:00.000Z');
    assert.strictEqual(project.lastReviewDate, '2023-01-02T10:00:00.000Z');
  }
});

test('normalizeToProject: camelCase fields take precedence over snake_case aliases', () => {
  const candidate = {
    title: 'Precedence Project',
    githubUrl: 'https://github.com/user/camel',
    github_url: 'https://github.com/user/snake',
  };
  const project = normalizeToProject(candidate);
  assert.notStrictEqual(project, null);
  if (project) {
    assert.strictEqual(project.githubUrl, 'https://github.com/user/camel');
  }
});

test('normalizeToProject: handles enum defaults for invalid values', () => {
  const candidate = {
    title: 'Enum Default Project',
    type: 'invalid-type',
    category: 'invalid-category',
    status: 'invalid-status',
  };
  const project = normalizeToProject(candidate);
  assert.notStrictEqual(project, null);
  if (project) {
    assert.strictEqual(project.type, 'web');
    assert.strictEqual(project.category, 'other');
    assert.strictEqual(project.status, 'idea');
  }
});

test('normalizeToProject: normalizes dates', () => {
  const candidate = {
    title: 'Date Normalization Project',
    createdAt: '2023-05-20',
    lastReviewDate: 'invalid-date',
  };
  const project = normalizeToProject(candidate);
  assert.notStrictEqual(project, null);
  if (project) {
    // 2023-05-20 should be normalized to ISO
    assert.ok(project.createdAt.startsWith('2023-05-20T'));
    // lastReviewDate is invalid, so it falls back to createdAt
    assert.strictEqual(project.lastReviewDate, project.createdAt);
  }
});

test('normalizeToProject: parses tasks and filters invalid ones', () => {
  const candidate = {
    title: 'Tasks Project',
    tasks: [
      { id: '1', text: 'Valid Task', isDone: true },
      { id: '2', text: 'Task without isDone' }, // isDone should default to false
      { id: ' 3 ', text: '  Trimmed Task  ' },
      { text: 'Missing ID' }, // Should be filtered out
      { id: '   ', text: 'Whitespace ID' }, // Should be filtered out
      { id: '4', text: '   ' }, // Should be filtered out
      'not-a-task-object', // Should be filtered out
      null, // Should be filtered out
      { id: '\t \n', text: 'Whitespace tabs and newlines' }, // Should be filtered out
      { id: '5', text: '\t \n' }, // Should be filtered out
    ],
  };
  const project = normalizeToProject(candidate);
  assert.notStrictEqual(project, null);
  if (project) {
    assert.strictEqual(project.tasks.length, 3);
    assert.strictEqual(project.tasks[0].id, '1');
    assert.strictEqual(project.tasks[0].isDone, true);
    assert.strictEqual(project.tasks[1].id, '2');
    assert.strictEqual(project.tasks[1].isDone, false);
    assert.deepStrictEqual(project.tasks[2], {
      id: '3',
      text: 'Trimmed Task',
      isDone: false,
    });
  }
});

test('normalizeToProject: uses provided ID or generates one', () => {
  const candidateWithId = { id: 'custom-id', title: 'Project with ID' };
  const projectWithId = normalizeToProject(candidateWithId);
  assert.strictEqual(projectWithId?.id, 'custom-id');

  const candidateWithoutId = { title: 'Project without ID' };
  const projectWithoutId = normalizeToProject(candidateWithoutId);
  assert.ok(projectWithoutId?.id);
  assert.notStrictEqual(projectWithoutId?.id, 'custom-id');
});

test('toTasks: returns empty array for non-array inputs', () => {
  assert.deepStrictEqual(toTasks(null), []);
  assert.deepStrictEqual(toTasks({}), []);
  assert.deepStrictEqual(toTasks(123), []);
  assert.deepStrictEqual(toTasks(undefined), []);
  assert.deepStrictEqual(toTasks('string'), []);
});

test('toTasks: returns empty array for invalid JSON string inputs', () => {
  assert.deepStrictEqual(toTasks('not-json'), []);
});

test('toTasks: accepts JSON strings that parse to arrays', () => {
  assert.deepStrictEqual(toTasks('[{"id":"1","text":"Task 1"}]'), [
    { id: '1', text: 'Task 1', isDone: false },
  ]);
});

test('toTasks: returns empty array for JSON strings that parse to non-arrays', () => {
  assert.deepStrictEqual(toTasks('{"tasks":[]}'), []);
});

test('toTasks: filters out invalid items (non-objects)', () => {
  assert.deepStrictEqual(toTasks([{ id: '1', text: 'Task 1' }, 'string', null, 123]), [
    { id: '1', text: 'Task 1', isDone: false },
  ]);
});

test('toTasks: filters out items missing id', () => {
  assert.deepStrictEqual(toTasks([{ text: 'Task 1' }]), []);
});

test('toTasks: filters out items missing text', () => {
  assert.deepStrictEqual(toTasks([{ id: '1' }]), []);
});

test('toTasks: filters out items with non-string id or text', () => {
  assert.deepStrictEqual(toTasks([{ id: 1, text: 'Task 1' }, { id: '2', text: 2 }]), []);
});

test('toTasks: filters out items with whitespace-only id or text', () => {
  assert.deepStrictEqual(toTasks([{ id: '   ', text: 'Task 1' }, { id: '3', text: '   ' }]), []);
});

test('toTasks: trims id and text values', () => {
  assert.deepStrictEqual(toTasks([{ id: ' 1 ', text: ' Task 1 ' }]), [
    { id: '1', text: 'Task 1', isDone: false },
  ]);
});

test('toTasks: preserves isDone only when boolean, otherwise defaults to false', () => {
  assert.deepStrictEqual(
    toTasks([
      { id: '1', text: 'Task 1', isDone: true },
      { id: '2', text: 'Task 2', isDone: 'yes' },
      { id: '3', text: 'Task 3' },
    ]),
    [
      { id: '1', text: 'Task 1', isDone: true },
      { id: '2', text: 'Task 2', isDone: false },
      { id: '3', text: 'Task 3', isDone: false },
    ],
  );
});

test('serializeProjectsForExport: handles empty projects array', () => {
  const result = serializeProjectsForExport([]);
  const parsed = JSON.parse(result);

  assert.strictEqual(parsed.format, PROJECT_EXCHANGE_FORMAT);
  assert.strictEqual(parsed.version, PROJECT_EXCHANGE_VERSION);
  assert.ok(parsed.exported_at);
  assert.ok(!Number.isNaN(Date.parse(parsed.exported_at)));
  assert.deepStrictEqual(parsed.projects, []);
});

test('serializeProjectsForExport: maps project fields to export row', () => {
  const project: Project = {
    id: 'project-1',
    title: 'Test Project',
    type: 'web',
    category: 'other',
    images: ['image.webp'],
    githubUrl: 'https://github.com/example/repo',
    liveUrl: 'https://example.com',
    localPath: '/Users/apple/project',
    description: 'Project description',
    status: 'idea',
    lastReviewDate: '2023-01-02T10:00:00.000Z',
    createdAt: '2023-01-01T10:00:00.000Z',
    tasks: [{ id: 'task-1', text: 'Task 1', isDone: false }],
  };

  const parsed = JSON.parse(serializeProjectsForExport([project]));
  assert.strictEqual(parsed.projects.length, 1);

  const row = parsed.projects[0];
  assert.strictEqual(row.id, project.id);
  assert.strictEqual(row.title, project.title);
  assert.strictEqual(row.type, project.type);
  assert.strictEqual(row.category, project.category);
  assert.deepStrictEqual(row.images, project.images);
  assert.strictEqual(row.github_url, project.githubUrl);
  assert.strictEqual(row.live_url, project.liveUrl);
  assert.strictEqual(row.local_path, project.localPath);
  assert.strictEqual(row.description, project.description);
  assert.strictEqual(row.status, project.status);
  assert.strictEqual(row.last_review_date, project.lastReviewDate);
  assert.strictEqual(row.created_at, project.createdAt);
  assert.strictEqual(row.updated_at, parsed.exported_at);
  assert.deepStrictEqual(row.tasks, project.tasks);
});

test('serializeProjectsForExport: converts empty optional fields to null', () => {
  const project: Project = {
    id: 'project-2',
    title: 'Minimal Project',
    type: 'web',
    category: 'other',
    images: [],
    githubUrl: '',
    liveUrl: '',
    localPath: '',
    description: '',
    status: 'idea',
    lastReviewDate: '2023-01-01T10:00:00.000Z',
    createdAt: '2023-01-01T10:00:00.000Z',
    tasks: [],
  };

  const parsed = JSON.parse(serializeProjectsForExport([project]));
  assert.strictEqual(parsed.projects[0].github_url, null);
  assert.strictEqual(parsed.projects[0].live_url, null);
  assert.strictEqual(parsed.projects[0].local_path, null);
  assert.strictEqual(parsed.projects[0].description, null);
});
