import assert from 'node:assert'
import { test } from 'node:test'
import { reducer } from './toast-reducer.ts'

test('reducer: ADD_TOAST adds a toast and respects limit', () => {
  const initialState = { toasts: [] }
  const toast1 = { id: '1', title: 'Toast 1', open: true }

  const state1 = reducer(initialState as any, { type: 'ADD_TOAST', toast: toast1 as any })
  assert.strictEqual(state1.toasts.length, 1)
  assert.strictEqual(state1.toasts[0].id, '1')

  const toast2 = { id: '2', title: 'Toast 2', open: true }
  const state2 = reducer(state1, { type: 'ADD_TOAST', toast: toast2 as any })

  assert.strictEqual(state2.toasts.length, 1)
  assert.strictEqual(state2.toasts[0].id, '2')
})

test('reducer: UPDATE_TOAST updates existing toast', () => {
  const initialState = {
    toasts: [{ id: '1', title: 'Old Title', open: true }],
  }

  const nextState = reducer(initialState as any, {
    type: 'UPDATE_TOAST',
    toast: { id: '1', title: 'New Title' },
  } as any)

  assert.strictEqual(nextState.toasts[0].title, 'New Title')
  assert.strictEqual(nextState.toasts[0].id, '1')
})

test('reducer: UPDATE_TOAST leaves state unchanged for missing toast id', () => {
  const initialState = {
    toasts: [{ id: '1', title: 'Old Title', open: true }],
  }

  const nextState = reducer(initialState as any, {
    type: 'UPDATE_TOAST',
    toast: { id: '2', title: 'New Title' },
  } as any)

  assert.strictEqual(nextState.toasts[0].title, 'Old Title')
})

test('reducer: DISMISS_TOAST closes one or all toasts', () => {
  const initialState = {
    toasts: [
      { id: '1', title: 'Toast 1', open: true },
      { id: '2', title: 'Toast 2', open: true },
    ],
  }

  const dismissedOne = reducer(initialState as any, { type: 'DISMISS_TOAST', toastId: '1' } as any)
  assert.strictEqual(dismissedOne.toasts[0].open, false)
  assert.strictEqual(dismissedOne.toasts[1].open, true)

  const dismissedAll = reducer(initialState as any, { type: 'DISMISS_TOAST' } as any)
  assert.strictEqual(dismissedAll.toasts[0].open, false)
  assert.strictEqual(dismissedAll.toasts[1].open, false)
})

test('reducer: REMOVE_TOAST removes one or all toasts', () => {
  const initialState = {
    toasts: [
      { id: '1', title: 'Toast 1' },
      { id: '2', title: 'Toast 2' },
    ],
  }

  const removedOne = reducer(initialState as any, { type: 'REMOVE_TOAST', toastId: '1' } as any)
  assert.deepStrictEqual(removedOne.toasts.map((toast: any) => toast.id), ['2'])

  const removedAll = reducer(initialState as any, { type: 'REMOVE_TOAST' } as any)
  assert.strictEqual(removedAll.toasts.length, 0)
})
