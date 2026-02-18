import { Project, ProjectCategory, ProjectStatus, ProjectType, Task } from './types';

export const PROJECT_EXCHANGE_FORMAT = 'devhub.projects';
export const PROJECT_EXCHANGE_VERSION = 1;

const PROJECT_TYPES: ProjectType[] = ['web', 'mobile', 'telegram', 'presentation'];
const PROJECT_CATEGORIES: ProjectCategory[] = ['startup', 'site', 'app', 'bot', 'other'];
const PROJECT_STATUSES: ProjectStatus[] = ['idea', 'in-progress', 'mvp', 'live', 'archived'];

export interface SupabaseProjectRow {
  id: string;
  title: string;
  type: ProjectType;
  category: ProjectCategory;
  images: string[];
  github_url: string | null;
  live_url: string | null;
  local_path: string | null;
  description: string | null;
  status: ProjectStatus;
  last_review_date: string;
  tasks: Task[];
  created_at: string;
  updated_at: string;
}

export interface ProjectExchangeV1 {
  format: typeof PROJECT_EXCHANGE_FORMAT;
  version: typeof PROJECT_EXCHANGE_VERSION;
  exported_at: string;
  projects: SupabaseProjectRow[];
}

export interface ParsedImportResult {
  projects: Project[];
  skipped: number;
  detectedFormat: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return fallback;
  return new Date(timestamp).toISOString();
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toTasks(value: unknown): Task[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  return source
    .map((item): Task | null => {
      if (!isRecord(item)) return null;
      const id = toString(item.id);
      const text = toString(item.text);
      const isDone = typeof item.isDone === 'boolean' ? item.isDone : false;
      if (!id || !text) return null;
      return { id, text, isDone };
    })
    .filter((item): item is Task => item !== null);
}

function toProjectType(value: unknown): ProjectType {
  return PROJECT_TYPES.includes(value as ProjectType) ? (value as ProjectType) : 'web';
}

function toProjectCategory(value: unknown): ProjectCategory {
  return PROJECT_CATEGORIES.includes(value as ProjectCategory)
    ? (value as ProjectCategory)
    : 'other';
}

function toProjectStatus(value: unknown): ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : 'idea';
}

function generateFallbackId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function normalizeToProject(candidate: unknown): Project | null {
  if (!isRecord(candidate)) return null;

  const now = new Date().toISOString();
  const title = toString(candidate.title).trim();
  if (!title) return null;

  const createdAt = toIsoDate(candidate.createdAt ?? candidate.created_at, now);
  const lastReviewDate = toIsoDate(
    candidate.lastReviewDate ?? candidate.last_review_date,
    createdAt
  );

  return {
    id: toString(candidate.id) || generateFallbackId(),
    title,
    type: toProjectType(candidate.type),
    category: toProjectCategory(candidate.category),
    images: toStringArray(candidate.images),
    githubUrl: toString(candidate.githubUrl ?? candidate.github_url),
    liveUrl: toString(candidate.liveUrl ?? candidate.live_url),
    localPath: toString(candidate.localPath ?? candidate.local_path),
    description: toString(candidate.description),
    status: toProjectStatus(candidate.status),
    lastReviewDate,
    tasks: toTasks(candidate.tasks),
    createdAt,
  };
}

export function projectToSupabaseRow(project: Project, updatedAt: string): SupabaseProjectRow {
  return {
    id: project.id,
    title: project.title,
    type: project.type,
    category: project.category,
    images: project.images,
    github_url: project.githubUrl || null,
    live_url: project.liveUrl || null,
    local_path: project.localPath || null,
    description: project.description || null,
    status: project.status,
    last_review_date: project.lastReviewDate,
    tasks: project.tasks,
    created_at: project.createdAt,
    updated_at: updatedAt,
  };
}

export function serializeProjectsForExport(projects: Project[]): string {
  const exportedAt = new Date().toISOString();
  const payload: ProjectExchangeV1 = {
    format: PROJECT_EXCHANGE_FORMAT,
    version: PROJECT_EXCHANGE_VERSION,
    exported_at: exportedAt,
    projects: projects.map((project) => projectToSupabaseRow(project, exportedAt)),
  };

  return JSON.stringify(payload, null, 2);
}

export function parseImportedProjects(rawData: string): ParsedImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawData);
  } catch {
    throw new Error('Invalid JSON file');
  }

  let candidates: unknown[] = [];
  let detectedFormat = 'unknown';
  let foundProjectsArray = false;

  if (Array.isArray(parsed)) {
    candidates = parsed;
    detectedFormat = 'array';
    foundProjectsArray = true;
  } else if (isRecord(parsed)) {
    if (Array.isArray(parsed.projects)) {
      candidates = parsed.projects;
      detectedFormat =
        parsed.format === PROJECT_EXCHANGE_FORMAT ? PROJECT_EXCHANGE_FORMAT : 'projects-envelope';
      foundProjectsArray = true;
    } else if (Array.isArray(parsed.data)) {
      candidates = parsed.data;
      detectedFormat = 'data-envelope';
      foundProjectsArray = true;
    } else if (Array.isArray(parsed.rows)) {
      candidates = parsed.rows;
      detectedFormat = 'rows-envelope';
      foundProjectsArray = true;
    }
  }

  if (!foundProjectsArray) {
    throw new Error('No projects found in the file');
  }

  let skipped = 0;
  const byId = new Map<string, Project>();

  for (const item of candidates) {
    const project = normalizeToProject(item);
    if (!project) {
      skipped += 1;
      continue;
    }
    byId.set(project.id, project);
  }

  const projects = Array.from(byId.values());
  if (projects.length === 0 && candidates.length > 0) {
    throw new Error('No valid projects found in the file');
  }

  return { projects, skipped, detectedFormat };
}
