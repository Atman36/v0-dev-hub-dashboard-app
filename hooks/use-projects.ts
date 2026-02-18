'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/lib/types';
import { ImportProjectsResult, storage } from '@/lib/storage';

let listeners: Array<() => void> = [];

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setProjects(storage.getProjects());

    const handleChange = () => {
      setProjects(storage.getProjects());
    };

    listeners.push(handleChange);
    return () => {
      listeners = listeners.filter((l) => l !== handleChange);
    };
  }, []);

  const addProject = (project: Project) => {
    storage.addProject(project);
    emitChange();
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    storage.updateProject(id, updates);
    emitChange();
  };

  const deleteProject = (id: string) => {
    storage.deleteProject(id);
    emitChange();
  };

  const exportProjects = () => storage.exportProjects();

  const importProjects = (
    rawData: string,
    mode: 'replace' | 'merge' = 'merge'
  ): ImportProjectsResult => {
    const result = storage.importProjects(rawData, mode);
    emitChange();
    return result;
  };

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    exportProjects,
    importProjects,
    mounted,
  };
}
