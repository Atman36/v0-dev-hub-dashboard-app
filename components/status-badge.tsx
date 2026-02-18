import { ProjectStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const statusConfig = {
  idea: {
    label: 'Idea',
    dotColor: 'bg-muted-foreground/60',
    textColor: 'text-muted-foreground',
  },
  'in-progress': {
    label: 'In Progress',
    dotColor: 'bg-info',
    textColor: 'text-info',
  },
  mvp: {
    label: 'MVP',
    dotColor: 'bg-warning',
    textColor: 'text-warning',
  },
  live: {
    label: 'Live',
    dotColor: 'bg-success',
    textColor: 'text-success',
  },
  archived: {
    label: 'Archived',
    dotColor: 'bg-muted-foreground/30',
    textColor: 'text-muted-foreground/60',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
      <span className={cn('text-xs font-medium', config.textColor)}>
        {config.label}
      </span>
    </div>
  );
}
