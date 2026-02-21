import { ProjectStatus } from '@/lib/types';
import { PROJECT_STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const statusConfig = {
  idea: {
    label: PROJECT_STATUS_LABELS.idea,
    dotColor: 'bg-muted-foreground/60',
    textColor: 'text-muted-foreground',
  },
  'in-progress': {
    label: PROJECT_STATUS_LABELS['in-progress'],
    dotColor: 'bg-info',
    textColor: 'text-info',
  },
  mvp: {
    label: PROJECT_STATUS_LABELS.mvp,
    dotColor: 'bg-warning',
    textColor: 'text-warning',
  },
  live: {
    label: PROJECT_STATUS_LABELS.live,
    dotColor: 'bg-success',
    textColor: 'text-success',
  },
  archived: {
    label: PROJECT_STATUS_LABELS.archived,
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
