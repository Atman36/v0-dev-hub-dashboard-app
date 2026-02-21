'use client';

import { useEffect, useRef, useState } from 'react';
import { Project, ProjectStatus, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Pencil,
  Save,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateId, StorageWriteResult } from '@/lib/storage';
import { processImageFile } from '@/lib/image-processing';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ImageWithFallback } from '@/components/image-with-fallback';
import {
  PROJECT_TYPE_OPTIONS,
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_LABELS,
  PROJECT_CATEGORY_LABELS,
} from '@/lib/constants';

type EditableProjectFields = Pick<
  Project,
  'title' | 'type' | 'category' | 'githubUrl' | 'liveUrl' | 'localPath' | 'description' | 'images'
>;

function getEditableProjectFields(project: Project): EditableProjectFields {
  return {
    title: project.title,
    type: project.type,
    category: project.category,
    githubUrl: project.githubUrl,
    liveUrl: project.liveUrl,
    localPath: project.localPath,
    description: project.description,
    images: [...project.images],
  };
}

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Project>) => StorageWriteResult;
  onDelete: (id: string) => void;
  startInEditMode?: boolean;
}

export function ProjectDetail({
  project,
  onBack,
  onUpdate,
  onDelete,
  startInEditMode = false,
}: ProjectDetailProps) {
  const [copied, setCopied] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [editableProject, setEditableProject] = useState<EditableProjectFields>(() =>
    getEditableProjectFields(project)
  );
  const [replaceImageIndex, setReplaceImageIndex] = useState<number | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsEditing(startInEditMode);
  }, [project.id, startInEditMode]);

  useEffect(() => {
    if (isEditing) return;
    setEditableProject(getEditableProjectFields(project));
  }, [
    project.title,
    project.type,
    project.category,
    project.githubUrl,
    project.liveUrl,
    project.localPath,
    project.description,
    project.images,
    isEditing,
  ]);

  const withUpdate = (updates: Partial<Project>): boolean => {
    const result = onUpdate(project.id, updates);
    return result.ok;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    const selectedFiles = Array.from(fileList);
    const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('Please upload image files only');
      event.target.value = '';
      return;
    }

    if (imageFiles.length < selectedFiles.length) {
      toast.error('Some files were skipped (unsupported type)');
    }

    try {
      if (replaceImageIndex !== null) {
        const file = imageFiles[0];
        const base64Image = await processImageFile(file);
        setEditableProject((prev) => {
          const images = [...prev.images];
          images[replaceImageIndex] = base64Image;
          return { ...prev, images };
        });
        toast.success('Screenshot replaced');
      } else {
        const results = await Promise.allSettled(imageFiles.map((file) => processImageFile(file)));
        const newImages = results
          .filter(
            (result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled'
          )
          .map((result) => result.value);
        const failedCount = results.length - newImages.length;

        if (newImages.length === 0) {
          toast.error('Failed to process image');
          return;
        }

        setEditableProject((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages],
        }));
        toast.success(`Added ${newImages.length} screenshot${newImages.length === 1 ? '' : 's'}`);
        if (failedCount > 0) {
          toast.error(`Failed to process ${failedCount} image${failedCount === 1 ? '' : 's'}`);
        }
      }
    } catch {
      toast.error('Failed to process image');
    } finally {
      setReplaceImageIndex(null);
      event.target.value = '';
    }
  };

  const openImagePicker = (mode: 'add' | 'replace', index?: number) => {
    if (mode === 'replace') {
      if (typeof index !== 'number') return;
      setReplaceImageIndex(index);
    } else {
      setReplaceImageIndex(null);
    }
    uploadInputRef.current?.click();
  };

  const handleDeleteImage = (index: number) => {
    setEditableProject((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
    toast.success('Screenshot removed');
  };

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
    if (withUpdate({ status })) {
      toast.success('Status updated');
    }
  };

  const handleMarkReviewed = () => {
    if (withUpdate({ lastReviewDate: new Date().toISOString() })) {
      toast.success('Marked as reviewed today');
    }
  };

  const handleAddTask = () => {
    const taskText = newTaskText.trim();
    if (!taskText) return;

    const newTask: Task = {
      id: generateId(),
      text: taskText,
      isDone: false,
    };
    if (withUpdate({ tasks: [...project.tasks, newTask] })) {
      setNewTaskText('');
    }
  };

  const handleSaveProject = () => {
    const title = editableProject.title.trim();
    if (!title) {
      toast.error('Title is required');
      return;
    }

    const updates: EditableProjectFields = {
      ...editableProject,
      title,
      description: editableProject.description.trim(),
    };

    if (withUpdate(updates)) {
      setEditableProject(updates);
      setIsEditing(false);
      toast.success('Project updated');
    }
  };

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = project.tasks.map((task) =>
      task.id === taskId ? { ...task, isDone: !task.isDone } : task
    );
    withUpdate({ tasks: updatedTasks });
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = project.tasks.filter((task) => task.id !== taskId);
    withUpdate({ tasks: updatedTasks });
  };

  const handleDeleteProject = () => {
    const confirmed = window.confirm(
      `Delete "${project.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    onDelete(project.id);
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
            <ImageWithFallback
              src={project.images[0]}
              alt={project.title}
              className={cn(
                'w-full object-cover',
                project.type === 'mobile' || project.type === 'telegram'
                  ? 'max-h-[600px]'
                  : 'max-h-[400px]'
              )}
              fallback={
                <div className="flex h-[240px] items-center justify-center bg-secondary/40 text-sm text-muted-foreground">
                  Preview unavailable
                </div>
              }
            />
          </div>
        )}

        {project.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {project.images.slice(1).map((img, idx) => (
              <ImageWithFallback
                key={idx}
                src={img}
                alt=""
                className="h-20 w-auto rounded border border-border object-cover"
                fallback={
                  <div className="flex h-20 w-28 items-center justify-center rounded border border-border bg-secondary/40 text-[10px] text-muted-foreground">
                    Unavailable
                  </div>
                }
              />
            ))}
          </div>
        )}

        {/* Info grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Project info */}
          <div className="lg:col-span-2 space-y-4">
            {isEditing ? (
              <Card className="p-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Title</p>
                    <Input
                      value={editableProject.title}
                      onChange={(e) =>
                        setEditableProject((prev) => ({ ...prev, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Type</p>
                    <Select
                      value={editableProject.type}
                      onValueChange={(value: Project['type']) =>
                        setEditableProject((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPE_OPTIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Category</p>
                    <Select
                      value={editableProject.category}
                      onValueChange={(value: Project['category']) =>
                        setEditableProject((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_CATEGORY_OPTIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">GitHub URL</p>
                    <Input
                      value={editableProject.githubUrl}
                      onChange={(e) =>
                        setEditableProject((prev) => ({ ...prev, githubUrl: e.target.value }))
                      }
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Live URL</p>
                    <Input
                      value={editableProject.liveUrl}
                      onChange={(e) =>
                        setEditableProject((prev) => ({ ...prev, liveUrl: e.target.value }))
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Local Path</p>
                    <Input
                      value={editableProject.localPath}
                      onChange={(e) =>
                        setEditableProject((prev) => ({ ...prev, localPath: e.target.value }))
                      }
                      placeholder="/Users/me/dev/project-name"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Description</p>
                    <Textarea
                      value={editableProject.description}
                      onChange={(e) =>
                        setEditableProject((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="What's this project about?"
                      rows={5}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-muted-foreground">Screenshots</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => openImagePicker('add')}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/*"
                      multiple={replaceImageIndex === null}
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    {editableProject.images.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {editableProject.images.map((image, index) => (
                          <div key={`${image.slice(0, 24)}-${index}`} className="group relative overflow-hidden rounded-md border border-border bg-secondary/30">
                            <ImageWithFallback
                              src={image}
                              alt=""
                              className="h-20 w-full object-cover"
                              fallback={
                                <div className="flex h-20 w-full items-center justify-center bg-secondary/60 text-[10px] text-muted-foreground">
                                  Unavailable
                                </div>
                              }
                            />
                            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => openImagePicker('replace', index)}
                              >
                                Replace
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleDeleteImage(index)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No screenshots attached</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProject} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditableProject(getEditableProjectFields(project));
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <h1 className="text-3xl font-semibold text-foreground">{project.title}</h1>
                      <div className="flex gap-2">
                        <Badge variant="outline">{PROJECT_CATEGORY_LABELS[project.category]}</Badge>
                        <Badge variant="outline">{PROJECT_TYPE_LABELS[project.type]}</Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                  {project.description && (
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ ...props }) => (
                            <a
                              {...props}
                              className="text-foreground underline underline-offset-2"
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          ),
                          table: ({ ...props }) => (
                            <div className="overflow-x-auto rounded-md border border-border">
                              <table {...props} className="min-w-full border-collapse text-sm" />
                            </div>
                          ),
                          th: ({ ...props }) => (
                            <th
                              {...props}
                              className="border-b border-border bg-secondary/50 px-3 py-2 text-left font-medium text-foreground"
                            />
                          ),
                          td: ({ ...props }) => (
                            <td {...props} className="border-b border-border px-3 py-2 align-top" />
                          ),
                          ul: ({ ...props }) => <ul {...props} className="list-disc pl-5" />,
                          ol: ({ ...props }) => <ol {...props} className="list-decimal pl-5" />,
                        }}
                      >
                        {project.description}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {project.githubUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(project.githubUrl, '_blank', 'noopener,noreferrer')}
                      className="gap-2"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </Button>
                  )}
                  {project.liveUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(project.liveUrl, '_blank', 'noopener,noreferrer')}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Live Site
                    </Button>
                  )}
                </div>
              </>
            )}
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
                    {PROJECT_STATUS_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
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

            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Danger Zone
              </h3>
              <Button variant="destructive" onClick={handleDeleteProject} className="w-full">
                Delete Project
              </Button>
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
