import type { MasteryForecast } from "./behaviorlingo-state-space-v3";

interface BehaviorLingoMasteryCardProps {
  forecast: MasteryForecast;
  className?: string;
}

function percentage(probability: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(probability);
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value);
}

function daysLabel(forecast: MasteryForecast): string | null {
  const days = forecast.estimatedDaysToMastery;
  if (days.median === null || days.median === 0) return null;
  const upper = days.upper80Censored
    ? `${compactNumber(forecast.horizonSessions * (days.median / (forecast.estimatedSessionsToMastery.median ?? 1)))}+`
    : days.upper80;
  if (days.lower80 === null || upper === null) {
    return `About ${compactNumber(days.median)} days`;
  }
  const upperLabel = typeof upper === "number" ? compactNumber(upper) : upper;
  return `About ${compactNumber(days.median)} days (80% range ${compactNumber(days.lower80)}–${upperLabel})`;
}

export function BehaviorLingoMasteryCard({
  forecast,
  className = "",
}: BehaviorLingoMasteryCardProps) {
  const nextSessionPercent = percentage(forecast.probabilityGoalNextAttempt);
  const days = daysLabel(forecast);

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
      aria-labelledby="mastery-forecast-heading"
    >
      <p className="text-sm font-medium text-slate-500">Your current forecast</p>
      <h2
        id="mastery-forecast-heading"
        className="mt-1 text-2xl font-semibold tracking-tight text-slate-950"
      >
        {forecast.headline}
      </h2>

      {forecast.rangeLabel && (
        <p className="mt-2 text-sm text-slate-600">{forecast.rangeLabel}</p>
      )}
      {days && <p className="mt-1 text-sm text-slate-600">{days}</p>}

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-medium text-slate-700">
            Chance of meeting the target next session
          </span>
          <span className="text-xl font-semibold tabular-nums text-slate-950">
            {nextSessionPercent}
          </span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Chance of meeting the target next session"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(forecast.probabilityGoalNextAttempt * 100)}
        >
          <div
            className="h-full rounded-full bg-teal-600 transition-[width]"
            style={{ width: `${forecast.probabilityGoalNextAttempt * 100}%` }}
          />
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Mastery means meeting both the accuracy and fluency targets in{" "}
        {forecast.consecutiveGoalSessions} consecutive sessions. {forecast.practiceAssumption}.
      </p>
      {forecast.caution && (
        <p className="mt-2 text-xs leading-5 text-amber-700">{forecast.caution}</p>
      )}
    </section>
  );
}
