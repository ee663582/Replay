import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialState } from './capsule.ts'
import { STORAGE_KEY, clearRelayState, loadRelayState, saveRelayState } from './storage.ts'

const fallback = createInitialState('sample', [{ title: 'Decisions', icon: '✳', items: [] }])

test('persists and reloads a versioned state', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
  assert.deepEqual(saveRelayState(storage, fallback), { ok: true })
  assert.equal(JSON.parse(values.get(STORAGE_KEY)!).schemaVersion, 1)
  assert.deepEqual(loadRelayState(storage, fallback), fallback)
  assert.deepEqual(clearRelayState(storage), { ok: true })
  assert.equal(values.has(STORAGE_KEY), false)
})

test('uses the supplied fallback for malformed or unsupported saved data', () => {
  const malformed = { getItem: () => '{broken' }
  const unsupported = { getItem: () => JSON.stringify({ schemaVersion: 22, state: fallback }) }
  const invalidShape = { getItem: () => JSON.stringify({ schemaVersion: 1, state: { ...fallback, handoff: { revoked: 'nope' } } }) }
  assert.deepEqual(loadRelayState(malformed, fallback), fallback)
  assert.deepEqual(loadRelayState(unsupported, fallback), fallback)
  assert.deepEqual(loadRelayState(invalidShape, fallback), fallback)
})

test('reports blocked or unavailable storage instead of claiming a save', () => {
  assert.deepEqual(saveRelayState(undefined, fallback), { ok: false, reason: 'unavailable' })
  const blocked = { setItem: () => { throw new Error('blocked') } }
  assert.deepEqual(saveRelayState(blocked, fallback), { ok: false, reason: 'unknown' })
})
