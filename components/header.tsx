'use client';

import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: ProjectType | 'all';
  onFilterChange: (filter: ProjectType | 'all') => void;
  onAddProject: () => void;
}

const filters: Array<{ value: ProjectType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'telegram', label: 'Telegram' },
];

export function Header({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onAddProject,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg font-semibold">DevHub</span>
            <span className="text-accent">●</span>
          </div>

          {/* Search */}
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

          {/* Filter pills */}
          <div className="flex items-center gap-1">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onFilterChange(filter.value)}
                className={cn(
                  'relative px-4 py-1.5 text-sm font-medium transition-colors rounded-md',
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
            ))}
          </div>

          {/* Add button */}
          <Button onClick={onAddProject} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>
    </header>
  );
}
