'use client';

import { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Project } from '@/lib/types';
import {
  PROJECT_TYPES,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  PROJECT_TYPE_OPTIONS,
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from '@/lib/constants';
import { generateId, StorageWriteResult } from '@/lib/storage';
import { processImageFile } from '@/lib/image-processing';
import { cn, getSafeExternalUrl } from '@/lib/utils';
import { Folder, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const OptionalUrlSchema = z
  .string()
  .trim()
  .refine((value) => !value || getSafeExternalUrl(value) !== null, {
    message: 'Please enter a valid http(s) URL',
  });

const AddProjectSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  type: z.enum(PROJECT_TYPES),
  category: z.enum(PROJECT_CATEGORIES),
  githubUrl: OptionalUrlSchema,
  liveUrl: OptionalUrlSchema,
  localPath: z.string().trim(),
  description: z.string().trim(),
  status: z.enum(PROJECT_STATUSES),
  images: z.array(z.string()),
});

type AddProjectFormValues = z.infer<typeof AddProjectSchema>;

const DEFAULT_VALUES: AddProjectFormValues = {
  title: '',
  type: 'web',
  category: 'site',
  githubUrl: '',
  liveUrl: '',
  localPath: '',
  description: '',
  status: 'idea',
  images: [],
};

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (project: Project) => StorageWriteResult;
}

export function AddProjectDialog({ open, onOpenChange, onAdd }: AddProjectDialogProps) {
  const form = useForm<AddProjectFormValues>({
    resolver: zodResolver(AddProjectSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const [isDropActive, setIsDropActive] = useState(false);
  const dragDepthRef = useRef(0);

  const images = form.watch('images');

  const errors = form.formState.errors;

  const closeDialog = () => {
    onOpenChange(false);
    form.reset(DEFAULT_VALUES);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      form.reset(DEFAULT_VALUES);
    }
  };

  const handleImageFiles = async (selectedFiles: File[]) => {
    const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('Please upload image files only');
      return;
    }

    if (imageFiles.length < selectedFiles.length) {
      toast.error('Some files were skipped (unsupported type)');
    }

    const processed = await Promise.allSettled(imageFiles.map((file) => processImageFile(file)));

    const successfulImages = processed
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map((result) => result.value);

    const failedCount = processed.length - successfulImages.length;

    if (successfulImages.length > 0) {
      const nextImages = [...form.getValues('images'), ...successfulImages];
      form.setValue('images', nextImages, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success(
        `Added ${successfulImages.length} screenshot${successfulImages.length === 1 ? '' : 's'}`
      );
    }

    if (failedCount > 0) {
      toast.error(`Failed to process ${failedCount} image${failedCount === 1 ? '' : 's'}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    await handleImageFiles(Array.from(files));

    e.target.value = '';
  };

  const handleDragEnter = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    if (event.dataTransfer.items.length > 0) {
      setIsDropActive(true);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDropActive(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDropActive(false);

    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length === 0) return;

    await handleImageFiles(droppedFiles);
  };

  const handleRemoveImage = (index: number) => {
    const nextImages = form.getValues('images').filter((_, i) => i !== index);
    form.setValue('images', nextImages, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleSubmit = form.handleSubmit((values) => {
    const project: Project = {
      id: generateId(),
      ...values,
      lastReviewDate: new Date().toISOString(),
      tasks: [],
      createdAt: new Date().toISOString(),
    };

    const result = onAdd(project);
    if (!result.ok) {
      return;
    }

    closeDialog();
  });

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...form.register('title')}
                placeholder="My Awesome Project"
                required
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubUrl">GitHub URL</Label>
              <Input
                id="githubUrl"
                {...form.register('githubUrl')}
                placeholder="https://github.com/..."
              />
              {errors.githubUrl && (
                <p className="text-sm text-destructive">{errors.githubUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="liveUrl">Live URL</Label>
              <Input
                id="liveUrl"
                {...form.register('liveUrl')}
                placeholder="https://..."
              />
              {errors.liveUrl && (
                <p className="text-sm text-destructive">{errors.liveUrl.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="localPath">Local Path</Label>
              <div className="relative">
                <Folder className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="localPath"
                  {...form.register('localPath')}
                  placeholder="/Users/me/dev/project-name"
                  className="pl-9 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                )}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="What's this project about?"
                rows={3}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Screenshots</Label>
              <div className="space-y-3">
                <label
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors',
                    isDropActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-secondary/40 hover:border-border/60 hover:bg-secondary/60'
                  )}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Drop images or click to upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>

                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img, idx) => (
                      <div key={`${img.slice(0, 24)}-${idx}`} className="group relative aspect-video overflow-hidden rounded-md border border-border">
                        <img src={img} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute right-1 top-1 rounded-sm bg-destructive/90 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3 text-destructive-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Create Project →
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
