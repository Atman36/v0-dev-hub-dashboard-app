import { Project } from './types';

const STORAGE_KEY = 'devhub_projects';

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
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
};

export function generateId(): string {
  // Simple ID generation without nanoid to avoid SSR issues
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
