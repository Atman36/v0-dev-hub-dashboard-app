export const PROJECT_TYPES = ['web', 'mobile', 'telegram', 'presentation'] as const;
export const PROJECT_CATEGORIES = ['startup', 'site', 'app', 'bot', 'other'] as const;
export const PROJECT_STATUSES = ['idea', 'in-progress', 'mvp', 'live', 'archived'] as const;

export const PROJECT_TYPE_LABELS: Record<typeof PROJECT_TYPES[number], string> = {
  web: 'Web',
  mobile: 'Mobile',
  telegram: 'Telegram',
  presentation: 'Presentation',
};

export const PROJECT_CATEGORY_LABELS: Record<typeof PROJECT_CATEGORIES[number], string> = {
  startup: 'Startup',
  site: 'Site',
  app: 'App',
  bot: 'Bot',
  other: 'Other',
};

export const PROJECT_STATUS_LABELS: Record<typeof PROJECT_STATUSES[number], string> = {
  idea: 'Idea',
  'in-progress': 'In Progress',
  mvp: 'MVP',
  live: 'Live',
  archived: 'Archived',
};
