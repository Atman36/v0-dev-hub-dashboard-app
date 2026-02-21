import { PROJECT_TYPES, PROJECT_CATEGORIES, PROJECT_STATUSES } from './constants';

export type ProjectType = typeof PROJECT_TYPES[number];
export type ProjectCategory = typeof PROJECT_CATEGORIES[number];
export type ProjectStatus = typeof PROJECT_STATUSES[number];

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
  lastReviewDate: string;
  tasks: Task[];
  createdAt: string;
}
