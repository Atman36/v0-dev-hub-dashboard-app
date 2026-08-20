import type { Project } from './types.ts';
import {
  normalizeToProject,
  parseImportedProjects,
  serializeProjectsForExport,
} from './project-exchange.ts';
import { STORAGE_KEY } from './constants.ts';
export const LOCAL_STORAGE_SOFT_LIMIT_BYTES = 5 * 1024 * 1024;
/** Share of the soft limit above which the UI starts warning about a possible data loss. */
export const LOCAL_STORAGE_WARN_RATIO = 0.85;

type ImportMode = 'replace' | 'merge';

export type StorageWriteResult =
  | { ok: true }
  | { ok: false; code: 'quota_exceeded' | 'storage_error'; message: string };

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

export interface ImportProjectsResult {
  ok: boolean;
  code?: 'quota_exceeded' | 'storage_error';
  message?: string;
  imported: number;
  skipped: number;
  total: number;
  mode: ImportMode;
  detectedFormat: string;
}

function parseStoredProjects(rawData: string): Project[] {
  const parsed = JSON.parse(rawData) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => normalizeToProject(item))
    .filter((project): project is Project => project !== null);
}

export const storage = {
  getProjects(): Project[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? parseStoredProjects(data) : [];
    } catch {
      return [];
    }
  },

  saveProjects(projects: Project[]): StorageWriteResult {
    if (typeof window === 'undefined') {
      return { ok: false, code: 'storage_error', message: 'Storage is unavailable on the server.' };
    }
    const payload = JSON.stringify(projects);

    try {
      localStorage.setItem(STORAGE_KEY, payload);
      return { ok: true };
    } catch (error) {
      if (isQuotaExceededError(error)) {
        return {
          ok: false,
          code: 'quota_exceeded',
          message: 'Storage full, compress/remove screenshots.',
        };
      }

      return {
        ok: false,
        code: 'storage_error',
        message: 'Failed to save projects to local storage.',
      };
    }
  },

  addProject(project: Project): StorageWriteResult {
    const projects = this.getProjects();
    projects.push(project);
    return this.saveProjects(projects);
  },

  updateProject(id: string, updates: Partial<Project>): StorageWriteResult {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates };
      return this.saveProjects(projects);
    }
    return { ok: false, code: 'storage_error', message: 'Project not found.' };
  },

  deleteProject(id: string): StorageWriteResult {
    const projects = this.getProjects();
    if (!projects.some((project) => project.id === id)) {
      return { ok: false, code: 'storage_error', message: 'Project not found.' };
    }
    return this.saveProjects(projects.filter((project) => project.id !== id));
  },

  getProject(id: string): Project | undefined {
    return this.getProjects().find((p) => p.id === id);
  },

  exportProjects(): string {
    return serializeProjectsForExport(this.getProjects());
  },

  importProjects(rawData: string, mode: ImportMode = 'merge'): ImportProjectsResult {
    const currentProjects = this.getProjects();
    const importedPayload = parseImportedProjects(rawData);

    if (mode === 'replace') {
      const writeResult = this.saveProjects(importedPayload.projects);
      return {
        ...writeResult,
        imported: importedPayload.projects.length,
        skipped: importedPayload.skipped,
        total: importedPayload.projects.length,
        mode,
        detectedFormat: importedPayload.detectedFormat,
      };
    }

    const byId = new Map(currentProjects.map((project) => [project.id, project]));
    importedPayload.projects.forEach((project) => byId.set(project.id, project));

    const mergedProjects = Array.from(byId.values());
    const writeResult = this.saveProjects(mergedProjects);

    return {
      ...writeResult,
      imported: importedPayload.projects.length,
      skipped: importedPayload.skipped,
      total: mergedProjects.length,
      mode,
      detectedFormat: importedPayload.detectedFormat,
    };
  },
};

export { generateId } from './utils.ts';

function getByteSize(value: string): number {
  if (typeof Blob !== 'undefined') {
    return new Blob([value]).size;
  }
  return new TextEncoder().encode(value).length;
}

export function estimateProjectsStorageUsageBytes(projects: Project[]): number {
  return getByteSize(JSON.stringify(projects));
}
