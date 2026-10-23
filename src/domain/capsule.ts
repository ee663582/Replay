export type CapsuleItem = { id: string; text: string; checked?: boolean }
export type CapsuleSection = { title: string; icon: string; items: CapsuleItem[] }
export type Recipient = 'Leo · planning team' | 'Maya · event co-lead'

export type HandoffSnapshot = {
  version: number
  sharedAt: string
  sourceRevision: number
  recipient: Recipient
  sections: CapsuleSection[]
  revoked: boolean
}

export type RelayState = {
  conversation: string
  sections: CapsuleSection[]
  privacyFilterEnabled: boolean
  audience: Recipient
  revision: number
  reviewedSourceSignature: string
  handoff: HandoffSnapshot | null
}

export const PRIVATE_MARKER = /^\s*\[PRIVATE[^\]]*\]\s*$/i

export function sourceSignature(conversation: string, privacyFilterEnabled: boolean) {
  return `${privacyFilterEnabled ? 'filtered' : 'unfiltered'}:${conversation}`
}

export function isSourceCurrent(state: RelayState) {
  return state.reviewedSourceSignature === sourceSignature(state.conversation, state.privacyFilterEnabled)
}

export function isHandoffStale(state: RelayState) {
  return Boolean(state.handoff && state.revision !== state.handoff.sourceRevision)
}

export function cloneSections(sections: CapsuleSection[]): CapsuleSection[] {
  return sections.map(section => ({ ...section, items: section.items.map(item => ({ ...item })) }))
}

export function visibleConversation(text: string, excludePrivate: boolean) {
  if (!excludePrivate) return text
  const lines: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (PRIVATE_MARKER.test(line)) break
    lines.push(line)
  }
  return lines.join('\n')
}

type SectionTitle = CapsuleSection['title']

function classifyLine(line: string): SectionTitle | null {
  if (/\?|^(who|what|when|where|why|how)\b|\b(still need to confirm|need to decide|what if)\b/i.test(line)) return 'Open questions'
  if (/\b(i['’]ll|i can|we need to|will bring|ask the|confirm|create|bring)\b/i.test(line)) return 'Next actions'
  if (/\b(only|can['’]t|cannot|no\s|must|prefer|available|after\s+\d|before\s+\w+|by\s+\w+)\b/i.test(line)) return 'Constraints'
  if (/\b(let['’]s|we should|we['’]ll|aim for|decided|agree|keep it|focus on|limit|cap it)\b/i.test(line)) return 'Decisions'
  return null
}

export function extractSections(
  conversation: string,
  excludePrivate: boolean,
  makeId: () => string = () => crypto.randomUUID(),
): CapsuleSection[] {
  const result: CapsuleSection[] = [
    { title: 'Decisions', icon: '✳', items: [] },
    { title: 'Constraints', icon: '◈', items: [] },
    { title: 'Open questions', icon: '？', items: [] },
    { title: 'Next actions', icon: '↗', items: [] },
  ]
  const byTitle = new Map(result.map(section => [section.title, section]))
  const seen = new Set<string>()
  for (const rawLine of visibleConversation(conversation, excludePrivate).split(/\r?\n/)) {
    const line = rawLine.replace(/^[^:]{1,40}:\s*/, '').trim().replace(/[.!?]+$/, '').trim()
    if (!line || PRIVATE_MARKER.test(line) || seen.has(line.toLowerCase())) continue
    const category = classifyLine(line)
    if (!category) continue
    byTitle.get(category)?.items.push({ id: makeId(), text: line, ...(category === 'Next actions' ? { checked: false } : {}) })
    seen.add(line.toLowerCase())
  }
  return result
}

export function createInitialState(conversation: string, sections: CapsuleSection[]): RelayState {
  const cloned = cloneSections(sections)
  return {
    conversation,
    sections: cloned,
    privacyFilterEnabled: true,
    audience: 'Leo · planning team',
    revision: 0,
    reviewedSourceSignature: sourceSignature(conversation, true),
    handoff: null,
  }
}

export function changeDraft(state: RelayState, updates: Partial<Pick<RelayState, 'conversation' | 'sections' | 'privacyFilterEnabled' | 'audience'>>): RelayState {
  return { ...state, ...updates, revision: state.revision + 1 }
}

export function reviewConversation(state: RelayState, makeId?: () => string): RelayState {
  const sections = extractSections(state.conversation, state.privacyFilterEnabled, makeId)
  return {
    ...state,
    sections,
    revision: state.revision + 1,
    reviewedSourceSignature: sourceSignature(state.conversation, state.privacyFilterEnabled),
  }
}

export function publishHandoff(state: RelayState, now = new Date().toISOString()): RelayState {
  return {
    ...state,
    handoff: {
      version: (state.handoff?.version ?? 0) + 1,
      sharedAt: now,
      sourceRevision: state.revision,
      recipient: state.audience,
      sections: cloneSections(state.sections),
      revoked: false,
    },
  }
}

export function setHandoffRevoked(state: RelayState, revoked: boolean): RelayState {
  if (!state.handoff) return state
  return { ...state, handoff: { ...state.handoff, revoked } }
}

export function refreshHandoff(state: RelayState, now = new Date().toISOString()): RelayState {
  if (!state.handoff) return state
  return {
    ...state,
    handoff: {
      ...state.handoff,
      version: state.handoff.version + 1,
      sharedAt: now,
      sourceRevision: state.revision,
      recipient: state.audience,
      sections: cloneSections(state.sections),
      revoked: false,
    },
  }
}

export function resetDraft(state: RelayState, conversation: string, sections: CapsuleSection[]): RelayState {
  const reset = changeDraft(state, {
    conversation,
    sections: cloneSections(sections),
    privacyFilterEnabled: true,
    audience: 'Leo · planning team',
  })
  return { ...reset, reviewedSourceSignature: sourceSignature(conversation, true) }
}
