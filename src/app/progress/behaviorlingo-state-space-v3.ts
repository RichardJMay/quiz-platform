/*
 * BehaviorLingo state-space prediction engine, schema v3.0.
 *
 * Zero dependencies. This module performs posterior-draw Kalman filtering and
 * deterministic next-attempt prediction in the browser. It is deliberately
 * written with small dense arrays because the state is always four-dimensional.
 */

export type ResponseMode = "options" | "typed";
type Vector = number[];
type Matrix = number[][];

export interface StateSpaceModeParameters {
  initial_mean: number[];
  initial_covariance: number[][];
  process_sd: number[];
  observation_sd: number[];
  gap_effect: number[];
  damping: number[];
}

export interface StateSpacePosteriorDraw {
  draw_id: number;
  posterior_row: number;
  observation_correlation: number;
  modes: Record<ResponseMode, StateSpaceModeParameters>;
}

export interface StateSpacePosteriorBundleV3 {
  schema_version: "behaviorlingo_state_space_v3_0";
  model: "bivariate_damped_local_linear_trend";
  posterior_draw_count: number;
  state_order: string[];
  observation_order: string[];
  modes: ResponseMode[];
  targets: {
    options_correct_per_minute: number;
    typed_correct_per_minute: number;
    minimum_accuracy_probability: number;
  };
  draws: StateSpacePosteriorDraw[];
}

export interface AttemptObservation {
  correctAnswers: number;
  totalQuestions: number;
  secondsPerItem: number;
  /** Gap since the preceding attempt. Ignored for the first attempt. */
  gapDays: number;
}

export interface ForecastRequest {
  mode: ResponseMode;
  history: AttemptObservation[];
  /** Assumed gap between the latest observed attempt and the next attempt. */
  nextGapDays: number;
  plannedItems: number;
  /** Deterministic quasi-Monte Carlo samples per posterior draw. Default 32. */
  predictiveSamplesPerDraw?: number;
}

export interface Interval80 {
  point: number;
  lower80: number;
  upper80: number;
}

export interface NextAttemptForecast {
  mode: ResponseMode;
  historyCount: number;
  historyLabel: string;
  assumedGapDays: number;
  plannedItems: number;
  posteriorDraws: number;
  predictiveSamples: number;
  fluencyTarget: number;
  minimumAccuracyTarget: number;
  accuracyProbability: Interval80;
  secondsPerItem: Interval80;
  correctPerMinute: Interval80;
  probabilityAccuracyTarget: number;
  probabilityFluencyTarget: number;
  probabilityGoalNextAttempt: number;
}

export interface MasteryForecastRequest {
  mode: ResponseMode;
  history: AttemptObservation[];
  plannedItems: number;
  /** Assumed constant interval between future practice sessions. */
  practiceEveryDays: number;
  /**
   * Gap from the latest observed session to the first forecast session.
   * Defaults to practiceEveryDays. This can include elapsed time since the
   * learner's latest recorded attempt.
   */
  firstSessionGapDays?: number;
  /** Forecast horizon. Default 10; allowed range 3–30. */
  horizonSessions?: number;
  /** Simulated trajectories per posterior draw. Default 16. */
  trajectoriesPerDraw?: number;
  /** Successful sessions required consecutively for mastery. Default 2. */
  consecutiveGoalSessions?: 1 | 2 | 3;
}

export interface MasteryProbabilityPoint {
  session: number;
  probabilityMeetingGoal: number;
  probabilityMasteryBySession: number;
}

export interface MasteryForecast {
  mode: ResponseMode;
  historyCount: number;
  estimateAvailable: boolean;
  headline: string;
  rangeLabel: string | null;
  practiceAssumption: string;
  caution: string | null;
  horizonSessions: number;
  consecutiveGoalSessions: number;
  simulatedTrajectories: number;
  estimatedSessionsToMastery: {
    median: number | null;
    lower80: number | null;
    upper80: number | null;
    upper80Censored: boolean;
  };
  estimatedDaysToMastery: {
    median: number | null;
    lower80: number | null;
    upper80: number | null;
    upper80Censored: boolean;
  };
  probabilityGoalNextAttempt: number;
  probabilityMasteryNextSession: number;
  probabilityMasteryWithin3Sessions: number;
  probabilityMasteryWithin5Sessions: number;
  probabilityMasteryWithinHorizon: number;
  curve: MasteryProbabilityPoint[];
}

export interface CapabilityTrajectoryRequest {
  mode: ResponseMode;
  history: AttemptObservation[];
  /** Evenly spaced practice sessions per day. Allowed values: 1, 2 or 3. */
  sessionsPerDay: 1 | 2 | 3;
  /** Elapsed gap from the latest observation to now. */
  elapsedDaysSinceLatest: number;
  /** Calendar forecast horizon. Default 10 days. */
  horizonDays?: number;
  /** Simulated latent trajectories per posterior draw. Default 16. */
  trajectoriesPerDraw?: number;
}

export interface CapabilityTrajectoryPoint {
  day: number;
  medianCorrectPerMinute: number;
  lower80CorrectPerMinute: number;
  upper80CorrectPerMinute: number;
  medianAccuracy: number;
  lower80Accuracy: number;
  upper80Accuracy: number;
}

export interface CapabilityTrajectoryForecast {
  mode: ResponseMode;
  sessionsPerDay: number;
  horizonDays: number;
  simulatedTrajectories: number;
  points: CapabilityTrajectoryPoint[];
}

export interface DrawForecastDebug {
  drawId: number;
  filteredMean: number[];
  filteredCovariance: number[][];
  nextStateMean: number[];
  nextStateCovariance: number[][];
  nextObservationMean: number[];
  nextPredictiveCovariance: number[][];
}

interface PreparedParameters {
  initialMean: Vector;
  initialCovariance: Matrix;
  transition: Matrix;
  processCovariance: Matrix;
  observation: Matrix;
  observationCovariance: Matrix;
  gapStateEffect: Vector;
}

interface FilterState {
  mean: Vector;
  covariance: Matrix;
}

interface DrawPrediction {
  filtered: FilterState;
  nextState: FilterState;
  observationMean: Vector;
  predictiveCovariance: Matrix;
}

const JITTER = 1e-9;

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
}

function cloneVector(x: Vector): Vector {
  return x.slice();
}

function cloneMatrix(x: Matrix): Matrix {
  return x.map((row) => row.slice());
}

function identity(size: number): Matrix {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? 1 : 0)),
  );
}

function diagonal(values: Vector): Matrix {
  return values.map((value, i) =>
    values.map((_, j) => (i === j ? value : 0)),
  );
}

function transpose(a: Matrix): Matrix {
  return a[0].map((_, column) => a.map((row) => row[column]));
}

function addMatrices(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((value, j) => value + b[i][j]));
}

function subtractMatrices(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((value, j) => value - b[i][j]));
}

function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  const bColumns = b[0].length;
  const shared = b.length;
  return a.map((row) =>
    Array.from({ length: bColumns }, (_, column) => {
      let total = 0;
      for (let k = 0; k < shared; k += 1) total += row[k] * b[k][column];
      return total;
    }),
  );
}

function multiplyMatrixVector(a: Matrix, x: Vector): Vector {
  return a.map((row) => row.reduce((sum, value, i) => sum + value * x[i], 0));
}

function addVectors(a: Vector, b: Vector): Vector {
  return a.map((value, i) => value + b[i]);
}

function subtractVectors(a: Vector, b: Vector): Vector {
  return a.map((value, i) => value - b[i]);
}

function scaleVector(a: Vector, scalar: number): Vector {
  return a.map((value) => value * scalar);
}

function symmetrizeWithJitter(a: Matrix): Matrix {
  return a.map((row, i) =>
    row.map((value, j) => 0.5 * (value + a[j][i]) + (i === j ? JITTER : 0)),
  );
}

function inverse2(a: Matrix): Matrix {
  const determinant = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  if (!(determinant > 0) || !Number.isFinite(determinant)) {
    throw new Error("Predictive covariance is not positive definite.");
  }
  return [
    [a[1][1] / determinant, -a[0][1] / determinant],
    [-a[1][0] / determinant, a[0][0] / determinant],
  ];
}

function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

function quantile(values: number[], probability: number): number {
  if (values.length === 0) throw new Error("Cannot calculate an empty quantile.");
  const ordered = values.slice().sort((a, b) => a - b);
  const location = (ordered.length - 1) * probability;
  const lower = Math.floor(location);
  const upper = Math.ceil(location);
  if (lower === upper) return ordered[lower];
  const fraction = location - lower;
  return ordered[lower] * (1 - fraction) + ordered[upper] * fraction;
}

function halton(index: number, base: number): number {
  let result = 0;
  let fraction = 1 / base;
  let remaining = index;
  while (remaining > 0) {
    result += fraction * (remaining % base);
    remaining = Math.floor(remaining / base);
    fraction /= base;
  }
  return result;
}

/** Acklam inverse-normal approximation; deterministic across R and TypeScript. */
function inverseStandardNormal(probability: number): number {
  const p = Math.min(1 - 1e-15, Math.max(1e-15, probability));
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];
  const lower = 0.02425;
  const upper = 1 - lower;

  if (p < lower) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= upper) {
    const q = p - 0.5;
    const r = q * q;
    return (
      (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

function sampleBivariateNormal(mean: Vector, covariance: Matrix, index: number): Vector {
  const z1 = inverseStandardNormal(halton(index, 2));
  const z2 = inverseStandardNormal(halton(index, 3));
  const l11 = Math.sqrt(Math.max(covariance[0][0], JITTER));
  const l21 = covariance[1][0] / l11;
  const l22Squared = covariance[1][1] - l21 * l21;
  if (!(l22Squared > 0)) throw new Error("Predictive covariance Cholesky failed.");
  const l22 = Math.sqrt(l22Squared);
  return [mean[0] + l11 * z1, mean[1] + l21 * z1 + l22 * z2];
}

function choleskyLower(covariance: Matrix): Matrix {
  const size = covariance.length;
  const lower = Array.from({ length: size }, () => Array(size).fill(0));
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let residual = covariance[row][column];
      for (let k = 0; k < column; k += 1) {
        residual -= lower[row][k] * lower[column][k];
      }
      if (row === column) {
        if (!(residual > 0) || !Number.isFinite(residual)) {
          throw new Error("Covariance Cholesky decomposition failed.");
        }
        lower[row][column] = Math.sqrt(residual);
      } else {
        lower[row][column] = residual / lower[column][column];
      }
    }
  }
  return lower;
}

function quasiNormalVector(index: number, bases: number[]): Vector {
  return bases.map((base) => inverseStandardNormal(halton(index, base)));
}

function sampleMultivariateNormal(
  mean: Vector,
  covariance: Matrix,
  standardNormals: Vector,
): Vector {
  const lower = choleskyLower(symmetrizeWithJitter(covariance));
  return addVectors(mean, multiplyMatrixVector(lower, standardNormals));
}

function discreteQuantile(values: number[], probability: number): number {
  if (values.length === 0) throw new Error("Cannot calculate an empty quantile.");
  const ordered = values.slice().sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(probability * ordered.length) - 1);
  return ordered[index];
}

function accuracyObservation(attempt: AttemptObservation): {
  value: number;
  variance: number;
} {
  const incorrect = attempt.totalQuestions - attempt.correctAnswers;
  if (!Number.isInteger(attempt.totalQuestions) || attempt.totalQuestions <= 0) {
    throw new Error("totalQuestions must be a positive integer.");
  }
  if (
    !Number.isInteger(attempt.correctAnswers) ||
    attempt.correctAnswers < 0 ||
    incorrect < 0
  ) {
    throw new Error("correctAnswers must be an integer from 0 to totalQuestions.");
  }
  return {
    value: Math.log((attempt.correctAnswers + 0.5) / (incorrect + 0.5)),
    variance: 1 / (attempt.correctAnswers + 0.5) + 1 / (incorrect + 0.5),
  };
}

function prepareParameters(
  draw: StateSpacePosteriorDraw,
  mode: ResponseMode,
): PreparedParameters {
  const source = draw.modes[mode];
  const transition = identity(4);
  transition[0][1] = 1;
  transition[1][1] = source.damping[0];
  transition[2][3] = 1;
  transition[3][3] = source.damping[1];

  const observation = [
    [1, 0, 0, 0],
    [0, 0, 1, 0],
  ];
  const covariance = [
    [source.observation_sd[0] ** 2, 0],
    [0, source.observation_sd[1] ** 2],
  ];
  covariance[0][1] =
    draw.observation_correlation * source.observation_sd[0] * source.observation_sd[1];
  covariance[1][0] = covariance[0][1];

  return {
    initialMean: cloneVector(source.initial_mean),
    initialCovariance: cloneMatrix(source.initial_covariance),
    transition,
    processCovariance: diagonal(source.process_sd.map((value) => value * value)),
    observation,
    observationCovariance: covariance,
    gapStateEffect: [source.gap_effect[0], 0, source.gap_effect[1], 0],
  };
}

function transitionState(
  state: FilterState,
  gapLog: number,
  parameters: PreparedParameters,
): FilterState {
  return {
    mean: addVectors(
      multiplyMatrixVector(parameters.transition, state.mean),
      scaleVector(parameters.gapStateEffect, gapLog),
    ),
    covariance: addMatrices(
      multiplyMatrices(
        multiplyMatrices(parameters.transition, state.covariance),
        transpose(parameters.transition),
      ),
      parameters.processCovariance,
    ),
  };
}

function updateState(
  state: FilterState,
  observationValue: Vector,
  knownAccuracyVariance: number,
  parameters: PreparedParameters,
): FilterState {
  const effectiveObservationCovariance = cloneMatrix(parameters.observationCovariance);
  effectiveObservationCovariance[0][0] += knownAccuracyVariance;
  const observationTranspose = transpose(parameters.observation);
  const predictiveCovariance = symmetrizeWithJitter(
    addMatrices(
      multiplyMatrices(
        multiplyMatrices(parameters.observation, state.covariance),
        observationTranspose,
      ),
      effectiveObservationCovariance,
    ),
  );
  const kalmanGain = multiplyMatrices(
    multiplyMatrices(state.covariance, observationTranspose),
    inverse2(predictiveCovariance),
  );
  const innovation = subtractVectors(
    observationValue,
    multiplyMatrixVector(parameters.observation, state.mean),
  );
  const updatedMean = addVectors(state.mean, multiplyMatrixVector(kalmanGain, innovation));
  const identityMinusGainObservation = subtractMatrices(
    identity(4),
    multiplyMatrices(kalmanGain, parameters.observation),
  );
  const updatedCovariance = symmetrizeWithJitter(
    addMatrices(
      multiplyMatrices(
        multiplyMatrices(identityMinusGainObservation, state.covariance),
        transpose(identityMinusGainObservation),
      ),
      multiplyMatrices(
        multiplyMatrices(kalmanGain, effectiveObservationCovariance),
        transpose(kalmanGain),
      ),
    ),
  );
  return { mean: updatedMean, covariance: updatedCovariance };
}

function filterHistory(
  history: AttemptObservation[],
  parameters: PreparedParameters,
): FilterState {
  let state: FilterState = {
    mean: cloneVector(parameters.initialMean),
    covariance: cloneMatrix(parameters.initialCovariance),
  };

  history.forEach((attempt, index) => {
    assertFinite(attempt.secondsPerItem, "secondsPerItem");
    assertFinite(attempt.gapDays, "gapDays");
    if (!(attempt.secondsPerItem > 0)) throw new Error("secondsPerItem must be positive.");
    if (attempt.gapDays < 0) throw new Error("gapDays cannot be negative.");
    if (index > 0) {
      state = transitionState(state, Math.log1p(attempt.gapDays), parameters);
    }
    const accuracy = accuracyObservation(attempt);
    state = updateState(
      state,
      [accuracy.value, Math.log(attempt.secondsPerItem)],
      accuracy.variance,
      parameters,
    );
  });
  return state;
}

function predictDraw(
  draw: StateSpacePosteriorDraw,
  request: ForecastRequest,
): DrawPrediction {
  const parameters = prepareParameters(draw, request.mode);
  const filtered = filterHistory(request.history, parameters);
  const nextState = request.history.length > 0
    ? transitionState(filtered, Math.log1p(request.nextGapDays), parameters)
    : { mean: cloneVector(filtered.mean), covariance: cloneMatrix(filtered.covariance) };
  const observationMean = multiplyMatrixVector(parameters.observation, nextState.mean);
  const latentAccuracy = logistic(observationMean[0]);
  const knownAccuracyVariance =
    1 / (request.plannedItems * latentAccuracy + 0.5) +
    1 / (request.plannedItems * (1 - latentAccuracy) + 0.5);
  const effectiveObservationCovariance = cloneMatrix(parameters.observationCovariance);
  effectiveObservationCovariance[0][0] += knownAccuracyVariance;
  const predictiveCovariance = symmetrizeWithJitter(
    addMatrices(
      multiplyMatrices(
        multiplyMatrices(parameters.observation, nextState.covariance),
        transpose(parameters.observation),
      ),
      effectiveObservationCovariance,
    ),
  );
  return { filtered, nextState, observationMean, predictiveCovariance };
}

function validateRequest(request: ForecastRequest): void {
  if (request.mode !== "options" && request.mode !== "typed") {
    throw new Error("mode must be 'options' or 'typed'.");
  }
  assertFinite(request.nextGapDays, "nextGapDays");
  if (request.nextGapDays < 0) throw new Error("nextGapDays cannot be negative.");
  if (!Number.isInteger(request.plannedItems) || request.plannedItems <= 0) {
    throw new Error("plannedItems must be a positive integer.");
  }
}

export function validateStateSpaceBundle(
  bundle: StateSpacePosteriorBundleV3,
): void {
  if (bundle.schema_version !== "behaviorlingo_state_space_v3_0") {
    throw new Error(`Unsupported schema version: ${bundle.schema_version}`);
  }
  if (bundle.draws.length !== bundle.posterior_draw_count || bundle.draws.length < 32) {
    throw new Error("Posterior draw count is inconsistent or too small.");
  }
  bundle.draws.forEach((draw) => {
    if (!(draw.observation_correlation > -1 && draw.observation_correlation < 1)) {
      throw new Error(`Invalid observation correlation in draw ${draw.draw_id}.`);
    }
    (["options", "typed"] as ResponseMode[]).forEach((mode) => {
      const p = draw.modes[mode];
      if (
        p.initial_mean.length !== 4 ||
        p.initial_covariance.length !== 4 ||
        p.initial_covariance.some((row) => row.length !== 4) ||
        p.process_sd.length !== 4 ||
        p.observation_sd.length !== 2 ||
        p.gap_effect.length !== 2 ||
        p.damping.length !== 2
      ) {
        throw new Error(`Invalid parameter dimensions in draw ${draw.draw_id}, ${mode}.`);
      }
      const values = [
        ...p.initial_mean,
        ...p.initial_covariance.flat(),
        ...p.process_sd,
        ...p.observation_sd,
        ...p.gap_effect,
        ...p.damping,
      ];
      if (values.some((value) => !Number.isFinite(value))) {
        throw new Error(`Non-finite parameter in draw ${draw.draw_id}, ${mode}.`);
      }
      if (p.process_sd.some((value) => value <= 0) || p.observation_sd.some((value) => value <= 0)) {
        throw new Error(`Non-positive SD in draw ${draw.draw_id}, ${mode}.`);
      }
      if (p.damping.some((value) => value <= 0 || value >= 1)) {
        throw new Error(`Invalid damping in draw ${draw.draw_id}, ${mode}.`);
      }
    });
  });
}

function historyLabel(count: number): string {
  if (count === 0) return "Population benchmark — not yet personalised";
  if (count === 1) return "Early estimate — limited history";
  if (count <= 4) return "Personalised estimate — still learning";
  return "Personalised estimate";
}

function attemptMeetsGoal(
  attempt: AttemptObservation,
  fluencyTarget: number,
  accuracyTarget: number,
): boolean {
  const accuracy = attempt.correctAnswers / attempt.totalQuestions;
  const correctPerMinute = (60 * accuracy) / attempt.secondsPerItem;
  return accuracy >= accuracyTarget && correctPerMinute >= fluencyTarget;
}

function trailingGoalStreak(
  history: AttemptObservation[],
  fluencyTarget: number,
  accuracyTarget: number,
  maximum: number,
): number {
  let streak = 0;
  for (let index = history.length - 1; index >= 0 && streak < maximum; index -= 1) {
    if (!attemptMeetsGoal(history[index], fluencyTarget, accuracyTarget)) break;
    streak += 1;
  }
  return streak;
}

export function forecastNextAttempt(
  bundle: StateSpacePosteriorBundleV3,
  request: ForecastRequest,
): NextAttemptForecast {
  validateStateSpaceBundle(bundle);
  validateRequest(request);
  const samplesPerDraw = request.predictiveSamplesPerDraw ?? 32;
  if (!Number.isInteger(samplesPerDraw) || samplesPerDraw < 1 || samplesPerDraw > 256) {
    throw new Error("predictiveSamplesPerDraw must be an integer from 1 to 256.");
  }

  const target = request.mode === "options"
    ? bundle.targets.options_correct_per_minute
    : bundle.targets.typed_correct_per_minute;
  const accuracyTarget = bundle.targets.minimum_accuracy_probability;
  const accuracyPoints: number[] = [];
  const speedPoints: number[] = [];
  const fluencyPoints: number[] = [];
  const predictiveAccuracy: number[] = [];
  const predictiveSpeed: number[] = [];
  const predictiveFluency: number[] = [];
  let accuracySuccesses = 0;
  let fluencySuccesses = 0;
  let jointSuccesses = 0;

  bundle.draws.forEach((draw, drawIndex) => {
    const prediction = predictDraw(draw, request);
    const accuracyPoint = logistic(prediction.observationMean[0]);
    const speedPoint = Math.exp(prediction.observationMean[1]);
    accuracyPoints.push(accuracyPoint);
    speedPoints.push(speedPoint);
    fluencyPoints.push((60 * accuracyPoint) / speedPoint);

    for (let sampleIndex = 1; sampleIndex <= samplesPerDraw; sampleIndex += 1) {
      const globalIndex = drawIndex * samplesPerDraw + sampleIndex;
      const sample = sampleBivariateNormal(
        prediction.observationMean,
        prediction.predictiveCovariance,
        globalIndex,
      );
      const accuracy = logistic(sample[0]);
      const seconds = Math.exp(sample[1]);
      const fluency = (60 * accuracy) / seconds;
      predictiveAccuracy.push(accuracy);
      predictiveSpeed.push(seconds);
      predictiveFluency.push(fluency);
      if (accuracy >= accuracyTarget) accuracySuccesses += 1;
      if (fluency >= target) fluencySuccesses += 1;
      if (accuracy >= accuracyTarget && fluency >= target) jointSuccesses += 1;
    }
  });

  const predictiveCount = predictiveAccuracy.length;
  return {
    mode: request.mode,
    historyCount: request.history.length,
    historyLabel: historyLabel(request.history.length),
    assumedGapDays: request.nextGapDays,
    plannedItems: request.plannedItems,
    posteriorDraws: bundle.draws.length,
    predictiveSamples: predictiveCount,
    fluencyTarget: target,
    minimumAccuracyTarget: accuracyTarget,
    accuracyProbability: {
      point: quantile(accuracyPoints, 0.5),
      lower80: quantile(predictiveAccuracy, 0.1),
      upper80: quantile(predictiveAccuracy, 0.9),
    },
    secondsPerItem: {
      point: quantile(speedPoints, 0.5),
      lower80: quantile(predictiveSpeed, 0.1),
      upper80: quantile(predictiveSpeed, 0.9),
    },
    correctPerMinute: {
      point: quantile(fluencyPoints, 0.5),
      lower80: quantile(predictiveFluency, 0.1),
      upper80: quantile(predictiveFluency, 0.9),
    },
    probabilityAccuracyTarget: accuracySuccesses / predictiveCount,
    probabilityFluencyTarget: fluencySuccesses / predictiveCount,
    probabilityGoalNextAttempt: jointSuccesses / predictiveCount,
  };
}

/**
 * Returns the same deterministic posterior-predictive fluency draws used by
 * forecastNextAttempt. Intended for displaying a density/half-eye without
 * pretending that probability is uniform across an interval.
 */
export function forecastNextAttemptFluencySamples(
  bundle: StateSpacePosteriorBundleV3,
  request: ForecastRequest,
): number[] {
  validateStateSpaceBundle(bundle);
  validateRequest(request);
  const samplesPerDraw = request.predictiveSamplesPerDraw ?? 32;
  if (!Number.isInteger(samplesPerDraw) || samplesPerDraw < 1 || samplesPerDraw > 256) {
    throw new Error("predictiveSamplesPerDraw must be an integer from 1 to 256.");
  }
  const samples: number[] = [];
  bundle.draws.forEach((draw, drawIndex) => {
    const prediction = predictDraw(draw, request);
    for (let sampleIndex = 1; sampleIndex <= samplesPerDraw; sampleIndex += 1) {
      const globalIndex = drawIndex * samplesPerDraw + sampleIndex;
      const sample = sampleBivariateNormal(
        prediction.observationMean,
        prediction.predictiveCovariance,
        globalIndex,
      );
      const accuracy = logistic(sample[0]);
      const seconds = Math.exp(sample[1]);
      samples.push((60 * accuracy) / seconds);
    }
  });
  return samples;
}

/**
 * Forecasts the learner's latent capability, rather than the noisy outcome of
 * one attempt, at the end of each future calendar day.
 */
export function forecastCapabilityTrajectory(
  bundle: StateSpacePosteriorBundleV3,
  request: CapabilityTrajectoryRequest,
): CapabilityTrajectoryForecast {
  validateStateSpaceBundle(bundle);
  if (![1, 2, 3].includes(request.sessionsPerDay)) {
    throw new Error("sessionsPerDay must be 1, 2 or 3.");
  }
  assertFinite(request.elapsedDaysSinceLatest, "elapsedDaysSinceLatest");
  if (request.elapsedDaysSinceLatest < 0 || request.elapsedDaysSinceLatest > 3650) {
    throw new Error("elapsedDaysSinceLatest must be from 0 to 3650.");
  }
  const horizonDays = request.horizonDays ?? 10;
  const trajectoriesPerDraw = request.trajectoriesPerDraw ?? 16;
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 30) {
    throw new Error("horizonDays must be an integer from 1 to 30.");
  }
  if (!Number.isInteger(trajectoriesPerDraw) || trajectoriesPerDraw < 4 || trajectoriesPerDraw > 128) {
    throw new Error("trajectoriesPerDraw must be an integer from 4 to 128.");
  }

  const totalPaths = bundle.draws.length * trajectoriesPerDraw;
  const gapBetweenSessions = 1 / request.sessionsPerDay;
  const totalSessions = horizonDays * request.sessionsPerDay;
  const accuracyByDay = Array.from({ length: horizonDays + 1 }, () => [] as number[]);
  const fluencyByDay = Array.from({ length: horizonDays + 1 }, () => [] as number[]);
  const stateBases = [2, 3, 5, 7];

  bundle.draws.forEach((draw, drawIndex) => {
    const parameters = prepareParameters(draw, request.mode);
    const filtered = filterHistory(request.history, parameters);
    for (let trajectoryIndex = 0; trajectoryIndex < trajectoriesPerDraw; trajectoryIndex += 1) {
      const pathIndex = drawIndex * trajectoriesPerDraw + trajectoryIndex + 1;
      let latentState = sampleMultivariateNormal(
        filtered.mean,
        filtered.covariance,
        quasiNormalVector(pathIndex, stateBases),
      );

      const recordDay = (day: number) => {
        const observationMean = multiplyMatrixVector(parameters.observation, latentState);
        const accuracy = logistic(observationMean[0]);
        const seconds = Math.exp(observationMean[1]);
        accuracyByDay[day].push(accuracy);
        fluencyByDay[day].push((60 * accuracy) / seconds);
      };
      recordDay(0);

      for (let session = 1; session <= totalSessions; session += 1) {
        const firstGap = request.elapsedDaysSinceLatest + gapBetweenSessions;
        const gapDays = session === 1 ? firstGap : gapBetweenSessions;
        const processIndex = pathIndex + session * totalPaths;
        const processStandardNormals = quasiNormalVector(processIndex, stateBases);
        const processNoise = parameters.processCovariance.map(
          (row, index) => Math.sqrt(row[index]) * processStandardNormals[index],
        );
        latentState = addVectors(
          addVectors(
            multiplyMatrixVector(parameters.transition, latentState),
            scaleVector(parameters.gapStateEffect, Math.log1p(gapDays)),
          ),
          processNoise,
        );
        if (session % request.sessionsPerDay === 0) {
          recordDay(session / request.sessionsPerDay);
        }
      }
    }
  });

  return {
    mode: request.mode,
    sessionsPerDay: request.sessionsPerDay,
    horizonDays,
    simulatedTrajectories: totalPaths,
    points: Array.from({ length: horizonDays + 1 }, (_, day) => ({
      day,
      medianCorrectPerMinute: quantile(fluencyByDay[day], 0.5),
      lower80CorrectPerMinute: quantile(fluencyByDay[day], 0.1),
      upper80CorrectPerMinute: quantile(fluencyByDay[day], 0.9),
      medianAccuracy: quantile(accuracyByDay[day], 0.5),
      lower80Accuracy: quantile(accuracyByDay[day], 0.1),
      upper80Accuracy: quantile(accuracyByDay[day], 0.9),
    })),
  };
}

/**
 * Simulates first passage to mastery from the learner's current filtered state.
 * Mastery is a run of 1–3 consecutive future/observed sessions satisfying both
 * the accuracy and mode-specific fluency criteria. The default is two.
 */
export function forecastMastery(
  bundle: StateSpacePosteriorBundleV3,
  request: MasteryForecastRequest,
): MasteryForecast {
  validateStateSpaceBundle(bundle);
  const nextRequest: ForecastRequest = {
    mode: request.mode,
    history: request.history,
    nextGapDays: request.firstSessionGapDays ?? request.practiceEveryDays,
    plannedItems: request.plannedItems,
    predictiveSamplesPerDraw: 32,
  };
  validateRequest(nextRequest);
  assertFinite(request.practiceEveryDays, "practiceEveryDays");
  if (request.practiceEveryDays < 0 || request.practiceEveryDays > 365) {
    throw new Error("practiceEveryDays must be from 0 to 365.");
  }
  const firstSessionGapDays = request.firstSessionGapDays ?? request.practiceEveryDays;
  assertFinite(firstSessionGapDays, "firstSessionGapDays");
  if (firstSessionGapDays < 0 || firstSessionGapDays > 3650) {
    throw new Error("firstSessionGapDays must be from 0 to 3650.");
  }

  const horizon = request.horizonSessions ?? 10;
  const trajectoriesPerDraw = request.trajectoriesPerDraw ?? 16;
  const consecutiveRequired = request.consecutiveGoalSessions ?? 2;
  if (!Number.isInteger(horizon) || horizon < 3 || horizon > 30) {
    throw new Error("horizonSessions must be an integer from 3 to 30.");
  }
  if (
    !Number.isInteger(trajectoriesPerDraw) ||
    trajectoriesPerDraw < 4 ||
    trajectoriesPerDraw > 128
  ) {
    throw new Error("trajectoriesPerDraw must be an integer from 4 to 128.");
  }
  if (![1, 2, 3].includes(consecutiveRequired)) {
    throw new Error("consecutiveGoalSessions must be 1, 2 or 3.");
  }

  const target = request.mode === "options"
    ? bundle.targets.options_correct_per_minute
    : bundle.targets.typed_correct_per_minute;
  const accuracyTarget = bundle.targets.minimum_accuracy_probability;
  const nextAttempt = forecastNextAttempt(bundle, nextRequest);
  const initialStreak = Math.min(
    consecutiveRequired - 1,
    trailingGoalStreak(request.history, target, accuracyTarget, consecutiveRequired - 1),
  );
  const totalPaths = bundle.draws.length * trajectoriesPerDraw;
  const firstMastery = Array(totalPaths).fill(horizon + 1) as number[];
  const goalCounts = Array(horizon).fill(0) as number[];
  const stateBases = [2, 3, 5, 7];
  const observationBases = [11, 13];

  bundle.draws.forEach((draw, drawIndex) => {
    const parameters = prepareParameters(draw, request.mode);
    const filtered = filterHistory(request.history, parameters);
    for (let trajectoryIndex = 0; trajectoryIndex < trajectoriesPerDraw; trajectoryIndex += 1) {
      const pathIndex = drawIndex * trajectoriesPerDraw + trajectoryIndex + 1;
      let latentState = sampleMultivariateNormal(
        filtered.mean,
        filtered.covariance,
        quasiNormalVector(pathIndex, stateBases),
      );
      let streak = initialStreak;

      for (let session = 1; session <= horizon; session += 1) {
        const shouldTransition = request.history.length > 0 || session > 1;
        if (shouldTransition) {
          const gapLog = Math.log1p(
            session === 1 ? firstSessionGapDays : request.practiceEveryDays,
          );
          const processIndex = pathIndex + (2 * session - 1) * totalPaths;
          const processStandardNormals = quasiNormalVector(processIndex, stateBases);
          const processNoise = parameters.processCovariance.map(
            (row, index) => Math.sqrt(row[index]) * processStandardNormals[index],
          );
          latentState = addVectors(
            addVectors(
              multiplyMatrixVector(parameters.transition, latentState),
              scaleVector(parameters.gapStateEffect, gapLog),
            ),
            processNoise,
          );
        }

        const observationMean = multiplyMatrixVector(parameters.observation, latentState);
        const latentAccuracy = logistic(observationMean[0]);
        const knownAccuracyVariance =
          1 / (request.plannedItems * latentAccuracy + 0.5) +
          1 / (request.plannedItems * (1 - latentAccuracy) + 0.5);
        const effectiveObservationCovariance = cloneMatrix(parameters.observationCovariance);
        effectiveObservationCovariance[0][0] += knownAccuracyVariance;
        const observationIndex = pathIndex + 2 * session * totalPaths;
        const simulatedObservation = sampleMultivariateNormal(
          observationMean,
          effectiveObservationCovariance,
          quasiNormalVector(observationIndex, observationBases),
        );
        const accuracy = logistic(simulatedObservation[0]);
        const seconds = Math.exp(simulatedObservation[1]);
        const fluency = (60 * accuracy) / seconds;
        const goal = accuracy >= accuracyTarget && fluency >= target;
        if (goal) {
          goalCounts[session - 1] += 1;
          streak += 1;
        } else {
          streak = 0;
        }
        if (streak >= consecutiveRequired && firstMastery[pathIndex - 1] > horizon) {
          firstMastery[pathIndex - 1] = session;
        }
      }
    }
  });

  const probabilityBySession = Array.from({ length: horizon }, (_, index) => {
    const session = index + 1;
    return firstMastery.filter((value) => value <= session).length / totalPaths;
  });
  const curve = probabilityBySession.map((probabilityMasteryBySession, index) => ({
    session: index + 1,
    probabilityMeetingGoal: goalCounts[index] / totalPaths,
    probabilityMasteryBySession,
  }));
  const medianRaw = discreteQuantile(firstMastery, 0.5);
  const lowerRaw = discreteQuantile(firstMastery, 0.1);
  const upperRaw = discreteQuantile(firstMastery, 0.9);
  const median = medianRaw <= horizon ? medianRaw : null;
  const lower80 = lowerRaw <= horizon ? lowerRaw : null;
  const upper80 = upperRaw <= horizon ? upperRaw : null;
  const upper80Censored = upperRaw > horizon;
  const estimateAvailable = request.history.length >= 2;

  let headline: string;
  let rangeLabel: string | null;
  if (!estimateAvailable) {
    headline = "Complete at least two sessions for a mastery estimate";
    rangeLabel = null;
  } else if (median === null) {
    headline = `More than ${horizon} sessions likely`;
    rangeLabel = lower80 === null ? null : `80% predictive range: ${lower80}–${horizon}+ sessions`;
  } else {
    headline = `About ${median} session${median === 1 ? "" : "s"} to mastery`;
    const lowerLabel = lower80 ?? horizon;
    const upperLabel = upper80Censored ? `${horizon}+` : String(upper80);
    rangeLabel = `80% predictive range: ${lowerLabel}–${upperLabel} sessions`;
  }

  const convertDays = (sessions: number | null): number | null =>
    sessions === null ? null : sessions * request.practiceEveryDays;
  const probabilityWithin = (session: number): number =>
    probabilityBySession[Math.min(session, horizon) - 1];

  return {
    mode: request.mode,
    historyCount: request.history.length,
    estimateAvailable,
    headline,
    rangeLabel,
    practiceAssumption: request.practiceEveryDays === 0
      ? "Assuming another session the same day"
      : Math.abs(request.practiceEveryDays - 1 / 3) < 1e-9
        ? "Assuming three practice sessions per day"
        : Math.abs(request.practiceEveryDays - 1 / 2) < 1e-9
          ? "Assuming two practice sessions per day"
          : request.practiceEveryDays === 1
            ? "Assuming practice every day"
            : `Assuming practice every ${request.practiceEveryDays} days`,
    caution: request.mode === "typed"
      ? "Typed-mode forecasts are based on limited historical data and should be treated cautiously."
      : null,
    horizonSessions: horizon,
    consecutiveGoalSessions: consecutiveRequired,
    simulatedTrajectories: totalPaths,
    estimatedSessionsToMastery: {
      median,
      lower80,
      upper80,
      upper80Censored,
    },
    estimatedDaysToMastery: {
      median: convertDays(median),
      lower80: convertDays(lower80),
      upper80: convertDays(upper80),
      upper80Censored,
    },
    probabilityGoalNextAttempt: nextAttempt.probabilityGoalNextAttempt,
    probabilityMasteryNextSession: probabilityBySession[0],
    probabilityMasteryWithin3Sessions: probabilityWithin(3),
    probabilityMasteryWithin5Sessions: probabilityWithin(5),
    probabilityMasteryWithinHorizon: probabilityBySession[horizon - 1],
    curve,
  };
}

/** Exposed only for R/TypeScript numerical equivalence tests. */
export function debugForecastDraw(
  bundle: StateSpacePosteriorBundleV3,
  request: ForecastRequest,
  drawId: number,
): DrawForecastDebug {
  validateStateSpaceBundle(bundle);
  validateRequest(request);
  const draw = bundle.draws.find((candidate) => candidate.draw_id === drawId);
  if (!draw) throw new Error(`Posterior draw ${drawId} was not found.`);
  const prediction = predictDraw(draw, request);
  return {
    drawId,
    filteredMean: prediction.filtered.mean,
    filteredCovariance: prediction.filtered.covariance,
    nextStateMean: prediction.nextState.mean,
    nextStateCovariance: prediction.nextState.covariance,
    nextObservationMean: prediction.observationMean,
    nextPredictiveCovariance: prediction.predictiveCovariance,
  };
}
