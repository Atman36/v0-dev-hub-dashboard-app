export interface Task {
  id: string;
  text: string;
  isDone: boolean;
}

export interface Project {
  id: string;
  title: string;
  type: 'web' | 'mobile' | 'telegram' | 'presentation';
  category: 'startup' | 'site' | 'app' | 'bot' | 'other';
  images: string[];
  githubUrl: string;
  liveUrl: string;
  localPath: string;
  description: string;
  status: 'idea' | 'in-progress' | 'mvp' | 'live' | 'archived';
  lastReviewDate: string;
  tasks: Task[];
  createdAt: string;
}

export type ProjectType = Project['type'];
export type ProjectCategory = Project['category'];
export type ProjectStatus = Project['status'];
