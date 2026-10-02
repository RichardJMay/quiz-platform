/** Pure accuracy rules. Persist the inputs and outputs in a server transaction. */
export type AdaptiveConfig = {
  slip: number
  learningRate: number
  sessionLength: number
  independentOptionCap: number
  reducedOptionCount: number
  targetFraction: number
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  slip: 0.08,
  learningRate: 0.15,
  sessionLength: 12,
  independentOptionCap: 10,
  reducedOptionCount: 3,
  targetFraction: 0.7,
}

export const DEFAULT_DIFFICULTY_PRIORS: Record<number, number> = {
  1: 0.5, 2: 0.4, 3: 0.3, 4: 0.2, 5: 0.1,
}

export function initialKnowledge(difficulty: number | null, priors = DEFAULT_DIFFICULTY_PRIORS): number {
  return difficulty != null && priors[difficulty] != null ? priors[difficulty] : 0.3
}

/** A study presentation has no answer; it applies only the learning transition. */
export function updateKnowledge(
  prior: number,
  outcome: 'correct' | 'incorrect' | 'dont_know' | 'study',
  optionCount: number,
  config: Pick<AdaptiveConfig, 'slip' | 'learningRate'> = DEFAULT_ADAPTIVE_CONFIG,
): number {
  const { slip, learningRate } = config
  if (!(prior >= 0 && prior <= 1) || !(slip > 0 && slip < 1) ||
      !(learningRate >= 0 && learningRate < 1)) throw new Error('Invalid knowledge model parameters')
  if (outcome !== 'study' && (!Number.isInteger(optionCount) || optionCount < 2)) {
    throw new Error('A response must have at least two options')
  }

  const guess = outcome === 'dont_know' ? 0 : 1 / optionCount
  let posterior = prior
  if (outcome === 'correct') {
    const numerator = prior * (1 - slip)
    posterior = numerator / (numerator + (1 - prior) * guess)
  } else if (outcome === 'incorrect' || outcome === 'dont_know') {
    const numerator = prior * slip
    posterior = numerator / (numerator + (1 - prior) * (1 - guess))
  }
  return posterior + (1 - posterior) * learningRate
}

export type CertificationTrial = {
  sessionId: string
  sessionCompleted: boolean
  /** The options cap remains fixed for the entire teaching session. */
  isStandardFormat: boolean
  supportLevel: 0 | 1 | 2
  response: 'correct' | 'incorrect' | 'dont_know' | 'study'
}

/** Supply trials in saved chronological order, including baseline trials. */
export function termCertification(trials: readonly CertificationTrial[]): {
  independentSessions: number
  certified: boolean
} {
  const successfulSessions = new Set<string>()
  let latestIndependentCorrect = false
  for (const trial of trials) {
    if (!trial.sessionCompleted || !trial.sessionId || !trial.isStandardFormat ||
        trial.supportLevel !== 0 || trial.response === 'study') continue
    latestIndependentCorrect = trial.response === 'correct'
    if (latestIndependentCorrect) successfulSessions.add(trial.sessionId)
  }
  return {
    independentSessions: successfulSessions.size,
    certified: successfulSessions.size >= 2 && latestIndependentCorrect,
  }
}

export type AdaptiveTerm = {
  id: string
  pKnown: number
  certified: boolean
  lastSeenAt: number | null
  erroredLastSession: boolean
  hasConfusion: boolean
}

/** Chooses term IDs only; the server must choose questions and validate answers. */
export function selectTeachingTerms(
  terms: readonly AdaptiveTerm[],
  config: Pick<AdaptiveConfig, 'sessionLength' | 'targetFraction'> = DEFAULT_ADAPTIVE_CONFIG,
): string[] {
  if (!terms.length) return []
  if (!Number.isInteger(config.sessionLength) || config.sessionLength < 1 ||
      config.targetFraction < 0 || config.targetFraction > 1) throw new Error('Invalid session settings')

  const targets = terms.filter(term => !term.certified).sort((a, b) => {
    const priority = (term: AdaptiveTerm) =>
      1 - term.pKnown + (term.erroredLastSession ? 0.2 : 0) + (term.hasConfusion ? 0.2 : 0)
    return priority(b) - priority(a) || (a.lastSeenAt ?? 0) - (b.lastSeenAt ?? 0)
  })
  const review = terms.filter(term => term.certified).sort((a, b) =>
    (a.lastSeenAt ?? 0) - (b.lastSeenAt ?? 0) || b.pKnown - a.pKnown)
  const targetSlots = Math.min(config.sessionLength, Math.max(1, Math.round(config.sessionLength * config.targetFraction)))
  const selected = targets.slice(0, targetSlots).map(term => term.id)
  const fillers = [...review, ...targets.slice(targetSlots)]
  for (const filler of fillers) {
    if (selected.length >= config.sessionLength) break
    selected.push(filler.id)
  }
  // Revisit difficult targets only when the pack has fewer distinct terms than slots.
  for (let i = 0; selected.length < config.sessionLength; i++) {
    selected.push((targets.length ? targets : review)[i % (targets.length || review.length)].id)
  }
  return selected
}

/** Baseline checks every term exactly once, with the full option bank. */
export function baselineTermOrder(termIds: readonly string[], random: () => number = Math.random): string[] {
  const ordered = [...termIds]
  for (let i = ordered.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[ordered[i], ordered[j]] = [ordered[j], ordered[i]]
  }
  return ordered
}
