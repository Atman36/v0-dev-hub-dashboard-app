'use client';

import { useState } from 'react';
import { Project, ProjectStatus, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Github,
  ExternalLink,
  Copy,
  Check,
  FolderOpen,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Project>) => void;
}

export function ProjectDetail({ project, onBack, onUpdate }: ProjectDetailProps) {
  const [copied, setCopied] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');

  const handleCopyPath = () => {
    navigator.clipboard.writeText(project.localPath);
    setCopied(true);
    toast.success('Path copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenVSCode = () => {
    window.location.href = `vscode://file${project.localPath}`;
  };

  const handleStatusChange = (status: ProjectStatus) => {
    onUpdate(project.id, { status });
    toast.success('Status updated');
  };

  const handleMarkReviewed = () => {
    onUpdate(project.id, { lastReviewDate: new Date().toISOString() });
    toast.success('Marked as reviewed today');
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: generateId(),
      text: newTaskText,
      isDone: false,
    };
    onUpdate(project.id, { tasks: [...project.tasks, newTask] });
    setNewTaskText('');
  };

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = project.tasks.map((task) =>
      task.id === taskId ? { ...task, isDone: !task.isDone } : task
    );
    onUpdate(project.id, { tasks: updatedTasks });
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = project.tasks.filter((task) => task.id !== taskId);
    onUpdate(project.id, { tasks: updatedTasks });
  };

  const activeTasks = project.tasks.filter((t) => !t.isDone);
  const doneTasks = project.tasks.filter((t) => t.isDone);

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <div className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2 -ml-3 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            All Projects
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Top section: Image */}
        {project.images[0] && (
          <div className="overflow-hidden rounded-lg border border-border">
            <img
              src={project.images[0]}
              alt={project.title}
              className={cn(
                'w-full object-cover',
                project.type === 'mobile' || project.type === 'telegram'
                  ? 'max-h-[600px]'
                  : 'max-h-[400px]'
              )}
            />
          </div>
        )}

        {project.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {project.images.slice(1).map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                className="h-20 w-auto rounded border border-border object-cover"
              />
            ))}
          </div>
        )}

        {/* Info grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Project info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-foreground">{project.title}</h1>
              <div className="flex gap-2">
                <Badge variant="outline">{project.category}</Badge>
                <Badge variant="outline">{project.type}</Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground leading-relaxed">{project.description}</p>
              )}
            </div>

            <div className="flex gap-2">
              {project.githubUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(project.githubUrl, '_blank')}
                  className="gap-2"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </Button>
              )}
              {project.liveUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(project.liveUrl, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Live Site
                </Button>
              )}
            </div>
          </div>

          {/* Right: Cards */}
          <div className="space-y-4">
            {/* Local Access */}
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Local Access
              </h3>
              <div className="space-y-2">
                <div className="rounded-md bg-secondary/60 p-3">
                  <p className="font-mono text-xs text-foreground truncate">
                    {project.localPath || 'No path set'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPath}
                    disabled={!project.localPath}
                    className="gap-2"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenVSCode}
                    disabled={!project.localPath}
                    className="gap-2"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    VS Code
                  </Button>
                </div>
              </div>
            </Card>

            {/* Status */}
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </h3>
              <div className="space-y-3">
                <Select value={project.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="mvp">MVP</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Last reviewed: {new Date(project.lastReviewDate).toLocaleDateString()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkReviewed}
                    className="w-full"
                  >
                    Mark Reviewed Today
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Tasks section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Next Steps
              {project.tasks.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({activeTasks.length}/{project.tasks.length})
                </span>
              )}
            </h2>
          </div>

          {/* Add task */}
          <div className="flex gap-2">
            <Input
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
              }}
              placeholder="Add a new task..."
              className="flex-1"
            />
            <Button onClick={handleAddTask} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Task list */}
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-secondary/40"
              >
                <Checkbox
                  checked={task.isDone}
                  onCheckedChange={() => handleToggleTask(task.id)}
                />
                <span className="flex-1 text-sm text-foreground">{task.text}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {doneTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 rounded-md border border-border/40 bg-card p-3 opacity-60"
              >
                <Checkbox checked={task.isDone} onCheckedChange={() => handleToggleTask(task.id)} />
                <span className="flex-1 text-sm text-muted-foreground line-through">
                  {task.text}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {project.tasks.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No next steps. What's the plan?
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
