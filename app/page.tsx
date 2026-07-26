'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { Header } from '@/components/header';
import { ProjectCard } from '@/components/project-card';
import { AddProjectDialog } from '@/components/add-project-dialog';
import { ProjectDetail } from '@/components/project-detail';
import { ProjectType, ProjectVisibility } from '@/lib/types';
import {
  estimateProjectsStorageUsageBytes,
  LOCAL_STORAGE_SOFT_LIMIT_BYTES,
  LOCAL_STORAGE_WARN_RATIO,
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
  const [visibilityFilter, setVisibilityFilter] = useState<ProjectVisibility | 'all'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const hasWarnedAboutStorageRef = useRef(false);
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
      // Lowercase so the shortcuts still fire with Caps Lock or Shift held.
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById(
          window.matchMedia('(min-width: 768px)').matches
            ? 'desktop-project-search'
            : 'mobile-project-search'
        );
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
          searchInput.select();
        }
      }
      if ((e.metaKey || e.ctrlKey) && key === 'n') {
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

    if (visibilityFilter !== 'all') {
      result = result.filter((p) => p.visibility === visibilityFilter);
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
  }, [projects, activeFilter, visibilityFilter, searchQuery]);

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

  // A section can be empty because of the search box or any active filter, not only
  // because the user never added that kind of project.
  const hasNarrowedResults =
    searchQuery.trim() !== '' || activeFilter !== 'all' || visibilityFilter !== 'all';

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

  const handleExportProjects = useCallback(() => {
    const payload = exportProjects();
    const filename = `devhub-projects-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJsonFile(payload, filename);
    toast.success('Projects exported');
  }, [exportProjects]);

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

  // Everything lives in localStorage, so hitting the quota means writes start failing
  // silently from the user's point of view. Warn once per crossing of the threshold.
  useEffect(() => {
    if (storageUsageBytes < LOCAL_STORAGE_SOFT_LIMIT_BYTES * LOCAL_STORAGE_WARN_RATIO) {
      hasWarnedAboutStorageRef.current = false;
      return;
    }
    if (hasWarnedAboutStorageRef.current) return;
    hasWarnedAboutStorageRef.current = true;

    toast.warning('Local storage is almost full. Export a backup and remove heavy screenshots.', {
      duration: 10000,
      action: { label: 'Export', onClick: handleExportProjects },
    });
  }, [storageUsageBytes, handleExportProjects]);

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
          visibilityFilter={visibilityFilter}
          onVisibilityFilterChange={setVisibilityFilter}
          onAddProject={() => setShowAddDialog(true)}
          onExportProjects={handleExportProjects}
          onImportProjects={handleImportProjects}
          storageUsageBytes={storageUsageBytes}
          storageSoftLimitBytes={LOCAL_STORAGE_SOFT_LIMIT_BYTES}
        />

        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-16">
          {/* Web & Presentations Section */}
          {projects.length > 0 &&
            (activeFilter === 'all' || activeFilter === 'web' || activeFilter === 'presentation') && (
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
                    {hasNarrowedResults ? 'No matching projects' : 'No web projects yet'}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Mobile & Telegram Section */}
          {projects.length > 0 &&
            (activeFilter === 'all' || activeFilter === 'mobile' || activeFilter === 'telegram') && (
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
                    {hasNarrowedResults ? 'No matching projects' : 'No mobile projects yet'}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Global empty state */}
          {projects.length === 0 && (
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
