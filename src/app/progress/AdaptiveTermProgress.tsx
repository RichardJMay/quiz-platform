import { termEvidence, type AdaptiveSessionRecord, type AdaptiveTrialRecord } from './adaptive-progress'

export type TermRow = { id: string; term_text: string }
export type TermState = { term_id: string; certified_at: string | null }

export function AdaptiveTermProgress({ terms, states, sessions, trials, unlocked }: {
  terms: TermRow[]
  states: TermState[]
  sessions: AdaptiveSessionRecord[]
  trials: AdaptiveTrialRecord[]
  unlocked: boolean
}) {
  const certified = new Set(states.filter(row => row.certified_at).map(row => row.term_id))
  const completed = new Set(sessions.filter(row => row.status === 'completed').map(row => row.id))
  const evidence = termEvidence(trials, completed)
  const ready = terms.filter(row => certified.has(row.id)).length
  return <section className="bl-trajectory-panel bl-term-panel" aria-label="Term readiness">
    <div className="bl-panel-heading"><div>
      <p className="bl-kicker">Term readiness</p><h2>{ready} of {terms.length} terms ready</h2>
    </div></div>
    <p>Each term needs correct answers without help in two completed sets. A later incorrect answer means it needs another check. Supported answers still help you practise.</p>
    {unlocked && <p className="bl-term-unlocked">Timed practice is unlocked for this pack.</p>}
    <div className="bl-term-list">
      {terms.map(term => {
        const item = evidence.get(term.id)
        const count = Math.min(2, item?.sessions.size ?? 0)
        const isReady = certified.has(term.id)
        return <div key={term.id} className={isReady ? 'is-ready' : ''}>
          <span>{term.term_text}</span>
          <strong>{isReady ? 'Ready' : item?.latestCorrect === false && count === 2 ? 'Check again' : `${count}/2 checks`}</strong>
        </div>
      })}
    </div>
    <p className="bl-chart-note">Readiness uses completed independent checks; set scores may include different terms and help levels.</p>
  </section>
}
