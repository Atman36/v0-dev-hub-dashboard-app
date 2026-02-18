'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/lib/types';
import { storage } from '@/lib/storage';

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

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    mounted,
  };
}
