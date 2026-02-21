# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Next.js)
pnpm build        # Production build
pnpm lint         # ESLint
npx tsc --noEmit  # Type-check without emitting (run after type changes)

# Run tests (Node built-in test runner, no extra deps)
node --experimental-strip-types lib/project-exchange.test.ts
```

> Note: `next.config.mjs` has `typescript.ignoreBuildErrors: true`, so `pnpm build` won't catch type errors — always run `npx tsc --noEmit` after type changes.

## Architecture

**Single-page app** — no routing. `app/page.tsx` conditionally renders either the dashboard grid or `<ProjectDetail>` based on `selectedProjectId` state.

### Data flow

```
localStorage ("devhub_projects")
  └─ lib/storage.ts          # CRUD + export/import, returns StorageWriteResult
       └─ hooks/use-projects.ts  # React state wrapper, dispatches custom event
            └─ app/page.tsx  # Filters/splits projects, passes handlers down
```

Cross-tab sync is handled via `window.addEventListener('storage', ...)` and the custom `devhub:projects-change` event.

### Key files

| File | Role |
|---|---|
| `lib/types.ts` | `Project` and `Task` interfaces (derived from constants) |
| `lib/constants.ts` | Source of truth for enum values (`PROJECT_TYPES`, `PROJECT_CATEGORIES`, `PROJECT_STATUSES`) and their display labels/options |
| `lib/storage.ts` | All `localStorage` operations; returns typed `StorageWriteResult` |
| `lib/project-exchange.ts` | Import/export serialization; Zod validation; snake_case↔camelCase normalization |
| `lib/image-processing.ts` | Client-side image resize (canvas → WebP/JPEG base64) before storing |
| `components/add-project-dialog.tsx` | Add/edit form using `react-hook-form` + Zod |
| `components/project-detail.tsx` | Large mixed-responsibility component (view + edit + tasks + images) |

### Enum extension

To add a new project type/category/status: update the `as const` array in `lib/constants.ts`. The types in `lib/types.ts` are derived from those constants, so they update automatically.

### Image storage

Images are converted to base64 data URLs client-side via `processImageFile()` and stored directly in `localStorage`. Max dimension: 1280px, format: WebP with JPEG fallback. Storage soft limit is 5 MB.

### Import/export format

Export produces `devhub.projects` v1 JSON (envelope with `format`, `version`, `exported_at`, `projects[]` in snake_case). Import accepts: raw array, `{projects:[]}`, `{data:[]}`, `{rows:[]}` envelopes — both camelCase and snake_case field names.

## UI conventions

- Dark-first design (Vercel × Linear × Raycast aesthetic); theme via `next-themes`
- Fonts: Geist Sans + Geist Mono (`--font-geist-sans`, `--font-geist-mono`)
- Components: shadcn/ui (Radix UI primitives + Tailwind v4)
- Toasts: `sonner` via `<Toaster position="bottom-right" />`
- Keyboard shortcuts: `Cmd/Ctrl+K` focuses search, `Cmd/Ctrl+N` opens add dialog

## Known issues (from AUDIT.md)

1. **High**: Persistence is `localStorage` — quota-limited. Recommended migration: IndexedDB.
2. **High**: `ProjectDetail` is a large mixed-responsibility component; consider splitting into subcomponents.
