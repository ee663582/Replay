import test from 'node:test'
import assert from 'node:assert/strict'
import {
  changeDraft,
  createInitialState,
  extractSections,
  isHandoffStale,
  isSourceCurrent,
  publishHandoff,
  refreshHandoff,
  reviewConversation,
  setHandoffRevoked,
  type CapsuleSection,
} from './capsule.ts'

const seedSections: CapsuleSection[] = [{ title: 'Decisions', icon: '✳', items: [{ id: '1', text: 'A decision' }] }]
const ids = () => { let i = 0; return () => `item-${++i}` }

test('extracts one reviewable category per line and excludes marked private material', () => {
  const source = [
    'Maya: We should keep the event free.',
    'Leo: Priya can help only after 11.',
    'Maya: Who will bring tables?',
    'Leo: I can bring sewing kits.',
    '[PRIVATE — exclude this section]',
    'Maya: I will bring private phone 555-0198.',
  ].join('\n')
  const sections = extractSections(source, true, ids())
  assert.equal(sections.find(section => section.title === 'Decisions')?.items.length, 1)
  assert.equal(sections.find(section => section.title === 'Constraints')?.items.length, 1)
  assert.equal(sections.find(section => section.title === 'Open questions')?.items.length, 1)
  assert.equal(sections.find(section => section.title === 'Next actions')?.items.length, 1)
  assert.equal(JSON.stringify(sections).includes('555-0198'), false)
})

test('private marker filtering is explicit and disabling it can expose matching private lines', () => {
  const source = '[PRIVATE — private]\nMaya: I will bring phone 555-0198'
  const hidden = extractSections(source, true, ids())
  const visible = extractSections(source, false, ids())
  assert.equal(hidden.flatMap(section => section.items).length, 0)
  assert.equal(JSON.stringify(visible).includes('555-0198'), true)
})

test('source changes require review and every draft mutation increments revision', () => {
  const initial = createInitialState('Maya: We should meet.', seedSections)
  assert.equal(isSourceCurrent(initial), true)
  const edited = changeDraft(initial, { conversation: 'Maya: We should meet Tuesday.' })
  assert.equal(edited.revision, initial.revision + 1)
  assert.equal(isSourceCurrent(edited), false)
  const reviewed = reviewConversation(edited, ids())
  assert.equal(isSourceCurrent(reviewed), true)
  assert.equal(reviewed.sections[0].items[0].text, 'We should meet Tuesday')
})

test('handoff snapshots capture recipient and content and remain stale until refreshed', () => {
  const base = createInitialState('source', seedSections)
  const published = publishHandoff(base, '2026-10-23T00:00:00.000Z')
  assert.equal(published.handoff?.recipient, 'Leo · planning team')
  assert.equal(published.handoff?.version, 1)
  const changed = changeDraft(published, { audience: 'Maya · event co-lead', sections: [{ ...seedSections[0], items: [{ id: '1', text: 'Updated decision' }] }] })
  assert.equal(isHandoffStale(changed), true)
  assert.equal(changed.handoff?.recipient, 'Leo · planning team')
  assert.equal(changed.handoff?.sections[0].items[0].text, 'A decision')
  const refreshed = refreshHandoff(changed, '2026-10-24T00:00:00.000Z')
  assert.equal(isHandoffStale(refreshed), false)
  assert.equal(refreshed.handoff?.recipient, 'Maya · event co-lead')
  assert.equal(refreshed.handoff?.version, 2)
})

test('editing does not silently restore a revoked handoff; explicit publish does', () => {
  const published = publishHandoff(createInitialState('source', seedSections))
  const revoked = setHandoffRevoked(published, true)
  const edited = changeDraft(revoked, { sections: [] })
  assert.equal(edited.handoff?.revoked, true)
  assert.equal(isHandoffStale(edited), true)
  assert.equal(publishHandoff(edited).handoff?.revoked, false)
})
