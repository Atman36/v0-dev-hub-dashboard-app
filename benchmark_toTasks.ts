import { toTasks } from './lib/project-exchange.ts';

// Legacy implementation for reference
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toUnknownArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

function legacyToTask(value: Record<string, unknown>) {
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const text = typeof value.text === 'string' ? value.text.trim() : '';

  if (!id || !text) {
    return null;
  }

  return {
    id,
    text,
    isDone: typeof value.isDone === 'boolean' ? value.isDone : false,
  };
}

function legacyToTasks(value: unknown) {
  const items = toUnknownArray(value);
  const tasks = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!isRecord(item)) {
      continue;
    }

    const task = legacyToTask(item);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

// Generate mixed dataset
const dataset: unknown[] = [];
const NUM_ITEMS = 50_000;

for (let i = 0; i < NUM_ITEMS; i++) {
  const type = i % 6;
  if (type === 0) {
    // Valid task
    dataset.push({ id: `id-${i}`, text: `Text ${i}`, isDone: i % 2 === 0 });
  } else if (type === 1) {
    // Missing ID
    dataset.push({ text: `Text ${i}`, isDone: false });
  } else if (type === 2) {
    // Missing text
    dataset.push({ id: `id-${i}`, isDone: true });
  } else if (type === 3) {
    // Whitespace only
    dataset.push({ id: '   ', text: '\t\n  ' });
  } else if (type === 4) {
    // Non-object
    dataset.push(i % 2 === 0 ? null : 'just string');
  } else if (type === 5) {
    // Valid missing isDone
    dataset.push({ id: `id-${i}`, text: `Valid text ${i}` });
  }
}

// 1. Verify exact identical output
const legacyOutput = legacyToTasks(dataset);
const newOutput = toTasks(dataset);

// Simple deep equal logic (Node 20 test runner asserts not directly available here in simple script, doing manual check)
if (JSON.stringify(legacyOutput) !== JSON.stringify(newOutput)) {
  console.error("Mismatch in outputs!");
  console.log("Legacy:", legacyOutput.slice(0, 3));
  console.log("New   :", newOutput.slice(0, 3));
  process.exit(1);
}
console.log(`Outputs match! Processed ${legacyOutput.length} valid tasks from ${NUM_ITEMS} mixed items.`);

// 2. Measure performance (Warmup + Runs)
const ITERATIONS = 100;

console.log("Warming up...");
for (let i = 0; i < 10; i++) {
  legacyToTasks(dataset);
  toTasks(dataset);
}

console.log(`Running benchmark (${ITERATIONS} iterations)...`);

const startLegacy = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  legacyToTasks(dataset);
}
const endLegacy = performance.now();

const startNew = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toTasks(dataset);
}
const endNew = performance.now();

const timeLegacy = (endLegacy - startLegacy).toFixed(2);
const timeNew = (endNew - startNew).toFixed(2);

console.log(`Legacy time : ${timeLegacy}ms`);
console.log(`New time    : ${timeNew}ms`);
