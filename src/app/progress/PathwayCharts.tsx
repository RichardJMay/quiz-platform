import { completedAttempts, dayKey, type CumulativePoint, type ProgressAttempt } from './progress-records'

const W = 920
const H = 310
const M = { left: 64, right: 28, top: 22, bottom: 55 }
const plotW = W - M.left - M.right
const plotH = H - M.top - M.bottom
const dateLabel = (day: string) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC',
}).format(new Date(`${day}T12:00:00Z`))

function promptLabel(row: ProgressAttempt): string {
  if (row.hint_used_any === true && row.fewer_options_used === true) return 'Hint and fewer options'
  if (row.hint_used_any === true) return 'Hint used'
  if (row.fewer_options_used === true) return 'Fewer options'
  if (row.assistance_used === true) return 'Prompt used'
  if (row.assistance_used === false) return 'No prompt'
  return 'Prompt use not recorded'
}

const pointColor = (row: ProgressAttempt) => row.assistance_used === null
  ? '#758077' : row.assistance_used ? '#b4683a' : '#2f6f4e'

const promptCondition = (row: ProgressAttempt) => row.assistance_used === null
  ? 'unknown' : row.hint_used_any && row.fewer_options_used ? 'hint and fewer options'
    : row.hint_used_any ? 'hint' : row.fewer_options_used ? 'fewer options'
      : row.assistance_used ? 'other support' : 'no prompt'

export function AccuracyByAttempt({ attempts }: { attempts: ProgressAttempt[] }) {
  const rows = completedAttempts(attempts)
  if (rows.length === 0) return <p>No completed attempts for this pack yet.</p>
  const x = (index: number) => M.left + (rows.length === 1 ? plotW / 2 : index / (rows.length - 1) * plotW)
  const y = (accuracy: number) => M.top + plotH * (1 - Math.max(0, Math.min(100, accuracy)) / 100)
  const ticks = [0, 25, 50, 75, 100]
  const changes = rows.map((row, index) => {
    if (index === 0) return null
    const prev = rows[index - 1]
    if (row.attempt_purpose === 'fluency_probe' && prev.attempt_purpose !== 'fluency_probe' && prev.attempt_purpose !== 'fluency_practice') return { index, label: 'Timed practice begins' }
    if (promptCondition(row) !== 'unknown' && promptCondition(prev) !== 'unknown' &&
      promptCondition(row) !== promptCondition(prev)) return { index, label: 'Prompt condition changed' }
    return null
  }).filter((value): value is { index: number; label: string } => value !== null)
  return <>
    <div className="bl-trajectory-scroll"><svg viewBox={`0 0 ${W} ${H}`} className="bl-trajectory-chart"
      role="img" aria-label="Accuracy percentage for every completed attempt; colours show prompt use">
      <rect x={M.left} y={M.top} width={plotW} height={plotH} fill="#f4f1df" stroke="#152219" />
      {ticks.map(tick => <g key={tick}>
        <line x1={M.left} y1={y(tick)} x2={W - M.right} y2={y(tick)} stroke="#9aaa83" strokeWidth="0.7" />
        <text x={M.left - 12} y={y(tick) + 4} textAnchor="end" className="bl-chart-tick">{tick}%</text>
      </g>)}
      {changes.map(change => <g key={change.index}>
        <line x1={x(change.index)} y1={M.top} x2={x(change.index)} y2={M.top + plotH}
          stroke="#9a714b" strokeDasharray="5 5" opacity="0.8" />
        <title>{`${change.label} at attempt ${change.index + 1}`}</title>
      </g>)}
      {rows.length > 1 && <polyline points={rows.map((row, index) => `${x(index)},${y(Number(row.accuracy_percentage))}`).join(' ')}
        fill="none" stroke="#829987" strokeWidth="2" />}
      {rows.map((row, index) => <g key={row.id}>
        <circle cx={x(index)} cy={y(Number(row.accuracy_percentage))} r="6" fill={pointColor(row)} stroke="#fff" strokeWidth="1.5">
          <title>{`Attempt ${index + 1} · ${Number(row.accuracy_percentage).toFixed(0)}% · ${promptLabel(row)} · ${dateLabel(dayKey(row))}`}</title>
        </circle>
        {(rows.length <= 16 || index % Math.ceil(rows.length / 12) === 0 || index === rows.length - 1) &&
          <text x={x(index)} y={H - 25} textAnchor="middle" className="bl-chart-tick">{index + 1}</text>}
      </g>)}
      <text x={M.left + plotW / 2} y={H - 7} textAnchor="middle" className="bl-chart-axis">Completed attempt</text>
    </svg></div>
    <div className="bl-chart-key">
      <span><i style={{ background: '#2f6f4e' }} />No prompt</span>
      <span><i style={{ background: '#b4683a' }} />Prompt used</span>
      <span><i style={{ background: '#758077' }} />Earlier record: unknown</span>
      <span><i style={{ borderLeft: '2px dashed #9a714b', width: 0 }} />Prompt use or stage changed</span>
    </div>
    <p className="bl-chart-note">A prompt includes a hint or fewer options. Dashed lines show a change in the recorded prompt condition between attempts; formal teaching phases are not recorded yet.</p>
  </>
}

export function CumulativeRecord({ points }: { points: CumulativePoint[] }) {
  if (points.length === 0) return <p>Complete a quiz to start your record.</p>
  const start = new Date(`${points[0].day}T12:00:00Z`).getTime()
  const end = new Date(`${points[points.length - 1].day}T12:00:00Z`).getTime()
  const x = (day: string) => M.left + (start === end ? plotW / 2 :
    (new Date(`${day}T12:00:00Z`).getTime() - start) / (end - start) * plotW)
  const max = Math.max(1, points[points.length - 1].completed)
  const y = (value: number) => M.top + plotH * (1 - value / max)
  const series = [
    { key: 'completed' as const, color: '#152219', label: 'Completed quizzes' },
    { key: 'accuracyMastered' as const, color: '#b4683a', label: 'Packs accurate' },
    { key: 'fluencyMastered' as const, color: '#2f6f4e', label: 'Packs fluent' },
  ]
  return <>
    <div className="bl-trajectory-scroll"><svg viewBox={`0 0 ${W} ${H}`} className="bl-trajectory-chart"
      role="img" aria-label="Cumulative completed quizzes and unique packs meeting accuracy and fluency aims by day">
      <rect x={M.left} y={M.top} width={plotW} height={plotH} fill="#f4f1df" stroke="#152219" />
      {[0, .25, .5, .75, 1].map(fraction => <g key={fraction}>
        <line x1={M.left} y1={y(max * fraction)} x2={W - M.right} y2={y(max * fraction)} stroke="#9aaa83" strokeWidth="0.7" />
        <text x={M.left - 12} y={y(max * fraction) + 4} textAnchor="end" className="bl-chart-tick">{Math.round(max * fraction)}</text>
      </g>)}
      {series.map(s => <g key={s.key}>
        <polyline points={points.map(point => `${x(point.day)},${y(point[s.key])}`).join(' ')} fill="none" stroke={s.color} strokeWidth="3" />
        {points.map(point => <circle key={point.day} cx={x(point.day)} cy={y(point[s.key])} r="4" fill={s.color}>
          <title>{`${dateLabel(point.day)} · ${s.label}: ${point[s.key]} · Quizzes completed that day: ${point.dailyCompleted}`}</title>
        </circle>)}
      </g>)}
      {[points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]].filter((point, index, array) => array.findIndex(p => p.day === point.day) === index).map(point =>
        <text key={point.day} x={x(point.day)} y={H - 25} textAnchor="middle" className="bl-chart-tick">{dateLabel(point.day)}</text>)}
      <text x={M.left + plotW / 2} y={H - 7} textAnchor="middle" className="bl-chart-axis">Calendar day</text>
    </svg></div>
    <div className="bl-chart-key">{series.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}</div>
    <p className="bl-chart-note">Completed quizzes count each finished attempt. Mastery lines count each pack once.</p>
    <div className="bl-daily-summary">
      <h3>Recent activity by day</h3>
      <div className="bl-history-scroll"><table>
        <thead><tr><th>Day</th><th>Quizzes completed</th><th>Packs accurate</th><th>Packs fluent</th></tr></thead>
        <tbody>{points.slice(-7).reverse().map(point => <tr key={point.day}>
          <td>{dateLabel(point.day)}</td><td>{point.dailyCompleted}</td>
          <td>{point.accuracyMastered}</td><td>{point.fluencyMastered}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
  </>
}
