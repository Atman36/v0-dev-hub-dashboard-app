import { test } from 'node:test';
import assert from 'node:assert';
import { reducer } from './toast-reducer.ts';

test('reducer: ADD_TOAST adds a toast and respects limit', () => {
  const initialState = { toasts: [] };
  const toast1 = { id: '1', title: 'Toast 1', open: true };

  const state1 = reducer(initialState as any, { type: 'ADD_TOAST', toast: toast1 as any });
  assert.strictEqual(state1.toasts.length, 1);
  assert.strictEqual(state1.toasts[0].id, '1');

  const toast2 = { id: '2', title: 'Toast 2', open: true };
  const state2 = reducer(state1, { type: 'ADD_TOAST', toast: toast2 as any });

  // TOAST_LIMIT is 1 in toast-reducer.ts
  assert.strictEqual(state2.toasts.length, 1);
  assert.strictEqual(state2.toasts[0].id, '2');
});

test('reducer: UPDATE_TOAST updates existing toast', () => {
  const initialState = {
    toasts: [{ id: '1', title: 'Old Title', open: true }]
  };
  const action = {
    type: 'UPDATE_TOAST' as const,
    toast: { id: '1', title: 'New Title' }
  };

  const newState = reducer(initialState as any, action as any);
  assert.strictEqual(newState.toasts[0].title, 'New Title');
  assert.strictEqual(newState.toasts[0].id, '1');
});

test('reducer: UPDATE_TOAST does nothing if id does not match', () => {
  const initialState = {
    toasts: [{ id: '1', title: 'Old Title', open: true }]
  };
  const action = {
    type: 'UPDATE_TOAST' as const,
    toast: { id: '2', title: 'New Title' }
  };

  const newState = reducer(initialState as any, action as any);
  assert.strictEqual(newState.toasts[0].title, 'Old Title');
});

test('reducer: DISMISS_TOAST sets open to false', () => {
  const initialState = {
    toasts: [{ id: '1', title: 'Toast 1', open: true }]
  };

  // Test dismiss specific toast
  const state1 = reducer(initialState as any, { type: 'DISMISS_TOAST', toastId: '1' });
  assert.strictEqual(state1.toasts[0].open, false);

  // Test dismiss all
  const state2 = reducer(initialState as any, { type: 'DISMISS_TOAST' });
  assert.strictEqual(state2.toasts[0].open, false);
});

test('reducer: REMOVE_TOAST removes toast from state', () => {
  const initialState = {
    toasts: [
      { id: '1', title: 'Toast 1' },
      { id: '2', title: 'Toast 2' }
    ]
  };

  // Remove specific toast
  const state1 = reducer(initialState as any, { type: 'REMOVE_TOAST', toastId: '1' });
  assert.strictEqual(state1.toasts.length, 1);
  assert.strictEqual(state1.toasts[0].id, '2');

  // Remove all toasts
  const state2 = reducer(initialState as any, { type: 'REMOVE_TOAST' });
  assert.strictEqual(state2.toasts.length, 0);
});
