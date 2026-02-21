'use client';

import { useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectType } from '@/lib/types';
import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: ProjectType | 'all';
  onFilterChange: (filter: ProjectType | 'all') => void;
  onAddProject: () => void;
  onExportProjects: () => void;
  onImportProjects: (file: File) => void;
  storageUsageBytes: number;
  storageSoftLimitBytes: number;
}

const filters: Array<{ value: ProjectType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  ...PROJECT_TYPES.map((type) => ({
    value: type,
    label: PROJECT_TYPE_LABELS[type],
  })),
];

export function Header({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onAddProject,
  onExportProjects,
  onImportProjects,
  storageUsageBytes,
  storageSoftLimitBytes,
}: HeaderProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const usagePercent = Math.min(100, Math.round((storageUsageBytes / storageSoftLimitBytes) * 100));

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filterPills = filters.map((filter) => (
    <button
      key={filter.value}
      onClick={() => onFilterChange(filter.value)}
      className={cn(
        'relative shrink-0 px-4 py-1.5 text-sm font-medium transition-colors rounded-md',
        activeFilter === filter.value
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {filter.label}
      {activeFilter === filter.value && (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent" />
      )}
    </button>
  ));

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImportProjects(file);
          event.target.value = '';
        }}
      />
      <div className="container mx-auto px-4 sm:px-6 py-3 md:py-4">
        {/* Desktop layout */}
        <div className="hidden md:flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-lg font-semibold">DevHub</span>
            <span className="text-accent">●</span>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-secondary/60 border-border/60 focus:bg-secondary h-9"
            />
          </div>

          <div className="flex items-center gap-1">{filterPills}</div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground tabular-nums xl:inline">
              Storage {formatBytes(storageUsageBytes)} / ~{formatBytes(storageSoftLimitBytes)} (
              {usagePercent}%)
            </span>
            <Button
              onClick={() => importInputRef.current?.click()}
              variant="ghost"
              className="h-9 px-3"
            >
              Import
            </Button>
            <Button onClick={onExportProjects} variant="ghost" className="h-9 px-3">
              Export
            </Button>
            <Button onClick={onAddProject} variant="outline" className="gap-2 h-9 px-3">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-lg font-semibold">DevHub</span>
              <span className="text-accent">●</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => importInputRef.current?.click()}
                variant="ghost"
                className="h-8 px-2.5 text-xs"
              >
                Import
              </Button>
              <Button onClick={onExportProjects} variant="ghost" className="h-8 px-2.5 text-xs">
                Export
              </Button>
              <Button onClick={onAddProject} variant="outline" className="gap-1.5 h-8 px-2.5">
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-secondary/60 border-border/60 focus:bg-secondary h-9"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filterPills}
          </div>
        </div>
      </div>
    </header>
  );
}
