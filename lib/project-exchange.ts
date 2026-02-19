import { z } from 'zod';
import { Project, ProjectCategory, ProjectStatus, ProjectType, Task } from './types';

export const PROJECT_EXCHANGE_FORMAT = 'devhub.projects';
export const PROJECT_EXCHANGE_VERSION = 1;

const PROJECT_TYPES = ['web', 'mobile', 'telegram', 'presentation'] as const satisfies readonly ProjectType[];
const PROJECT_CATEGORIES = ['startup', 'site', 'app', 'bot', 'other'] as const satisfies readonly ProjectCategory[];
const PROJECT_STATUSES = ['idea', 'in-progress', 'mvp', 'live', 'archived'] as const satisfies readonly ProjectStatus[];

const ProjectTypeSchema = z.enum(PROJECT_TYPES);
const ProjectCategorySchema = z.enum(PROJECT_CATEGORIES);
const ProjectStatusSchema = z.enum(PROJECT_STATUSES);

const ImportedTaskSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  isDone: z.boolean(),
});

const ImportedProjectSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  type: ProjectTypeSchema.catch('web'),
  category: ProjectCategorySchema.catch('other'),
  images: z.array(z.string()),
  githubUrl: z.string(),
  liveUrl: z.string(),
  localPath: z.string(),
  description: z.string(),
  status: ProjectStatusSchema.catch('idea'),
  lastReviewDate: z.string().optional(),
  createdAt: z.string().optional(),
  tasks: z.array(ImportedTaskSchema),
});

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

function toOptionalNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toUnknownArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

function toStringArray(value: unknown): string[] {
  return toUnknownArray(value).filter((item): item is string => typeof item === 'string');
}

function toTasks(value: unknown): Task[] {
  return toUnknownArray(value)
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const parsed = ImportedTaskSchema.safeParse({
        id: item.id,
        text: item.text,
        isDone: typeof item.isDone === 'boolean' ? item.isDone : false,
      });

      if (!parsed.success) {
        return null;
      }

      return parsed.data;
    })
    .filter((item): item is Task => item !== null);
}

function generateFallbackId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function toProjectImportInput(candidate: Record<string, unknown>) {
  return {
    id: toOptionalNonEmptyString(candidate.id),
    title: toString(candidate.title),
    type: candidate.type,
    category: candidate.category,
    images: toStringArray(candidate.images),
    githubUrl: toString(candidate.githubUrl ?? candidate.github_url),
    liveUrl: toString(candidate.liveUrl ?? candidate.live_url),
    localPath: toString(candidate.localPath ?? candidate.local_path),
    description: toString(candidate.description),
    status: candidate.status,
    lastReviewDate: toOptionalNonEmptyString(candidate.lastReviewDate ?? candidate.last_review_date),
    createdAt: toOptionalNonEmptyString(candidate.createdAt ?? candidate.created_at),
    tasks: toTasks(candidate.tasks),
  };
}

export function normalizeToProject(candidate: unknown): Project | null {
  if (!isRecord(candidate)) return null;

  const parsed = ImportedProjectSchema.safeParse(toProjectImportInput(candidate));
  if (!parsed.success) return null;

  const now = new Date().toISOString();
  const createdAt = toIsoDate(parsed.data.createdAt, now);
  const lastReviewDate = toIsoDate(parsed.data.lastReviewDate, createdAt);

  return {
    id: parsed.data.id || generateFallbackId(),
    title: parsed.data.title,
    type: parsed.data.type,
    category: parsed.data.category,
    images: parsed.data.images,
    githubUrl: parsed.data.githubUrl,
    liveUrl: parsed.data.liveUrl,
    localPath: parsed.data.localPath,
    description: parsed.data.description,
    status: parsed.data.status,
    lastReviewDate,
    tasks: parsed.data.tasks,
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
