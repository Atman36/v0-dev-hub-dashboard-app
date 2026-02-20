'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/lib/types';
import { ImportProjectsResult, StorageWriteResult, storage } from '@/lib/storage';

const STORAGE_KEY = 'devhub_projects';
const PROJECTS_CHANGE_EVENT = 'devhub:projects-change';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  const syncProjects = () => {
    setProjects(storage.getProjects());
  };

  const notifyProjectsChanged = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PROJECTS_CHANGE_EVENT));
  };

  useEffect(() => {
    syncProjects();

    const handleProjectsChanged = () => {
      syncProjects();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncProjects();
      }
    };

    window.addEventListener(PROJECTS_CHANGE_EVENT, handleProjectsChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(PROJECTS_CHANGE_EVENT, handleProjectsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const addProject = (project: Project): StorageWriteResult => {
    const result = storage.addProject(project);
    if (result.ok) {
      syncProjects();
      notifyProjectsChanged();
    }
    return result;
  };

  const updateProject = (id: string, updates: Partial<Project>): StorageWriteResult => {
    const result = storage.updateProject(id, updates);
    if (result.ok) {
      syncProjects();
      notifyProjectsChanged();
    }
    return result;
  };

  const deleteProject = (id: string): StorageWriteResult => {
    const result = storage.deleteProject(id);
    if (result.ok) {
      syncProjects();
      notifyProjectsChanged();
    }
    return result;
  };

  const exportProjects = () => storage.exportProjects();

  const importProjects = (
    rawData: string,
    mode: 'replace' | 'merge' = 'merge'
  ): ImportProjectsResult => {
    const result = storage.importProjects(rawData, mode);
    if (result.ok) {
      syncProjects();
      notifyProjectsChanged();
    }
    return result;
  };

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    exportProjects,
    importProjects,
  };
}
