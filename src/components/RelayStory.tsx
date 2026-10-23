import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, LockKeyhole, RotateCcw, Sparkles } from 'lucide-react'
import type { CapsuleSection } from '../domain/capsule'

type Fragment = { id: string; section: string; text: string; label: string }
const fragments: Fragment[] = [
  { id: 'decision', section: 'Decisions', label: 'DECISION', text: 'Keep it free and welcoming for beginners' },
  { id: 'constraint', section: 'Constraints', label: 'BOUNDARY', text: 'No power tools; clothing repairs + bike checks' },
  { id: 'question', section: 'Open questions', label: 'OPEN', text: 'What is the rain plan?' },
  { id: 'action', section: 'Next actions', label: 'NEXT STEP', text: 'Maya · ask the library by Wednesday' },
]

const sectionMeta = [
  { title: 'Decisions', icon: '✳' },
  { title: 'Constraints', icon: '◈' },
  { title: 'Open questions', icon: '？' },
  { title: 'Next actions', icon: '↗' },
]

function SceneReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node?.classList.add('scene-visible')
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.classList.add('scene-visible')
        observer.disconnect()
      }
    }, { threshold: 0.16 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`scene-reveal ${className}`}>{children}</div>
}

export default function RelayStory({ onOpenWorkspace }: { onOpenWorkspace: (sections: CapsuleSection[]) => void }) {
  const [selected, setSelected] = useState<string[]>(fragments.map(fragment => fragment.id))
  const [privateHeld, setPrivateHeld] = useState(true)
  const [snapshotUpdated, setSnapshotUpdated] = useState(false)

  const selectedFragments = fragments.filter(fragment => selected.includes(fragment.id))
  const makeSections = (): CapsuleSection[] => sectionMeta.map(meta => ({
    ...meta,
    items: selectedFragments.filter(fragment => fragment.section === meta.title).map((fragment, index) => ({
      id: `hero-${fragment.id}-${index}`,
      text: fragment.text,
      ...(meta.title === 'Next actions' ? { checked: false } : {}),
    })),
  }))

  const toggle = (id: string) => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])

  return <>
    <section className="hero-scene" id="top" aria-labelledby="hero-title">
      <div className="hero-grid" aria-hidden="true"/>
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-mark"/> A SMALLER WAY TO CARRY A CONVERSATION</div>
        <h1 id="hero-title">The thread can<br/>stay <em>behind.</em></h1>
        <p className="hero-deck">Relay turns a long conversation into the few things another person actually needs: decisions, boundaries, open questions, and the next move.</p>
        <div className="hero-actions"><button className="hero-primary" onClick={() => onOpenWorkspace(makeSections())}>Shape a handoff <ArrowRight size={16}/></button><a className="hero-secondary" href="#method">See how it travels <ArrowDown size={14}/></a></div>
        <div className="hero-footnote"><span className="mono">01 / 03</span><span>A CONVERSATION, EDITED WITH INTENT</span></div>
      </div>

      <div className="hero-art" aria-label="Interactive conversation selection and handoff preview">
        <div className="art-topline"><span>FIELD NOTE 001</span><span>REPAIR CAFÉ · PLANNING THREAD</span><span>LOCAL DEMO</span></div>
        <div className="flow-stage">
          <div className="thread-column">
            <div className="thread-heading"><span className="mono">SOURCE / 06 LINES</span><span className="thread-live"><i/> LIVE SELECTION</span></div>
            <div className="thread-lines">
              {fragments.map((fragment, index) => <button key={fragment.id} className={`thread-fragment ${selected.includes(fragment.id) ? 'is-selected' : ''}`} aria-pressed={selected.includes(fragment.id)} onClick={() => toggle(fragment.id)}>
                <span className="fragment-index">0{index + 1}</span><span className="fragment-body"><span className="fragment-speaker">{index % 2 ? 'LEO' : 'MAYA'} <span>· {fragment.label}</span></span><span>{fragment.text}</span></span><span className="fragment-toggle">{selected.includes(fragment.id) ? <Check size={13}/> : <span>+</span>}</span>
              </button>)}
              <div className="private-fragment"><span className="fragment-index">••</span><span className="private-rule"/><LockKeyhole size={12}/><span>PERSONAL DETAIL <b>STAYS HERE</b></span></div>
            </div>
            <div className="thread-caption">Select a line to decide what moves forward.</div>
          </div>
          <div className="route-column" aria-hidden="true">
            <svg viewBox="0 0 156 400" preserveAspectRatio="none">
              <path className={`route-path route-one ${selected.includes('decision') ? 'route-active' : ''}`} d="M0 70 C72 70 60 86 156 86"/>
              <path className={`route-path route-two ${selected.includes('constraint') ? 'route-active' : ''}`} d="M0 154 C70 154 74 158 156 158"/>
              <path className={`route-path route-three ${selected.includes('question') ? 'route-active' : ''}`} d="M0 238 C66 238 80 230 156 230"/>
              <path className={`route-path route-four ${selected.includes('action') ? 'route-active' : ''}`} d="M0 322 C62 322 77 306 156 306"/>
              <path className="route-spine" d="M78 10 V370"/>
              <circle cx="78" cy="86" r="4"/><circle cx="78" cy="158" r="4"/><circle cx="78" cy="230" r="4"/><circle cx="78" cy="306" r="4"/>
            </svg>
            <span className="route-label">CHOOSE<br/>WHAT CROSSES</span>
          </div>
          <div className="capsule-column">
            <div className="capsule-paper">
              <div className="paper-corner">R / 01</div>
              <div className="paper-brand"><span className="relay-glyph">r</span><span>RELAY<br/><small>HANDOFF NOTE</small></span></div>
              <div className="paper-rule"/>
              <div className="paper-title">Repair café<br/><em>Saturday, Nov 14</em></div>
              <div className="paper-sections">
                {selectedFragments.length ? selectedFragments.map(fragment => <div className="paper-item" key={fragment.id}><span>{fragment.label}</span><b>{fragment.text}</b></div>) : <div className="paper-empty">Your selection<br/>will appear here.</div>}
              </div>
              <div className="paper-bottom"><span><LockKeyhole size={11}/> SCOPED TO ONE HANDOFF</span><span>{selectedFragments.length.toString().padStart(2, '0')} / 04</span></div>
            </div>
            <div className="capsule-side-note"><span className="side-note-mark">↳</span><span>Not a transcript.<br/><b>A useful beginning.</b></span></div>
          </div>
        </div>
        <div className="art-bottomline"><span>FIG. 01 — CONTEXT SELECTED, NOT FORWARDED</span><span>INTERACTIVE · TRY A LINE <span className="little-arrow">↗</span></span></div>
      </div>
      <a className="scroll-cue" href="#method"><span className="scroll-stem"/>SCROLL TO FOLLOW THE THREAD</a>
    </section>

    <section className="method-scene" id="method">
      <SceneReveal className="method-heading">
        <div className="eyebrow"><span className="eyebrow-mark"/> THE HANDOFF IS A CHOICE</div>
        <h2>Less retelling.<br/><em>More continuation.</em></h2>
        <p>Most conversations contain a lot of context and only a little that needs to travel. Relay makes that edit visible.</p>
      </SceneReveal>
      <SceneReveal className="method-plate">
        <div className="plate-top"><span>THE THREAD, UNFOLDED</span><span>SCHEMATIC / A</span></div>
        <div className="unfold-visual" role="img" aria-label="A conversation condenses into four handoff sections">
          <div className="unfold-mass"><span className="mass-label">THE WHOLE THREAD</span><div className="mass-lines"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><span className="mass-end">16:42 · 84 MESSAGES</span></div>
          <svg className="unfold-routes" viewBox="0 0 420 250" aria-hidden="true"><path d="M0 26 C125 26 112 40 220 40 L420 40"/><path d="M0 83 C125 83 112 96 220 96 L420 96"/><path d="M0 140 C125 140 112 153 220 153 L420 153"/><path d="M0 197 C125 197 112 210 220 210 L420 210"/><path className="route-faint" d="M0 0 C122 0 134 125 220 125 M0 55 C122 55 134 125 220 125 M0 111 C122 111 134 125 220 125 M0 168 C122 168 134 125 220 125 M0 226 C122 226 134 125 220 125"/></svg>
          <div className="unfold-gate"><span>REVIEW<br/>+ SCOPE</span><div className="gate-line"/><span>YOU DECIDE<br/>WHAT LEAVES</span></div>
          <div className="unfold-output">{sectionMeta.map((meta, index) => <div className="output-row" key={meta.title}><span>0{index + 1}</span><b>{meta.title}</b><i>{meta.icon}</i></div>)}</div>
        </div>
        <div className="plate-bottom"><span>RAW CONTEXT</span><span className="plate-arrow">→</span><span>CURATED CAPSULE</span><span className="plate-note">The useful parts keep their shape.</span></div>
      </SceneReveal>
      <div className="method-index"><span>01 — DISTILL</span><span>02 — RESPECT THE EDGE</span><span>03 — KEEP IT CURRENT</span></div>
    </section>

    <section className="boundary-scene" id="boundaries">
      <div className="boundary-copy"><SceneReveal><div className="eyebrow"><span className="eyebrow-mark"/> A BOUNDARY IS PART OF THE DESIGN</div><h2>Some things<br/>belong <em>here.</em></h2><p>The sender reviews every detail. Relay’s demo filter recognizes explicit private markers, then keeps that material out of the handoff. In this prototype, the boundary is visible and reviewable.</p><button className="boundary-toggle" aria-pressed={privateHeld} onClick={() => setPrivateHeld(!privateHeld)}><span className={`toggle-track ${privateHeld ? 'toggle-on' : ''}`}><i/></span>{privateHeld ? 'Private section held back' : 'Filter off · private text visible'}</button></SceneReveal></div>
      <SceneReveal className="boundary-art">
        <div className="boundary-label"><span>BOUNDARY STUDY / 02</span><span>{privateHeld ? 'FILTER ENGAGED' : 'FILTER DISABLED'}</span></div>
        <div className={`boundary-sheet ${privateHeld ? 'boundary-safe' : 'boundary-open'}`}>
          <div className="boundary-carry"><span className="zone-index">A / TRAVELS</span><strong>Next step</strong><p>Ask the library about the covered courtyard.</p><span className="zone-tick"><Check size={13}/></span></div>
          <div className="boundary-divider"><span>{privateHeld ? 'PERSONAL CONTEXT STAYS IN SOURCE' : 'FILTER IS OFF'}</span><div className="divider-rail"><i/></div><LockKeyhole size={16}/></div>
          <div className="boundary-held"><span className="zone-index">B / SOURCE ONLY</span><div className="held-text"><strong>Maya’s phone number · 555-0198</strong><i/><i/><i/></div><span className="held-tag">{privateHeld ? 'WITHHELD' : 'EXPOSED IN DEMO'}</span></div>
        </div>
        <div className="boundary-foot"><span>PRIVACY RULE</span><p>{privateHeld ? 'Explicit marker detected. This is not general sensitive-data detection.' : 'Turn the filter back on before continuing.'}</p></div>
      </SceneReveal>
    </section>

    <section className="continuity-scene" id="continuity">
      <SceneReveal className="continuity-title"><div className="eyebrow"><span className="eyebrow-mark"/> CONTINUITY, NOT A COPY</div><h2>A handoff should<br/>remember <em>what was sent.</em></h2><p>When the source changes, the recipient’s copy doesn’t quietly rewrite itself. The next version is visible—and refresh is a deliberate action.</p></SceneReveal>
      <SceneReveal className="version-demo">
        <div className="version-header"><span>RELAY / VERSION HISTORY</span><span>LOCAL INTERACTION STUDY</span></div>
        <div className="version-line"><div className="version-dot active-dot"/><div className="version-card"><span>V01 · SHARED</span><b>Rain plan: confirm with the library</b><small>Sent to Leo · 10:24</small></div><div className="version-connector"/><div className={`version-dot ${snapshotUpdated ? 'active-dot' : 'pending-dot'}`}/><div className={`version-card ${snapshotUpdated ? 'version-current' : 'version-pending'}`}><span>{snapshotUpdated ? 'V02 · REFRESHED' : 'DRAFT CHANGE'}</span><b>Rain plan: covered hall is confirmed</b><small>{snapshotUpdated ? 'New copy sent · 10:31' : 'Not in recipient copy yet'}</small></div></div>
        <div className="version-controls"><span className="version-status"><i className={snapshotUpdated ? 'status-fresh' : 'status-stale'}/>{snapshotUpdated ? 'Recipient copy is current' : 'Recipient copy is out of date'}</span><button aria-pressed={snapshotUpdated} onClick={() => setSnapshotUpdated(!snapshotUpdated)}>{snapshotUpdated ? <><RotateCcw size={14}/> Reset example</> : <>Refresh the copy <ArrowRight size={14}/></>}</button></div>
      </SceneReveal>
    </section>

    <section className="closing-scene">
      <div className="closing-rule"><span>RELAY / FIELD GUIDE</span><span>THE THREAD ENDS. THE WORK CONTINUES.</span></div>
      <SceneReveal className="closing-content"><div className="closing-glyph"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M13 20h28v60H13M41 50h20M61 20h26v60H61M61 50h26"/><circle cx="50" cy="50" r="4"/></svg></div><div><div className="eyebrow"><span className="eyebrow-mark"/> READY WHEN YOU ARE</div><h2>Make the next<br/>conversation <em>start further in.</em></h2><p>Build a capsule you would be glad to receive.</p><button className="hero-primary" onClick={() => onOpenWorkspace(makeSections())}>Open the Relay workspace <ArrowUpRight size={16}/></button></div></SceneReveal>
      <div className="closing-stamp"><Sparkles size={15}/><span>THE RIGHT CONTEXT<br/><b>IN THE RIGHT HANDS</b></span></div>
    </section>
  </>
}
