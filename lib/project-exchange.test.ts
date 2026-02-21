import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeToProject } from './project-exchange';

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
      { text: 'Missing ID' }, // Should be filtered out
      'not-a-task-object', // Should be filtered out
    ],
  };
  const project = normalizeToProject(candidate);
  assert.notStrictEqual(project, null);
  if (project) {
    assert.strictEqual(project.tasks.length, 2);
    assert.strictEqual(project.tasks[0].id, '1');
    assert.strictEqual(project.tasks[0].isDone, true);
    assert.strictEqual(project.tasks[1].id, '2');
    assert.strictEqual(project.tasks[1].isDone, false);
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
