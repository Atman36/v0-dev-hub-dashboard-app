import { PROJECT_TYPES, PROJECT_CATEGORIES, PROJECT_STATUSES, PROJECT_VISIBILITIES } from './constants.ts';

export type ProjectType = typeof PROJECT_TYPES[number];
export type ProjectCategory = typeof PROJECT_CATEGORIES[number];
export type ProjectStatus = typeof PROJECT_STATUSES[number];
export type ProjectVisibility = typeof PROJECT_VISIBILITIES[number];

export interface Task {
  id: string;
  text: string;
  isDone: boolean;
}

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  category: ProjectCategory;
  images: string[];
  githubUrl: string;
  liveUrl: string;
  localPath: string;
  description: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  lastReviewDate: string;
  tasks: Task[];
  createdAt: string;
}
