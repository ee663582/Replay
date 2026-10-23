import type { RelayState } from './capsule'
import { createInitialState } from './capsule.ts'

export const STORAGE_KEY = 'relay.state.v1'
export const STORAGE_SCHEMA_VERSION = 1

export type StorageResult = { ok: true } | { ok: false; reason: 'unavailable' | 'quota' | 'unknown' }

export function loadRelayState(storage: Pick<Storage, 'getItem'> | undefined, fallback: RelayState): RelayState {
  if (!storage) return fallback
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as { schemaVersion?: number; state?: RelayState }
    if (parsed.schemaVersion !== STORAGE_SCHEMA_VERSION || !isValidState(parsed.state)) return fallback
    return parsed.state
  } catch {
    return fallback
  }
}

export function saveRelayState(storage: Pick<Storage, 'setItem'> | undefined, state: RelayState): StorageResult {
  if (!storage) return { ok: false, reason: 'unavailable' }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, state }))
    return { ok: true }
  } catch (error) {
    const isQuota = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    return { ok: false, reason: isQuota ? 'quota' : 'unknown' }
  }
}

export function clearRelayState(storage: Pick<Storage, 'removeItem'> | undefined): StorageResult {
  if (!storage) return { ok: false, reason: 'unavailable' }
  try {
    storage.removeItem(STORAGE_KEY)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'unknown' }
  }
}

function isValidState(value: unknown): value is RelayState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<RelayState>
  return typeof state.conversation === 'string'
    && isValidSections(state.sections)
    && typeof state.privacyFilterEnabled === 'boolean'
    && isRecipient(state.audience)
    && Number.isSafeInteger(state.revision) && state.revision! >= 0
    && typeof state.reviewedSourceSignature === 'string'
    && (state.handoff === null || isValidHandoff(state.handoff))
}

function isRecipient(value: unknown): value is RelayState['audience'] {
  return value === 'Leo · planning team' || value === 'Maya · event co-lead'
}

function isValidSections(value: unknown): value is RelayState['sections'] {
  if (!Array.isArray(value)) return false
  return value.every(section => section && typeof section === 'object'
    && typeof section.title === 'string'
    && typeof section.icon === 'string'
    && Array.isArray(section.items)
    && section.items.every((item: unknown) => item && typeof item === 'object'
      && typeof (item as { id?: unknown }).id === 'string'
      && typeof (item as { text?: unknown }).text === 'string'
      && ((item as { checked?: unknown }).checked === undefined || typeof (item as { checked?: unknown }).checked === 'boolean')))
}

function isValidHandoff(value: unknown): value is NonNullable<RelayState['handoff']> {
  if (!value || typeof value !== 'object') return false
  const handoff = value as Partial<NonNullable<RelayState['handoff']>>
  return Number.isSafeInteger(handoff.version) && handoff.version! > 0
    && typeof handoff.sharedAt === 'string'
    && Number.isSafeInteger(handoff.sourceRevision) && handoff.sourceRevision! >= 0
    && isRecipient(handoff.recipient)
    && isValidSections(handoff.sections)
    && typeof handoff.revoked === 'boolean'
}

export function emptyFallback(conversation: string, sections: RelayState['sections']) {
  return createInitialState(conversation, sections)
}
