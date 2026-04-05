import assert from 'node:assert';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';

import { toTasks } from './lib/project-exchange.ts';

const ImportedTaskSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  isDone: z.boolean(),
});

type Task = z.infer<typeof ImportedTaskSchema>;

const ITEM_COUNT = 50_000;
const ITERATIONS = 250;
const WARMUP_RUNS = 25;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function legacyToTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const parsed = ImportedTaskSchema.safeParse({
        id: item.id,
        text: item.text,
        isDone: typeof item.isDone === 'boolean' ? item.isDone : false,
      });

      if (!parsed.success) {
        return null;
      }

      return parsed.data;
    })
    .filter((item): item is Task => item !== null);
}

function buildDataset(): unknown[] {
  return Array.from({ length: ITEM_COUNT }, (_, index) => {
    if (index % 9 === 0) {
      return { text: `missing-id-${index}` };
    }

    if (index % 11 === 0) {
      return null;
    }

    if (index % 13 === 0) {
      return `not-an-object-${index}`;
    }

    return {
      id: `task-${index}`,
      text: `Task ${index}`,
      isDone: index % 2 === 0,
      ignored: { index },
    };
  });
}

function benchmark(label: string, fn: (value: unknown) => Task[], dataset: unknown) {
  for (let run = 0; run < WARMUP_RUNS; run += 1) {
    fn(dataset);
  }

  const startedAt = performance.now();
  let totalTasks = 0;

  for (let run = 0; run < ITERATIONS; run += 1) {
    totalTasks += fn(dataset).length;
  }

  const totalMs = performance.now() - startedAt;

  return {
    label,
    totalMs,
    avgMs: totalMs / ITERATIONS,
    totalTasks,
  };
}

const dataset = buildDataset();
const legacyResult = legacyToTasks(dataset);
const currentResult = toTasks(dataset);

assert.deepStrictEqual(currentResult, legacyResult);

const legacyStats = benchmark('legacy map/filter', legacyToTasks, dataset);
const currentStats = benchmark('current single-pass', toTasks, dataset);
const improvementMs = legacyStats.avgMs - currentStats.avgMs;
const improvementPct = (improvementMs / legacyStats.avgMs) * 100;

console.log(`Dataset size: ${ITEM_COUNT.toLocaleString()} items`);
console.log(`Iterations: ${ITERATIONS}`);
console.log(
  `${legacyStats.label}: total=${legacyStats.totalMs.toFixed(2)}ms avg=${legacyStats.avgMs.toFixed(3)}ms`,
);
console.log(
  `${currentStats.label}: total=${currentStats.totalMs.toFixed(2)}ms avg=${currentStats.avgMs.toFixed(3)}ms`,
);
console.log(
  `Improvement: ${improvementMs.toFixed(3)}ms per run (${improvementPct.toFixed(2)}%)`,
);
