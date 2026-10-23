import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleHelp, Copy, Eye, EyeOff, FileText, Link2, LockKeyhole, MessageCircle, MoreHorizontal, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import {
  changeDraft,
  createInitialState,
  isHandoffStale,
  isSourceCurrent,
  publishHandoff,
  refreshHandoff,
  resetDraft,
  reviewConversation,
  setHandoffRevoked,
  type CapsuleSection,
  type RelayState,
} from './domain/capsule'
import { loadRelayState, saveRelayState } from './domain/storage'
import RelayStory from './components/RelayStory'
import McpDemo from './components/McpDemo'

const seedText = `Maya: Let's plan the neighborhood repair café for Saturday, Nov 14.
Leo: We should keep it free and welcoming for beginners. No power tools this time; we'll focus on small clothing repairs and bike checks.
Maya: Great. I'll ask the library about using the covered courtyard. We need a rain plan by Wednesday.
Leo: I can bring sewing kits and the bike stand. Priya said she can help greet people, but only after 11.
Maya: Let's aim for 10am–1pm, cap it at 24 people, and use a sign-up sheet. We still need to confirm the venue and who brings tables.

[PRIVATE — exclude from shared capsule]
Maya: My phone number is 555-0198. I’m nervous about mentioning that I’ve been dealing with burnout lately.
Leo: Understood. I won’t bring it up.`

const initialSections: CapsuleSection[] = [
  { title: 'Decisions', icon: '✳', items: [{ id: '1', text: 'Free, beginner-friendly repair café' }, { id: '2', text: 'Focus on clothing repairs and bike checks; no power tools' }, { id: '3', text: 'Saturday, Nov 14, 10am–1pm; limit 24 attendees' }] },
  { title: 'Constraints', icon: '◈', items: [{ id: '4', text: 'Covered courtyard preferred; confirm library availability' }, { id: '5', text: 'Priya can greet guests only after 11am' }] },
  { title: 'Open questions', icon: '？', items: [{ id: '6', text: 'What is the rain plan?' }, { id: '7', text: 'Who will bring tables?' }] },
  { title: 'Next actions', icon: '↗', items: [{ id: '8', text: 'Maya: ask library about courtyard and rain plan by Wednesday', checked: false }, { id: '9', text: 'Leo: bring sewing kits and bike stand', checked: false }, { id: '10', text: 'Confirm tables and create sign-up sheet', checked: false }] },
]

type SaveStatus = 'saving' | 'saved' | 'unavailable' | 'failed'

function browserStorage(): Storage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage }
  catch { return undefined }
}

function initialState(): RelayState {
  const fallback = createInitialState(seedText, initialSections)
  return loadRelayState(browserStorage(), fallback)
}

export default function App() {
  const [state, setState] = useState(initialState)
  const [tab, setTab] = useState<'build' | 'recipient'>('build')
  const [notice, setNotice] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saving')
  const [showOriginal, setShowOriginal] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const total = useMemo(() => state.sections.reduce((count, section) => count + section.items.length, 0), [state.sections])
  const sourceCurrent = isSourceCurrent(state)
  const stale = isHandoffStale(state)
  const handoff = state.handoff

  useEffect(() => {
    const result = saveRelayState(browserStorage(), state)
    setSaveStatus(result.ok ? 'saved' : result.reason === 'unavailable' ? 'unavailable' : 'failed')
  }, [state])

  const toast = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }
  const updateItem = (id: string, text: string) => setState(previous => changeDraft(previous, { sections: previous.sections.map(section => ({ ...section, items: section.items.map(item => item.id === id ? { ...item, text } : item) })) }))
  const deleteItem = (id: string) => setState(previous => changeDraft(previous, { sections: previous.sections.map(section => ({ ...section, items: section.items.filter(item => item.id !== id) })) }))
  const addItem = (index: number) => setState(previous => changeDraft(previous, { sections: previous.sections.map((section, i) => i === index ? { ...section, items: [...section.items, { id: crypto.randomUUID(), text: 'Add a detail…' }] } : section) }))
  const toggleCheck = (id: string) => setState(previous => changeDraft(previous, { sections: previous.sections.map(section => ({ ...section, items: section.items.map(item => item.id === id ? { ...item, checked: !item.checked } : item) })) }))
  const extract = () => {
    setState(previous => reviewConversation(previous))
    toast(state.privacyFilterEnabled ? 'Context reviewed · marked private section excluded' : 'Context reviewed · privacy filter is off')
  }
  const publish = () => {
    if (!sourceCurrent) return
    setState(previous => publishHandoff(previous))
    setTab('recipient')
    toast(handoff ? `Handoff v${handoff.version + 1} published to ${state.audience}` : `Handoff published to ${state.audience}`)
  }
  const refreshCopy = () => setState(previous => refreshHandoff(previous))
  const revoke = () => setState(previous => setHandoffRevoked(previous, true))
  const restore = () => setState(previous => setHandoffRevoked(previous, false))
  const applyMcpExtraction = (sections: CapsuleSection[]) => {
    setState(previous => ({
      ...changeDraft(previous, { sections }),
      reviewedSourceSignature: `${previous.privacyFilterEnabled ? 'filtered' : 'unfiltered'}:${previous.conversation}`,
    }))
    toast('MCP extraction complete · review the capsule before creating a preview')
  }
  const copyPlaceholder = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText('relay.demo/capsule/repair-cafe')
      toast('Demo placeholder copied · this is not a shareable link')
    } catch {
      toast('Clipboard unavailable · no shareable link exists in this prototype')
    }
  }
  const openWorkspaceWith = (sections?: CapsuleSection[]) => {
    if (sections) setState(previous => changeDraft(previous, { sections }))
    setTab('build')
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    window.requestAnimationFrame(() => document.getElementById('relay-workspace')?.scrollIntoView({ behavior, block: 'start' }))
  }
  const saveLabel = saveStatus === 'saved' ? 'Saved in this browser' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unavailable' ? 'Browser storage unavailable' : 'Could not save · changes may be lost'

  return <div className="app-shell">
    <a className="skip-link" href="#relay-workspace">Skip to workspace</a>
    <header className="topbar"><a className="brand" href="#top" aria-label="Relay home"><span className="brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h8v16H4M12 12h4M16 4h4v16h-4M16 12h4"/><circle cx="14" cy="12" r="1.5"/></svg></span><span>relay<span className="brand-dot">.</span></span></a><nav className="site-nav" aria-label="Main navigation"><a href="#method">The method</a><a href="#boundaries">Privacy</a><a href="#continuity">Continuity</a></nav><div className="header-actions"><span className="demo-pill"><span className="pulse"/> CONCEPT / 001</span><button className="header-cta" onClick={() => openWorkspaceWith()}>Open workspace <ArrowUpRight size={14}/></button></div></header>
    <RelayStory onOpenWorkspace={openWorkspaceWith}/>
    <main className="workspace" id="relay-workspace">
      <div className="workspace-heading"><div><div className="eyebrow"><span className="eyebrow-mark"/> YOUR WORKSPACE / LOCAL DEMO</div><h2>Shape the handoff.</h2><p>Review what should travel before you create a recipient copy.</p></div><a href="#top" className="workspace-back">BACK TO THE STORY ↑</a></div>
      <div className="main-tabs"><button className={tab === 'build' ? 'selected' : ''} onClick={() => setTab('build')}><span className="tab-num">01</span> Build capsule</button><div className="tab-line"/><button className={tab === 'recipient' ? 'selected' : ''} onClick={() => setTab('recipient')}><span className="tab-num">02</span> Recipient view {handoff && <span className="live-dot"/>}</button><div className="tab-spacer"/><span className="autosave"><span className={saveStatus === 'saved' ? '' : 'save-warning'}/>{saveLabel}</span></div>
      {tab === 'build' ? <div className="columns">
        <section className="source-card panel"><div className="panel-head"><div className="panel-title"><span className="step-icon"><MessageCircle size={17}/></span><div><h2>Start with a conversation</h2><p>Paste a thread or use this sample.</p></div></div><button className="quiet-button" onClick={() => setState(previous => changeDraft(previous, { conversation: seedText }))}><RefreshCw size={14}/> Use sample</button></div><div className="input-wrap"><textarea value={state.conversation} onChange={event => setState(previous => changeDraft(previous, { conversation: event.target.value }))} aria-label="Conversation text"/><button className="source-toggle" onClick={() => setShowOriginal(!showOriginal)}>{showOriginal ? <Eye size={14}/> : <EyeOff size={14}/>} {showOriginal ? 'Original shown' : 'Preview'}</button></div><div className="private-banner"><LockKeyhole size={15}/><span><b>{state.privacyFilterEnabled ? 'Marked private section excluded' : 'Privacy filter off'}</b><small>{state.privacyFilterEnabled ? 'Only explicit [PRIVATE …] markers are recognized. Review before sharing.' : 'Private text may enter the extracted capsule.'}</small></span><button className={'switch ' + (state.privacyFilterEnabled ? 'on' : '')} onClick={() => setState(previous => changeDraft(previous, { privacyFilterEnabled: !previous.privacyFilterEnabled }))} aria-label="Toggle explicit private-section filter"><i/></button></div>{!sourceCurrent && <div className="source-warning"><CircleHelp size={14}/><span>Conversation or privacy settings changed. Extract and review again before publishing.</span></div>}<div className="extract-footer"><span><Sparkles size={14}/> {total} details in draft</span><button className="extract-button" onClick={extract}>Extract context <ArrowRight size={13}/></button></div></section>
        <section className="capsule-card panel"><div className="panel-head capsule-head"><div className="panel-title"><span className="step-icon violet"><FileText size={17}/></span><div><h2>Your handoff capsule</h2><p>Structured context that stays useful.</p></div></div><button className="more-button" onClick={() => setOpenMenu(!openMenu)} aria-label="More options"><MoreHorizontal size={19}/></button>{openMenu && <div className="menu"><button onClick={() => { setState(previous => resetDraft(previous, seedText, initialSections)); setOpenMenu(false) }}><RefreshCw size={14}/> Reset draft</button><button onClick={() => { setState(previous => changeDraft(previous, { sections: previous.sections.map(section => ({ ...section, items: [] })) })); setOpenMenu(false) }}><Trash2 size={14}/> Clear capsule</button></div>}</div>
          <div className="capsule-meta"><div className="meta-label">SHARING WITH</div><button className="audience-select" onClick={() => setState(previous => changeDraft(previous, { audience: previous.audience === 'Leo · planning team' ? 'Maya · event co-lead' : 'Leo · planning team' }))}>{state.audience}<ChevronDown size={15}/></button><span className="scope-note"><LockKeyhole size={12}/> This handoff only</span></div>
          <div className="sections">{state.sections.map((section, index) => <div className="section" key={section.title}><div className="section-head"><div className="section-name"><span>{section.icon}</span>{section.title}<span className="count">{section.items.length}</span></div><button className="add-button" onClick={() => addItem(index)} aria-label={`Add ${section.title} item`}><Plus size={14}/></button></div>{section.items.map(item => <div className="item-row" key={item.id}>{section.title === 'Next actions' && <button className={'check ' + (item.checked ? 'checked' : '')} onClick={() => toggleCheck(item.id)} aria-label={item.checked ? 'Mark action incomplete' : 'Mark action complete'}>{item.checked && <Check size={12}/>}</button>}<input value={item.text} onChange={event => updateItem(item.id, event.target.value)} aria-label={`${section.title} item`}/><button className="remove-item" onClick={() => deleteItem(item.id)} aria-label="Remove detail"><X size={14}/></button></div>)}</div>)}</div>
          <div className="share-footer"><div className="freshness"><span className="fresh-icon"><RefreshCw size={14}/></span><span><b>{handoff ? `Version ${handoff.version}${stale ? ' · update needed' : ''}` : 'Ready to share'}</b><small>{sourceCurrent ? 'Review each detail before publishing.' : 'Re-extract before publishing.'}</small></span></div><button className="primary-button" onClick={publish} disabled={!sourceCurrent}>{handoff ? 'Publish handoff' : 'Create handoff'} <ArrowRight size={16}/></button></div>
        </section>
      </div> : <div className="recipient-layout"><section className="recipient-card panel"><div className="recipient-banner"><div className="recipient-icon"><Link2 size={19}/></div><div><div className="eyebrow">A HANDOFF FROM MAYA</div><h2>Repair café · planning thread</h2></div><span className={'status-chip ' + (!handoff ? 'stale' : handoff.revoked ? 'revoked' : stale ? 'stale' : 'current')}>{!handoff ? 'Not shared' : handoff.revoked ? 'Revoked' : stale ? 'Out of date' : `Current · v${handoff.version}`}</span></div>{!handoff ? <div className="empty-state"><FileText size={28}/><h3>No handoff has been published</h3><p>Review the capsule and publish it to preview the recipient copy.</p><button className="secondary-button" onClick={() => setTab('build')}>Back to capsule</button></div> : handoff.revoked ? <div className="empty-state"><LockKeyhole size={28}/><h3>This handoff has been revoked</h3><p>The owner disabled this local demo handoff. Restoring it will expose this snapshot again.</p><button className="secondary-button" onClick={restore}>Restore this snapshot</button></div> : <><div className="recipient-info"><div><span>SHARED WITH</span><b>{handoff.recipient}</b></div><div><span>LAST UPDATED</span><b>{new Date(handoff.sharedAt).toLocaleString()}</b></div></div>{stale && <div className="stale-banner"><RefreshCw size={15}/><span><b>This copy is out of date.</b> The shared snapshot stays unchanged until refreshed.</span><button onClick={refreshCopy}>Refresh copy</button></div>}<div className="recipient-sections">{handoff.sections.map(section => <div key={section.title} className="recipient-section"><h3><span>{section.icon}</span>{section.title}</h3>{section.items.length ? section.items.map(item => <div className="recipient-item" key={item.id}>{section.title === 'Next actions' && <span className={'recipient-check ' + (item.checked ? 'done' : '')}>{item.checked && <Check size={11}/>}</span>}<span className={item.checked ? 'strike' : ''}>{item.text}</span></div>) : <p className="muted">Nothing here yet.</p>}</div>)}</div><div className="recipient-actions"><button className="secondary-button" onClick={copyPlaceholder}><Copy size={15}/> Copy demo placeholder</button><button className="secondary-button" onClick={() => setShowOriginal(!showOriginal)}><CircleHelp size={15}/> {showOriginal ? 'Hide source' : 'Why this context?'}</button><button className="text-button" onClick={() => setTab('build')}>Edit capsule</button></div>{showOriginal && <div className="explain-box"><b>Why this context?</b><p>Relay keeps decisions, constraints, unresolved questions, and next steps together so a handoff can start with shared understanding instead of another full conversation replay.</p></div>}</>}</section><aside className="recipient-aside"><div className="aside-illustration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-center"><ArrowDown size={24}/></div><div className="orbit-node node-a"><MessageCircle size={16}/></div><div className="orbit-node node-b"><FileText size={16}/></div></div><h3>Context, with boundaries.</h3><p>One useful slice moves forward. Private details stay in the original conversation.</p><div className="aside-rule"/>{handoff && <button className="revoke-button" onClick={handoff.revoked ? restore : revoke}>{handoff.revoked ? <RefreshCw size={15}/> : <X size={15}/>} {handoff.revoked ? 'Restore access' : 'Revoke this handoff'}</button>}<small>Browser-only demo · not secure multi-user access control</small></aside></div>}
      {tab === 'build' && <McpDemo
        conversation={state.conversation}
        excludePrivate={state.privacyFilterEnabled}
        recipient={state.audience}
        sections={state.sections}
        onExtracted={applyMcpExtraction}
      />}
      <div className="bottom-note"><span className="note-icon"><Sparkles size={14}/></span><span><b>Relay is a hackathon concept.</b> This prototype simulates an Alexa+ conversation handoff; it does not connect to Alexa+. The local MCP server can optionally use Amazon Bedrock when configured. Browser drafts are not secure multi-user sharing, and MCP handoffs are previews only.</span><button onClick={() => toast('Relay is a concept demo, not an Alexa+ integration')}>Learn more <ArrowRight size={13}/></button></div>
    </main>{notice && <div className="toast" role="status" aria-live="polite"><Check size={15}/>{notice}</div>}<footer className="footer"><div className="footer-signature"><span>RELAY <i>·</i> CONTEXT THAT TRAVELS WELL</span><small>Alexa+ concept experience · no live service connection</small></div><nav aria-label="Footer navigation"><a href="#top">Back to top ↑</a><a href="#relay-workspace">Workspace ↗</a></nav></footer>
  </div>
}
