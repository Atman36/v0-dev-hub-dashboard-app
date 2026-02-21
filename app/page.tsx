'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { Header } from '@/components/header';
import { ProjectCard } from '@/components/project-card';
import { AddProjectDialog } from '@/components/add-project-dialog';
import { ProjectDetail } from '@/components/project-detail';
import { ProjectType } from '@/lib/types';
import {
  estimateProjectsStorageUsageBytes,
  LOCAL_STORAGE_SOFT_LIMIT_BYTES,
  StorageWriteResult,
} from '@/lib/storage';
import { FileCode2 } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { downloadJsonFile } from '@/lib/utils';

export default function HomePage() {
  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    exportProjects,
    importProjects,
  } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ProjectType | 'all'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const storageUsageBytes = useMemo(
    () => estimateProjectsStorageUsageBytes(projects),
    [projects]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter projects
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Filter by type
    if (activeFilter !== 'all') {
      result = result.filter((p) => p.type === activeFilter);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.localPath.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [projects, activeFilter, searchQuery]);

  // Split by sections
  const { webProjects, mobileProjects } = useMemo(() => {
    const web: typeof filteredProjects = [];
    const mobile: typeof filteredProjects = [];

    for (const p of filteredProjects) {
      if (p.type === 'web' || p.type === 'presentation') {
        web.push(p);
      } else if (p.type === 'mobile' || p.type === 'telegram') {
        mobile.push(p);
      }
    }

    return { webProjects: web, mobileProjects: mobile };
  }, [filteredProjects]);
  const showStorageWriteError = (result: StorageWriteResult, fallback: string) => {
    if (result.ok) return;
    if (result.code === 'quota_exceeded') {
      toast.error('Storage full, compress/remove screenshots');
      return;
    }
    toast.error(result.message || fallback);
  };

  const handleAddProject = (project: Parameters<typeof addProject>[0]) => {
    const result = addProject(project);
    showStorageWriteError(result, 'Failed to save project');
    return result;
  };

  const handleUpdateProject = (
    id: Parameters<typeof updateProject>[0],
    updates: Parameters<typeof updateProject>[1]
  ) => {
    const result = updateProject(id, updates);
    showStorageWriteError(result, 'Failed to update project');
    return result;
  };

  const handleDeleteProject = (id: string) => {
    const result = deleteProject(id);
    showStorageWriteError(result, 'Failed to delete project');
    if (!result.ok) return;
    setSelectedProjectId(null);
    setStartInEditMode(false);
    toast.success('Project deleted');
  };

  const handleExportProjects = () => {
    const payload = exportProjects();
    const filename = `devhub-projects-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJsonFile(payload, filename);
    toast.success('Projects exported');
  };

  const handleImportProjects = async (file: File) => {
    try {
      const rawData = await file.text();
      const result = importProjects(rawData, 'merge');
      if (!result.ok) {
        if (result.code === 'quota_exceeded') {
          toast.error('Storage full, compress/remove screenshots');
          return;
        }
        toast.error(result.message || 'Import failed during save');
        return;
      }

      toast.success(
        `Imported ${result.imported} project${result.imported === 1 ? '' : 's'} (${result.mode})`
      );
      if (result.skipped > 0) {
        toast.info(`Skipped ${result.skipped} invalid record${result.skipped === 1 ? '' : 's'}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import error';
      toast.error(`Import failed: ${message}`);
    }
  };

  useEffect(() => {
    if (!selectedProjectId) return;
    const exists = projects.some((project) => project.id === selectedProjectId);
    if (!exists) {
      setSelectedProjectId(null);
      setStartInEditMode(false);
    }
  }, [projects, selectedProjectId]);

  // Show project detail if selected
  if (selectedProject) {
    return (
      <>
        <ProjectDetail
          project={selectedProject}
          onBack={() => {
            setSelectedProjectId(null);
            setStartInEditMode(false);
          }}
          onUpdate={handleUpdateProject}
          onDelete={handleDeleteProject}
          startInEditMode={startInEditMode}
        />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onAddProject={() => setShowAddDialog(true)}
          onExportProjects={handleExportProjects}
          onImportProjects={handleImportProjects}
          storageUsageBytes={storageUsageBytes}
          storageSoftLimitBytes={LOCAL_STORAGE_SOFT_LIMIT_BYTES}
        />

        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-16">
          {/* Web & Presentations Section */}
          {(activeFilter === 'all' || activeFilter === 'web' || activeFilter === 'presentation') && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">
                Web & Presentations
              </h2>
              {webProjects.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {webProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setStartInEditMode(false);
                      }}
                      onEdit={() => {
                        setSelectedProjectId(project.id);
                        setStartInEditMode(true);
                      }}
                      aspectRatio="video"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/20 py-16">
                  <FileCode2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No matching projects' : 'No web projects yet'}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Mobile & Telegram Section */}
          {(activeFilter === 'all' || activeFilter === 'mobile' || activeFilter === 'telegram') && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">
                Mobile & Telegram
              </h2>
              {mobileProjects.length > 0 ? (
                <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {mobileProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setStartInEditMode(false);
                      }}
                      onEdit={() => {
                        setSelectedProjectId(project.id);
                        setStartInEditMode(true);
                      }}
                      aspectRatio="portrait"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/20 py-16">
                  <FileCode2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No matching projects' : 'No mobile projects yet'}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Global empty state */}
          {filteredProjects.length === 0 && !searchQuery && (
            <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-secondary/60 p-6">
                <FileCode2 className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  No projects yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add your first project to get started →
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <AddProjectDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddProject}
      />

      <Toaster position="bottom-right" />
    </>
  );
}
