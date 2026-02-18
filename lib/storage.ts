import { Project } from './types';
import { parseImportedProjects, serializeProjectsForExport } from './project-exchange';

const STORAGE_KEY = 'devhub_projects';

type ImportMode = 'replace' | 'merge';

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function dropLargestImage(projects: Project[]): boolean {
  let largestProjectIndex = -1;
  let largestImageIndex = -1;
  let largestImageSize = 0;

  projects.forEach((project, projectIndex) => {
    project.images.forEach((image, imageIndex) => {
      if (image.length > largestImageSize) {
        largestImageSize = image.length;
        largestProjectIndex = projectIndex;
        largestImageIndex = imageIndex;
      }
    });
  });

  if (largestProjectIndex === -1 || largestImageIndex === -1) return false;

  const targetProject = projects[largestProjectIndex];
  projects[largestProjectIndex] = {
    ...targetProject,
    images: targetProject.images.filter((_, index) => index !== largestImageIndex),
  };

  return true;
}

export interface ImportProjectsResult {
  imported: number;
  skipped: number;
  total: number;
  mode: ImportMode;
  detectedFormat: string;
}

export const storage = {
  getProjects(): Project[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveProjects(projects: Project[]): void {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify(projects);

    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (error) {
      if (isQuotaExceededError(error)) {
        const reducedProjects = projects.map((project) => ({
          ...project,
          images: [...project.images],
        }));

        let removedImages = 0;
        while (dropLargestImage(reducedProjects)) {
          removedImages += 1;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedProjects));
            console.warn(
              `[v0] Storage quota exceeded, removed ${removedImages} screenshot(s) to save projects.`
            );
            return;
          } catch (fallbackError) {
            if (!isQuotaExceededError(fallbackError)) {
              console.error('[v0] Failed to save projects:', fallbackError);
              return;
            }
          }
        }

        console.error('[v0] Failed to save projects: storage quota exceeded and no screenshots left to remove.');
        return;
      }
      console.error('[v0] Failed to save projects:', error);
    }
  },

  addProject(project: Project): void {
    const projects = this.getProjects();
    projects.push(project);
    this.saveProjects(projects);
  },

  updateProject(id: string, updates: Partial<Project>): void {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates };
      this.saveProjects(projects);
    }
  },

  deleteProject(id: string): void {
    const projects = this.getProjects();
    this.saveProjects(projects.filter((p) => p.id !== id));
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
      this.saveProjects(importedPayload.projects);
      return {
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
    this.saveProjects(mergedProjects);

    return {
      imported: importedPayload.projects.length,
      skipped: importedPayload.skipped,
      total: mergedProjects.length,
      mode,
      detectedFormat: importedPayload.detectedFormat,
    };
  },
};

export function generateId(): string {
  // Simple ID generation without nanoid to avoid SSR issues
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
