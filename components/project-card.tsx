'use client';

import { Project } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { ExternalLink, Github, ArrowRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageWithFallback } from './image-with-fallback';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEdit?: () => void;
  aspectRatio?: 'video' | 'portrait';
}

export function ProjectCard({ project, onClick, onEdit, aspectRatio = 'video' }: ProjectCardProps) {
  const handleGitHub = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.githubUrl) window.open(project.githubUrl, '_blank');
  };

  const handleLive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.liveUrl) window.open(project.liveUrl, '_blank');
  };

  const getInitials = (title: string) => {
    return title
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden border-border bg-card transition-all duration-200',
        'hover:scale-[1.01] hover:border-border/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10'
      )}
      onClick={onClick}
    >
      {/* Image area */}
      <div
        className={cn(
          'relative bg-secondary/40 overflow-hidden',
          aspectRatio === 'video' ? 'aspect-video' : 'aspect-[9/16]'
        )}
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--surface-pattern-dot) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <ImageWithFallback
          src={project.images[0]}
          alt={project.title}
          className="h-full w-full object-cover"
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-mono text-3xl font-bold text-muted-foreground/40">
                {getInitials(project.title)}
              </span>
            </div>
          }
        />
      </div>

      {/* Card body */}
      <div className="space-y-3 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium leading-tight text-foreground line-clamp-1">
              {project.title}
            </h3>
          </div>
          <Badge variant="outline" className="text-xs border-border/60 text-muted-foreground">
            {project.category}
          </Badge>
        </div>

        <StatusBadge status={project.status} />

        {/* Actions row */}
        <div className="flex items-center gap-2 pt-1">
          {project.githubUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGitHub}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              aria-label="View GitHub repository"
            >
              <Github className="h-4 w-4" />
            </Button>
          )}
          {project.liveUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLive}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              aria-label="Open live site"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              aria-label="Edit project"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 px-2 text-muted-foreground hover:text-foreground"
            aria-label="View project details"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
