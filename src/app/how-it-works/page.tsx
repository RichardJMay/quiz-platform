import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import Footer from '@/components/layout/Footer'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'How it works | BehaviorLingo',
  description:
    'How BehaviorLingo applies behavior analysis and learning research at every step: baseline measurement, adaptive teaching, independent readiness, fluency building and application.',
}

/* These examples explain the records, rather than represent a learner's data. */
const exampleRates = [4.5, 5.2, 6.4, 6.1, 7.8, 9.4, 10.6, 12.9, 15.6]
const rateY = (rate: number) => 170 - (Math.log10(rate) / Math.log10(20)) * 140
const rateX = (index: number) => 54 + index * 30
const examplePath = exampleRates.map((rate, index) =>
  `${index ? 'L' : 'M'}${rateX(index)},${rateY(rate).toFixed(1)}`).join(' ')

function JourneyChart() {
  return (
    <section className={styles.recordExamples} aria-labelledby="examples-title">
      <h2 id="examples-title">Different records answer different questions.</h2>
      <p className={styles.sectionLede}>Illustrative examples only. These are separate records, not one learner’s results or a promised learning trajectory.</p>
      <div className={styles.exampleGrid}>
        <figure className={styles.chartFigure}>
          <h3>Where you started. Where you are.</h3>
          <p className={styles.exampleIntro}>An example pack contains 20 terms.</p>
          <svg className={styles.chart} viewBox="0 0 350 220" role="img" aria-labelledby="readiness-title readiness-desc">
            <title id="readiness-title">Baseline correct and current terms ready</title>
            <desc id="readiness-desc">Nine of twenty terms were correct at baseline. Eighteen currently meet the independent readiness rule. These are different measures.</desc>
            {[0, 10, 20].map(value => <g key={value}>
              <line className={styles.grid} x1={44} x2={330} y1={170 - value * 7} y2={170 - value * 7} />
              <text className={styles.tick} x={36} y={174 - value * 7} textAnchor="end">{value}</text>
            </g>)}
            <line className={styles.axis} x1={44} x2={44} y1={30} y2={170} />
            <rect className={styles.baselineBar} x={83} y={107} width={64} height={63} />
            <rect className={styles.readyBar} x={228} y={44} width={64} height={126} />
            <text className={styles.barValue} x={115} y={98} textAnchor="middle">9</text>
            <text className={styles.barValue} x={260} y={35} textAnchor="middle">18</text>
            <text className={styles.tick} x={115} y={192} textAnchor="middle">Baseline correct</text>
            <text className={styles.tick} x={260} y={192} textAnchor="middle">Currently ready</text>
          </svg>
          <figcaption className={styles.chartCaption}>Baseline correct is your starting score. Currently ready counts terms identified independently in two completed sessions, with the latest independent answer correct.</figcaption>
        </figure>
        <figure className={styles.chartFigure}>
          <h3>Accurate responding at a faster pace.</h3>
          <p className={styles.exampleIntro}>Example options timings · correct/minute.</p>
          <svg className={styles.chart} viewBox="0 0 350 220" role="img" aria-labelledby="rate-title rate-desc">
            <title id="rate-title">Example definition fluency timings</title>
            <desc id="rate-desc">Nine illustrative timings rise from 4.5 to 15.6 correct responses per minute, with one dip. A ratio scale shows proportional changes. The options aim is fifteen per minute alongside one hundred percent accuracy.</desc>
            {[1, 2, 5, 10, 20].map(value => <g key={value}>
              <line className={styles.grid} x1={54} x2={330} y1={rateY(value)} y2={rateY(value)} />
              <text className={styles.tick} x={46} y={rateY(value) + 4} textAnchor="end">{value}</text>
            </g>)}
            <line className={styles.axis} x1={54} x2={54} y1={30} y2={170} />
            <line className={styles.aim} x1={54} x2={330} y1={rateY(15)} y2={rateY(15)} />
            <text className={styles.aimLabel} x={58} y={rateY(15) - 7}>Options aim: 15/min</text>
            <path className={styles.ratePath} d={examplePath} />
            {exampleRates.map((rate, index) => <circle key={index} className={styles.ratePoint} cx={rateX(index)} cy={rateY(rate)} r={4} />)}
            <text className={styles.tick} x={54} y={192}>Day 1</text>
            <text className={styles.tick} x={294} y={192} textAnchor="end">Day 9</text>
          </svg>
          <figcaption className={styles.chartCaption}>Equal vertical distances mean equal proportional changes. These are example raw timings; your progress page also shows a model estimate and its uncertainty band. Accuracy remains recorded throughout.</figcaption>
        </figure>
        <figure className={styles.chartFigure}>
          <h3>Apply the term to a situation.</h3>
          <p className={styles.exampleIntro}>Example practice-question record.</p>
          <table className={styles.contextTable}>
            <caption className={styles.visuallyHidden}>Separate example scenario timings</caption>
            <thead><tr><th scope="col">Run</th><th scope="col">Accuracy</th><th scope="col">Correct/min</th></tr></thead>
            <tbody>
              <tr><th scope="row">1</th><td>80%</td><td>4.0</td></tr>
              <tr><th scope="row">2</th><td>90%</td><td>4.8</td></tr>
              <tr><th scope="row">3</th><td>100%</td><td>5.9</td></tr>
            </tbody>
          </table>
          <figcaption className={styles.chartCaption}>Scenario timings have their own history. They do not update the definition-fluency curve: reading a situation and identifying its concept is a different task.</figcaption>
        </figure>
      </div>
    </section>
  )
}

/* ---------- Content ---------- */

type Stage = {
  id: string
  title: string
  doing: ReactNode
  principle: string
  why: ReactNode
}

const Ref = ({ n }: { n: number }) => (
  <a className={styles.ref} href={`#ref-${n}`} aria-label={`Reference ${n}`}>[{n}]</a>
)

const stages: Stage[] = [
  {
    id: 'baseline',
    title: 'Measure before teaching',
    doing: (
      <>
        <p>Every term in the pack appears once, with the full set of options available and no hints or feedback. Your score is kept as your starting point, alongside your latest progress.</p>
      </>
    ),
    principle: 'Baseline measurement',
    why: (
      <p>Behavior analysts measure before they intervene, so that change can be judged against where someone started. Your baseline also means teaching begins with the terms you don't yet know, instead of every learner working through the same list.</p>
    ),
  },
  {
    id: 'teaching',
    title: 'Practice what you don\u2019t yet know',
    doing: (
      <>
        <p>Short sets of up to ten items, with up to ten options. Options stay available throughout the set. Most target terms that still need work; the rest revisit terms you've already identified. Feedback follows every response.</p>
        <p>Each definition appears in its standard wording or a subtle rephrasing, chosen at random.</p>
      </>
    ),
    principle: 'Retrieval with feedback, adaptive selection, varied wording',
    why: (
      <>
        <p>Retrieval research informs the use of active responding. In experiments with prose passages, prior free-recall tests improved delayed retention compared with additional study. Those tests used no feedback, so they do not directly establish the effectiveness of this platform’s recognition tasks or feedback <Ref n={1} />.</p>
        <p>A knowledge-tracing model helps select terms for practice <Ref n={3} />. Research on personalized review supports investigating this approach <Ref n={5} />, but tested a different system. Our current selection rules remain pilot settings.</p>
        <p>We vary the wording to encourage identification beyond one familiar phrase. This draws on the idea of programming for generalization <Ref n={4} />; two wordings alone do not establish generalization to new situations.</p>
      </>
    ),
  },
  {
    id: 'support',
    title: 'Use help, then show you don\u2019t need it',
    doing: (
      <>
        <p>Ask for fewer options, or study an example in context alongside the definition. Help is recorded, but a supported answer never counts as evidence that you know a term.</p>
      </>
    ),
    principle: 'Prompting and transfer of stimulus control',
    why: (
      <p>Prompts make correct responding possible early on. Independent responses help show whether the definition, rather than the added help, controls identification. The platform checks this repeatedly before marking a term ready.</p>
    ),
  },
  {
    id: 'readiness',
    title: 'Ready means independent, and repeated',
    doing: (
      <>
        <p>A term is ready when you have identified it correctly without help in two separate completed sessions, and your latest independent answer is correct. The baseline can count as one of them. Sessions can happen on the same day and do not have to be consecutive.</p>
        <p>Every term in the pack must be ready before fluency practice unlocks.</p>
      </>
    ),
    principle: 'Mastery criteria, judged term by term',
    why: (
      <p>A correct answer on more than one occasion is stronger evidence than a single success. Judging each term separately stops a perfect score on one short set from hiding terms that weren't in it.</p>
    ),
  },
  {
    id: 'fluency',
    title: 'Keep accuracy. Build pace.',
    doing: (
      <>
        <p>Timed practice with options (aim: 100% accuracy and 15 correct per minute) or typed answers (aim: 100% accuracy and 6 correct per minute). The first eligible independent timing each day in each format is your daily measurement. Later timings remain visible as practice.</p>
        <p>Typed practice is optional and opens after receptive accuracy is established. Use the letter prompt if you need it: each word’s first letter and remaining letter spaces are shown. A prompted run retains its accuracy and rate, and is marked as supported practice. It does not count toward independent fluency mastery or update the independent model curve.</p>
      </>
    ),
    principle: 'Behavioral fluency and Precision Teaching',
    why: (
      <>
        <p>The rate of correct responding shows how readily you can respond, which accuracy alone can't capture <Ref n={2} />.</p>
        <p>Charting rate on a ratio scale, as in Precision Teaching, shows proportional change: doubling from 5 to 10 looks the same as doubling from 10 to 20. Using the first eligible independent timing of each day gives a consistent sampling rule. It does not eliminate all differences between practice conditions.</p>
      </>
    ),
  },
  {
    id: 'context',
    title: 'Apply the concept',
    doing: (
      <>
        <p>Meeting the options aim unlocks scenario questions: match each situation to the term it illustrates. Their accuracy and rate are recorded separately, because reading a scenario is a different task from recognizing a definition.</p>
      </>
    ),
    principle: 'Programming for generalization',
    why: (
      <p>These situations provide another setting in which to identify the concept, drawing on programming for generalization <Ref n={4} />. These questions give practice in applying concepts; on their own they don't prove that you can apply a concept in every new situation.</p>
    ),
  },
]

const records: [string, string][] = [
  ['Accuracy by attempt', 'Every scored set and timing stays visible, including after fluency unlocks. Sets where you used help are marked, so supported and independent performance can be told apart.'],
  ['Term readiness', 'The evidence for each term, and which terms still need an independent check.'],
  ['Fluency over time', 'Options and typed practice each have their own ratio-scale graph: raw timings, plus a model curve with an uncertainty band.'],
  ['Cumulative progress', 'Practice completed, packs ready for fluency and packs meeting the aim, adding up over time.'],
]

export default function HowItWorksPage() {
  return (
    <div className="bl-page">
      <header className="bl-header">
        <div className="bl-container bl-header-inner">
          <Link className="bl-wordmark" href="/" aria-label="BehaviorLingo home">
            <span className="bl-wordmark-mark" aria-hidden="true">BL</span>
            <span>behavior<span>lingo</span></span>
          </Link>
          <nav className="bl-header-actions" aria-label="Main navigation">
            <Link className="bl-button bl-button-quiet" href="/">Home</Link>
            <Link className="bl-button bl-button-quiet" href="/#modules">Browse modules</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="hiw-title">
          <div className={styles.heroText}>
            <p className="bl-kicker">The science and mechanics</p>
            <h1 id="hiw-title">Know the terms.<br />Build your fluency.</h1>
            <p className={styles.lede}>
              Start with what you already know. Practise the terms that need work, show you can identify
              them independently, then build pace and apply them to situations. Here is how the
              pathway works, and the research that informs its design.
            </p>
          </div>
        </section>

        <JourneyChart />

        <ol className={styles.stages} aria-label="The learning pathway">
          {stages.map((s, i) => (
            <li key={s.id} id={s.id} className={styles.stage}>
              <div className={styles.stageMarker} aria-hidden="true">{i + 1}</div>
              <div className={styles.stageBody}>
                <h2 className={styles.stageTitle}>{s.title}</h2>
                <div className={styles.stageGrid}>
                  <div className={styles.doing}>
                    <h3>What you do</h3>
                    {s.doing}
                  </div>
                  <div className={styles.why}>
                    <h3>The principle: {s.principle}</h3>
                    {s.why}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section className={styles.section} aria-labelledby="records-title">
          <h2 id="records-title">What your progress records show</h2>
          <p className={styles.sectionLede}>
            Repeated measurement and visual analysis are how behavior analysts judge change. Each
            record answers a different question about your learning.
          </p>
          <dl className={styles.records}>
            {records.map(([t, d]) => (
              <div key={t}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.section} aria-labelledby="method-title">
          <h2 id="method-title">The details, for those who want them</h2>
          <details className={styles.details}>
            <summary>How practice items are chosen</summary>
            <p>The system keeps an estimated probability that each term is known, updated after each response, allowing for a correct guess, a slip, and learning through practice. The guess allowance is one divided by the number of options, with a slip parameter of 0.08 and a learning parameter of 0.15. Study trials apply a learning update without counting as an independent answer.</p>
            <p>About 70% of each teaching set targets terms that aren't yet ready, prioritizing lower estimates and recent errors or confusions. The rest provides review; if there are too few ready terms, other terms needing work fill the set. Each term appears once per set.</p>
            <p>These are pilot settings, not validated probabilities of your competence, and the model has no explicit forgetting process yet. Readiness is decided by your observed responses, not by the model's estimate.</p>
          </details>
          <details className={styles.details}>
            <summary>How to read the fluency curve and its band</summary>
            <p>The curve uses the first eligible independent timing on each practice day, separately for each pack and format. Runs using a prompt are supported practice and do not update this curve. Later timings that day appear as raw points but don't update the curve.</p>
            <p>A state-space model tracks accuracy and time per item together, estimating an underlying performance level that can change over time. Rate is shown on a ratio scale, where equal distances represent equal proportional changes.</p>
            <p>The band is an 80% model-based interval for estimated fluency on observed practice days. It describes uncertainty under the model's assumptions, not a guarantee about your next score. Weekly celeration, where shown, is a multiplicative rate of change: ×1.4 per week means an estimated 40% increase per week.</p>
            <p>Model parameters were fitted to earlier practice data and remain provisional, especially with few practice days. The curve is a guide to interpreting practice, not a mastery test.</p>
          </details>
        </section>

        <section className={styles.limits} aria-labelledby="limits-title">
          <h2 id="limits-title">What your records can and can't show</h2>
          <p>They show independent identification of the terms you've been taught, and how quickly you respond in timed practice. They don't certify clinical competence, generalization to every situation, or readiness for a BACB examination. The aims are current platform targets, not validated thresholds for retention or application, and the pilot will test the teaching rules and model assumptions.</p>
        </section>

        <section className={styles.section} aria-labelledby="sources-title">
          <h2 id="sources-title">Sources</h2>
          <ol className={styles.references}>
            <li id="ref-1">Roediger, H. L., &amp; Karpicke, J. D. (2006). <a href="https://doi.org/10.1111/j.1467-9280.2006.01693.x">Test-enhanced learning: Taking memory tests improves long-term retention.</a> <i>Psychological Science, 17</i>, 249–255.</li>
            <li id="ref-2">Binder, C. (1996). <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2733609/">Behavioral fluency: Evolution of a new paradigm.</a> <i>The Behavior Analyst, 19</i>, 163–197.</li>
            <li id="ref-3">Corbett, A. T., &amp; Anderson, J. R. (1994). <a href="https://doi.org/10.1007/BF01099821">Knowledge tracing: Modeling the acquisition of procedural knowledge.</a> <i>User Modeling and User-Adapted Interaction, 4</i>, 253–278.</li>
            <li id="ref-4">Stokes, T. F., &amp; Baer, D. M. (1977). An implicit technology of generalization. <i>Journal of Applied Behavior Analysis, 10</i>, 349–367.</li>
            <li id="ref-5">Lindsey, R. V., Shroyer, J. D., Pashler, H., &amp; Mozer, M. C. (2014). Improving students' long-term knowledge retention through personalized review. <i>Psychological Science, 25</i>, 639–647.</li>
          </ol>
        </section>

        <div className={styles.cta}>
          <p>Start with a baseline. Practice what comes next.</p>
          <Link className="bl-button bl-button-primary" href="/#modules">Browse modules</Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
