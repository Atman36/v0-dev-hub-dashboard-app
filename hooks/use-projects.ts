'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/lib/types';
import { ImportProjectsResult, StorageWriteResult, storage } from '@/lib/storage';

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

  const addProject = (project: Project): StorageWriteResult => {
    const result = storage.addProject(project);
    if (result.ok) emitChange();
    return result;
  };

  const updateProject = (id: string, updates: Partial<Project>): StorageWriteResult => {
    const result = storage.updateProject(id, updates);
    if (result.ok) emitChange();
    return result;
  };

  const deleteProject = (id: string): StorageWriteResult => {
    const result = storage.deleteProject(id);
    if (result.ok) emitChange();
    return result;
  };

  const exportProjects = () => storage.exportProjects();

  const importProjects = (
    rawData: string,
    mode: 'replace' | 'merge' = 'merge'
  ): ImportProjectsResult => {
    const result = storage.importProjects(rawData, mode);
    if (result.ok) emitChange();
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
