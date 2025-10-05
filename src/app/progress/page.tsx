'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_name: string;
  total_questions: number;
  correct_answers: number;
  accuracy_percentage: number;
  fluency_rate: number;
  total_time_minutes: number;
  completed_at: string;
  quizzes: {
    title: string;
    description: string;
  } | null;
}

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all');
  const [showGraph, setShowGraph] = useState(true);
  const [chartType, setChartType] = useState<'fluency' | 'accuracy'>('fluency');
  const { user } = useAuth();
  const router = useRouter();
  const loadingRef = useRef(false);
  const [fromDate, setFromDate] = useState<string | null>(null);


  const loadAttempts = async (): Promise<void> => {
    if (!user) return;

    if (loadingRef.current) {
      console.log('Progress data already loading, skipping...');
      return;
    }

    loadingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          student_name,
          total_questions,
          correct_answers,
          accuracy_percentage,
          fluency_rate,
          total_time_minutes,
          completed_at,
          quizzes!inner(title, description)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error loading attempts:', error);
      } else {
        const typedData = (data || []).map((item: any) => ({
          ...item,
          quizzes: Array.isArray(item.quizzes) ? item.quizzes[0] : item.quizzes,
        })) as QuizAttempt[];
        setAttempts(typedData);
        setSelectedQuiz(typedData.length ? typedData[0].quiz_id : 'all');
      }
    } catch (err) {
      console.error('Error in loadAttempts:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    setFromDate(null);
  }, [selectedQuiz]);


  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    void loadAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getUniqueQuizzes = (): Array<[string, string]> => {
    const quizMap = new Map<string, string>();
    attempts.forEach((attempt) => {
      if (attempt.quizzes && !quizMap.has(attempt.quiz_id)) {
        quizMap.set(attempt.quiz_id, attempt.quizzes.title);
      }
    });
    return Array.from(quizMap.entries());
  };

  const filteredAttempts =
    selectedQuiz === 'all'
      ? attempts
      : attempts.filter((attempt) => attempt.quiz_id === selectedQuiz);

  useEffect(() => {
  if (!loading && selectedQuiz !== 'all' && filteredAttempts.length > 1) {
    setShowGraph(true);            // open the graph
    setChartType('fluency');       // ensure fluency tab
  }
}, [loading, selectedQuiz, filteredAttempts.length]);

    const dateRange = useMemo(() => {
        if (!filteredAttempts.length) return null;
    const ts = filteredAttempts.map(a => new Date(a.completed_at).getTime());
    const min = Math.min(...ts), max = Math.max(...ts);
    const toInput = (t: number) => new Date(t).toISOString().slice(0, 10);
        return { min: toInput(min), max: toInput(max) };
}, [filteredAttempts]);



  const getPerformanceColor = (accuracy: number, fluency: number): string => {
    if (accuracy >= 80 && fluency >= 20) return 'text-green-600 bg-green-50';
    if (accuracy >= 60 && fluency >= 10) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getOverallStats = () => {
    if (filteredAttempts.length === 0) return null;

    const avgAccuracy =
      filteredAttempts.reduce((sum, a) => sum + a.accuracy_percentage, 0) /
      filteredAttempts.length;
    const avgFluency =
      filteredAttempts.reduce((sum, a) => sum + a.fluency_rate, 0) /
      filteredAttempts.length;
    
      // NEW: moving average over most recent k attempts
    const WINDOW = 5; // tweak to taste
    const k = Math.min(WINDOW, filteredAttempts.length);
    // filteredAttempts is newest → oldest, so take the first k
    const movingAvgAccuracy =
    k > 0
      ? filteredAttempts
          .slice(0, k)
          .reduce((s, a) => s + a.accuracy_percentage, 0) / k
      : 0;

    const totalAttempts = filteredAttempts.length;
    const bestAccuracy = Math.max(
      ...filteredAttempts.map((a) => a.accuracy_percentage),
    );
    const bestFluency = Math.max(
      ...filteredAttempts.map((a) => a.fluency_rate),
    );

    // oldest vs newest
    const firstAttempt = filteredAttempts[filteredAttempts.length - 1];
    const lastAttempt = filteredAttempts[0];
    const accuracyImprovement =
      totalAttempts > 1
        ? lastAttempt.accuracy_percentage - firstAttempt.accuracy_percentage
        : 0;
    const fluencyImprovement =
      totalAttempts > 1
        ? lastAttempt.fluency_rate - firstAttempt.fluency_rate
        : 0;

    return {
      avgAccuracy,
      movingAvgAccuracy,      // NEW
      movingWindow: k,        // NEW (for labeling)
      avgFluency,
      totalAttempts,
      bestAccuracy,
      bestFluency,
      accuracyImprovement,
      fluencyImprovement,
    };
  };

  const getProgressChartData = (): Array<{
    attempt: number;
    fluency: number;
    accuracy: number;
    date: string;
  }> => {
    return filteredAttempts
      .slice()
      .reverse()
      .map((attempt, index) => ({
        attempt: index + 1,
        fluency: attempt.fluency_rate,
        accuracy: attempt.accuracy_percentage,
        date: new Date(attempt.completed_at).toLocaleDateString(),
      }));
  };

  // Correct celeration from daily points (× per week on log10 scale)
const computeCorrectCeleration = ():
  | { factorPerWeek: number; pointsUsed: number }
  | null => {
  if (filteredAttempts.length < 2) return null;

  // one point per calendar day
  const daily = new Map<string, { t: number; fluency: number }>();
  filteredAttempts
    .slice()       // newest → oldest -> copy
    .reverse()     // oldest → newest for time math
    .forEach(a => {
      const t = new Date(a.completed_at).getTime();
      const dayKey = new Date(t).toISOString().slice(0, 10); // YYYY-MM-DD
      if (!daily.has(dayKey)) daily.set(dayKey, { t, fluency: a.fluency_rate });
    });

  const data = Array.from(daily.values()).sort((a, b) => a.t - b.t);
  if (data.length < 2) return null;

  const dayMs = 86_400_000;
  const first = data[0].t;

  // x = weeks since first point; y = log10(corrects per min)
  const x = data.map(d => (d.t - first) / (7 * dayMs));
  const y = data.map(d => Math.log10(Math.max(0.1, d.fluency)));

  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i]; sumY += y[i]; sumXY += x[i] * y[i]; sumX2 += x[i] * x[i];
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slopePerWeek = (n * sumXY - sumX * sumY) / denom; // log10 scale
  const factorPerWeek = Math.pow(10, slopePerWeek);        // × per week

 
  return { factorPerWeek, pointsUsed: n };
};
 // Put this inside ProgressPage, above the big return (function declaration style)
function getPTAdviceForApp(opts: {
  chartData: { t: number; fluency: number; errorRate: number }[]; // daily points, oldest -> newest
  correctCeleration?: { slope: number } | null; // per-week on log10 scale
  errorCeleration?: { slope: number } | null;
  aimFluency?: number;  // default 25/min
  aimError?: number;    // default 1/min
}): { picture: string | null; tips: string[] } {
  const {
    chartData,
    correctCeleration,
    errorCeleration,
    aimFluency = 20,
    aimError = 1,
  } = opts;

  const tips: string[] = [];
  if (chartData.length < 2) return { picture: null, tips };

  const last3 = chartData.slice(-3);
  const last = chartData[chartData.length - 1];

  // helpers
  const corrX = correctCeleration ? Math.pow(10, correctCeleration.slope) : null; // ×/week
  const errX  = errorCeleration    ? Math.pow(10, errorCeleration.slope)    : null;

  // Compute recent average duration from the raw attempts (newest first)
const aimFluencylocal = 20; // or whatever you pass into the helper
const kDur = Math.min(3, filteredAttempts.length);
const avgDurationMin =
  kDur > 0
    ? filteredAttempts
        .slice(0, kDur) // newest k
        .reduce((s, a) => s + (a.total_time_minutes || 1), 0) / kDur
    : 0;

// Use the last daily point's fluency from the chartData
const lastFluency = chartData.length ? chartData[chartData.length - 1].fluency : 0;

// Long timing + below aim → suggest shorter sprints
if (avgDurationMin > 1 && lastFluency < aimFluencylocal * 0.7) {
  tips.push(
    "Long timing + below aim — build endurance gradually. Start with 30-second sprints."
  );
}

  // learning picture label (simple 2x2 on celerations)
  let picture: string | null = null;
if (corrX !== null && errX !== null) {
  if (corrX > 1.4 && errX < 0.7) {
    picture = "Strong Jaws (excellent progress)";
  } else if (corrX > 1.25 && errX < 0.9) {
    picture = "Jaws (good progress)";
  } else if (corrX > 1.0 && errX < 1.0) {
    picture = "Weak Jaws (marginal progress)";
  } else if (corrX > 1.0 && errX > 1.0) {
    picture = "Both rising (watch errors)";
  } else if (corrX < 1.0 && errX < 1.0) {
    picture = "Both falling (stall/dive)";
  } else if (corrX < 1.0 && errX > 1.0) {
    picture = "Opposition (trouble)";
  }
}


// --- Aim line crossover: 5 of last 7 at/above aim ---
const daysAboveAim = chartData.slice(-7).filter(d => d.fluency >= aimFluency).length;
if (daysAboveAim >= 5) {
  tips.push(`5+ days above aim — advance to harder material or raise aim to ~${aimFluency + 10}/min.`);
}

// helper: OLS slope over equally spaced points (returns slope on log10 scale per point)
function slopeOLS(y: number[]): number | null {
  const n = y.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    const x = i, yi = y[i];
    sumX += x; sumY += yi; sumXY += x * yi; sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

// --- Plateau detection: recent vs prior window ---
if (chartData.length >= 10) {
  // Use log10(corrects) to mirror SCC logic
  const recent7 = chartData.slice(-7).map(d => Math.log10(Math.max(0.1, d.fluency)));
  const prior7  = chartData.slice(-14, -7).map(d => Math.log10(Math.max(0.1, d.fluency)));

  const recentSlope = slopeOLS(recent7);   // per-point (≈ per session/day)
  const priorSlope  = slopeOLS(prior7);

  // thresholds: ~flat if |m| < 0.02 (≈ ×1.05/day). Prior was clearly rising if > 0.05 (~×1.12/day).
  if (
    recentSlope !== null && priorSlope !== null &&
    Math.abs(recentSlope) < 0.02 && Math.abs(priorSlope) > 0.05
  ) {
    tips.push("Celeration flattened — implement a quick 'slice back' protocol: slightly easier set for ~3 days to rebuild momentum, then resume.");
  }
}


  // decision checks
  const atAimLast3 =
    last3.filter(d => d.fluency >= aimFluency && d.errorRate <= aimError).length >= 2;

  const flatLast3 = last3.length === 3 ? (() => {
    const arr = last3.map(d => d.fluency);
    const max = Math.max(...arr), min = Math.min(...arr);
    return max / Math.max(min, 0.1) < 1.10; // within ±10%
  })() : false;

  // bounce (variability) over last 5
  const recent = chartData.slice(-5);
  const mean = recent.reduce((s,d)=>s+d.fluency,0) / recent.length;
  const sd = recent.length > 1
    ? Math.sqrt(recent.reduce((s,d)=>s + (d.fluency - mean)**2, 0) / (recent.length - 1))
    : 0;
  const cv = mean > 0 ? sd / mean : 0; // coefficient of variation

  // tips (no miss-only timings; focus on noting/correcting errors and shaping corrects)
  if (picture === "Jaws (corrects ↑, errors ↓)") {
    tips.push(`Healthy pattern (${corrX!.toFixed(2)}× corrects, ${errX!.toFixed(2)}× errors) — keep course.`);
    if (atAimLast3) tips.push("At aim on 2 of last 3 — consider raising the aim or moving to next set.");
  }

  if (corrX !== null && corrX < 1.25) {
    tips.push(`Corrects celeration is ×${corrX.toFixed(2)}/week (<×1.25) — adjust instruction: shorten sets, increase opportunities, or add brief extra practice blocks.`);
  }

  if (errX !== null && errX > 1.10) {
    tips.push(`Errors accelerating (×${errX.toFixed(2)}/week) — ensure immediate corrective feedback is noted and rehearsed (model → guided → independent), and consider simplifying or pre-teaching tricky items.`);
  }

  if (last.errorRate > aimError) {
    tips.push(`Errors above aim (>${aimError}/min) — tighten prompts and modeling on missed items; log which items miss so the next set emphasises those.`);
  }

  if (flatLast3) {
    tips.push("Three days of flat corrects — change something (slice the skill finer, adjust timing length, or increase reinforcement density).");
  }

  if (cv > 0.5 && recent.length >= 3) {
    tips.push("High variability — standardize timing conditions (same time/place, brief warm-up) and ensure consistent timing length.");
  }

  if (!tips.length) {
    tips.push("Maintain course and keep logging misses for targeted review.");
  }

  // Crossover detection
if (last.fluency < last.errorRate) {
  tips.push("CRITICAL: Errors exceed corrects - stop and reteach. This indicates guessing or confusion.");
}

// Ignore/junk detection (classic PT marker)
if (corrX && corrX > 1.5 && errX && errX > 1.5) {
  tips.push("Both accelerating rapidly - possible 'ignore' pattern. Check if learner is rushing without reading.");
}

// Retention check
if (chartData.length > 7) {
  const weekAgo = chartData[chartData.length - 8];
  if (last.fluency < weekAgo.fluency * 0.8) {
    tips.push("Performance dropped >20% from a week ago - review retention strategies.");
  }
}

// Low frequency + slow acceleration
if (last.fluency < 10 && corrX !== null && corrX < 1.25) {
  tips.push("Low frequency of corrects + slow acceleration — add brief untimed practice between daily timings. Use 'see item → say answer' drills during the day.");
}

// Moderate bounce
if (cv !== null && cv > 0.3 && cv <= 0.5) {
  tips.push("Moderate bounce — standardize the pre-timing routine. Try 2–3 quick practice items before starting.");
}

// Persistent errors
if (chartData.slice(-3).every(d => d.errorRate > 2)) {
  tips.push("Consistent errors >2/min for 3 days - create separate practice for frequently missed items. Consider errorless teaching procedures.");
}

// Error acceleration without correct acceleration
if (corrX && corrX < 1.1 && errX && errX > 1.2) {
  tips.push("Errors growing faster than corrects - possible fatigue or item confusion. Shorten timing to 30 seconds or clarify similar items.");
}

  return { picture, tips };
}

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading your progress...</div>
        </div>
      </div>
    );
  }

  const stats = getOverallStats();

  const cel = computeCorrectCeleration();

  return (
    <div className="min-h-screen bg-gray-50">

     {/* Header */}
<div className="bg-white shadow-sm border-b">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        Performance Analysis
      </h1>
      <p className="text-gray-600">Tracking and data-based decision analysis</p>
    </div>

    <div className="flex items-center gap-2">
      <Link
        href="/leaderboard"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Leaderboard
      </Link>
      <Link
        href="/"
        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        Return Home
      </Link>
    </div>
  </div>
</div>


      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {attempts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              No Quiz Attempts Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Complete some quizzes to see your progress here!
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Take Your First Quiz
            </button>
          </div>
        ) : (
          <>
            {/* Quiz Filter */}
            <div className="mb-6 bg-white rounded-lg shadow p-4">
              <label
                htmlFor="quiz-filter"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Filter by Topic:
              </label>
              <select
                id="quiz-filter"
                value={selectedQuiz}
                onChange={(e) => setSelectedQuiz(e.target.value)}
                className="w-full sm:w-auto px-3 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              >
               
                {getUniqueQuizzes().map(([quizId, title]) => (
                  <option key={quizId} value={quizId}>
                    {title}
                  </option>
                ))}
                 <option value="all">All Topics Combined</option>
              </select>
            </div>

            {/* Quiz-Specific Stats */}
            {stats && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {selectedQuiz === 'all'
                      ? 'All Quizzes Combined'
                      : getUniqueQuizzes().find(
                          ([id]) => id === selectedQuiz,
                        )?.[1]}{' '}
                    - Performance Summary
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.totalAttempts}
                    </div>
                    <div className="text-sm text-gray-600">Attempts</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.movingAvgAccuracy.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 leading-tight">
                        <span className="block">Moving Avg</span>
                        <span className="block">Last {stats.movingWindow}</span>
                        </div>
                  </div>
                
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats.bestAccuracy}%
                    </div>
                    <div className="text-sm text-gray-600">Best Accuracy</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.bestFluency.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">
                        <span className="block">Best Rate</span>
                         <span className="block">per Minute</span>
                        </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
  <div
    className={`text-2xl font-bold ${
      cel && cel.factorPerWeek >= 1 ? 'text-green-600' : 'text-red-600'
    }`}
  >
    {cel ? `×${cel.factorPerWeek.toFixed(2)}` : '—'}
  </div>
  <div className="text-sm text-gray-600">
    <span className="block">Fluency Trend</span>
    <span className="block">per Week</span>
  </div>
</div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div
                      className={`text-2xl font-bold ${
                        stats.accuracyImprovement >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {stats.accuracyImprovement > 0 ? '+' : ''}
                      {stats.accuracyImprovement.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Accuracy Trend</div>
                  </div>
                  
                </div>

                {/* Progress Graph */}
                {filteredAttempts.length > 1 && selectedQuiz !== 'all' && (
                  <div className="mb-8 bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Progress Over Time
                      </h3>
                      <button
                        onClick={() => setShowGraph(!showGraph)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        {showGraph ? 'Hide Graph' : 'Show Graph'}
                      </button>
                    </div>

                    {showGraph && (
                      <div className="mt-4">
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit mb-4">
                          <button
                            onClick={() => setChartType('fluency')}
                            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                              chartType === 'fluency'
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Fluency Chart
                          </button>
                          <button
                            onClick={() => setChartType('accuracy')}
                            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                              chartType === 'accuracy'
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Accuracy Chart
                          </button>
                        </div>

                        {chartType === 'fluency' ? (
                          <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Fluency
                            </h3>

    {/* From-date control */}
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <label className="text-sm text-gray-600">Show celeration from:</label>
      <input
        type="date"
        className="px-2 py-1 border rounded text-sm"
        min={dateRange?.min}
        max={dateRange?.max}
        value={fromDate ?? ''}
        onChange={(e) => setFromDate(e.target.value || null)}
      />
      {fromDate && (
        <button
          onClick={() => setFromDate(null)}
          className="text-sm text-gray-600 underline"
        >
          Reset
        </button>
      )}
    </div>


                            {/* responsive wrapper */}
  <div className="w-full aspect-[1000/550]">
    <svg
      viewBox="0 0 1000 550"
      className="w-full h-full bg-white"
      preserveAspectRatio="xMidYMid meet"
    >
                              {(() => {
                                type SCCDatum = {
                                  t: number;  
                                  dateLabel: string;
                                  fluency: number;
                                  errors: number;
                                  errorRate: number;
                                };

                                const processDataForSCC = (): SCCDatum[] => {
  const daily = new Map<string, SCCDatum>(); // key per calendar day
  filteredAttempts.slice().reverse().forEach((attempt) => {
    const ts = new Date(attempt.completed_at).getTime();
    const dayKey = new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD
    if (!daily.has(dayKey)) {
      daily.set(dayKey, {
        t: ts,
        dateLabel: new Date(ts).toLocaleDateString(),
        fluency: attempt.fluency_rate,
        errors: attempt.total_questions - attempt.correct_answers,
        errorRate:
          (attempt.total_questions - attempt.correct_answers) /
          (attempt.total_time_minutes || 1),
      });
    }
  });
  return Array.from(daily.values());
};
                                const chartData = processDataForSCC();
                                const chartHeight = 420;
                                const chartWidth = 750;
                                const startX = 140;
                                const startY = 40;

                                const errorAim = 1; // incorrects per minute ceiling  ← add this here

                                const minLog = -1;
                                const maxLog = 2;
                                const logRange = maxLog - minLog;

                                // --- calendar-based X positioning ---
                                const dayMs = 86_400_000;
const firstT = chartData.length ? chartData[0].t : 0;

const daysSince = (t: number) =>
  firstT ? Math.max(0, Math.floor((t - firstT) / dayMs)) : 0;

const spanDays = chartData.length
  ? Math.max(1, daysSince(chartData[chartData.length - 1].t))
  : 1;

const offsetDays = 1; // left pad in “days”
const daysToShow = Math.max(140, spanDays);
const xStep = chartWidth / (daysToShow + offsetDays);
const xOffset = offsetDays * xStep;

const xAt = (t: number) => startX + xOffset + daysSince(t) * xStep;

// 3a — split by selected date
const startT = fromDate ? Date.parse(fromDate + 'T00:00:00Z') : NaN;
const hasStart = Number.isFinite(startT);
const preData  = hasStart ? chartData.filter(d => d.t <  startT) : [];
const postData = hasStart ? chartData.filter(d => d.t >= startT) : chartData;

                                const toLogY = (value: number): number => {
                                  if (value <= 0)
                                    return startY + chartHeight;
                                  const logValue = Math.log10(
                                    Math.max(0.1, value),
                                  );
                                  const normalized =
                                    (logValue - minLog) / logRange;
                                  return (
                                    startY +
                                    chartHeight -
                                    normalized * chartHeight
                                  );
                                };

const calculateCeleration = (
  data: SCCDatum[],
  useErrors: boolean = false,
): { slope: number; intercept: number } | null => {
  if (data.length < 2) return null;

const firstT = data[0].t;
const xWeeks = data.map(d => (d.t - firstT) / (7 * dayMs));
const yVals  = data.map(d => Math.log10(Math.max(0.1, useErrors ? d.errorRate : d.fluency)));

  const n = xWeeks.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    const x = xWeeks[i], y = yVals[i];
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom; // pp on log10 scale per week
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
};

        // 3b — celerations before/after the selected date
const correctCelBefore = preData.length  > 1 ? calculateCeleration(preData)        : null;
const errorCelBefore   = preData.length  > 1 ? calculateCeleration(preData, true) : null;
const correctCelAfter  = postData.length > 1 ? calculateCeleration(postData)       : null;
const errorCelAfter    = postData.length > 1 ? calculateCeleration(postData, true): null;


                                
                                const getIdealProjection = (): number | null => {
                                  if (!chartData.length) return null;
                                  const lastData =
                                    chartData[chartData.length - 1];
                                  const daysSinceStart =
                                    chartData.length - 1;
                                  const idealMultiplier = Math.pow(
                                    1.4,
                                    daysSinceStart / 7,
                                  );
                                  return lastData.fluency * idealMultiplier;
                                };
                                const nextTarget: number | null = getIdealProjection();


                                return (
                                  <g>
                                    <defs>
                                      <linearGradient
                                        id="blueGradient"
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="0%"
                                      >
                                        <stop
                                          offset="0%"
                                          stopColor="#3B82F6"
                                        />
                                        <stop
                                          offset="100%"
                                          stopColor="#8B5CF6"
                                        />
                                      </linearGradient>
                                      <linearGradient
                                        id="greenGradient"
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="0%"
                                      >
                                        <stop
                                          offset="0%"
                                          stopColor="#10B981"
                                        />
                                        <stop
                                          offset="100%"
                                          stopColor="#34D399"
                                        />
                                      </linearGradient>
                                      <linearGradient
                                        id="subtle-bg"
                                        x1="0%"
                                        y1="0%"
                                        x2="0%"
                                        y2="100%"
                                      >
                                        <stop
                                          offset="0%"
                                          stopColor="#FAFBFC"
                                        />
                                        <stop
                                          offset="100%"
                                          stopColor="#F9FAFB"
                                        />
                                      </linearGradient>
                                    </defs>

                                    <rect
                                      x={startX}
                                      y={startY}
                                      width={chartWidth}
                                      height={chartHeight}
                                      fill="url(#subtle-bg)"
                                      stroke="#E5E7EB"
                                      strokeWidth="1"
                                      rx="8"
                                    />

                                    {[0.1, 1, 10, 100].map((rate) => {
                                      const y = toLogY(rate);
                                      return (
                                        <g key={rate}>
                                          <line
                                            x1={startX}
                                            y1={y}
                                            x2={startX + chartWidth}
                                            y2={y}
                                            stroke="#374151"
                                            strokeWidth="1.5"
                                          />
                                          <text
                                            x={startX - 15}
                                            y={y + 4}
                                            textAnchor="end"
                                            fontSize="13"
                                            fill="#374151"
                                            fontWeight={600}
                                          >
                                            {rate}
                                          </text>
                                        </g>
                                      );
                                    })}

                                    {[
                                      0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 2,
                                      3, 4, 5, 6, 7, 8, 9, 20, 30, 40, 50, 60,
                                      70, 80, 90,
                                    ].map((rate) => {
                                      if (rate >= 0.1 && rate <= 100) {
                                        const y = toLogY(rate);
                                        return (
                                          <line
                                            key={rate}
                                            x1={startX}
                                            y1={y}
                                            x2={startX + chartWidth}
                                            y2={y}
                                            stroke="#E5E7EB"
                                            strokeWidth="0.5"
                                          />
                                        );
                                      }
                                      return null;
                                    })}

                                    <line
                                      x1={startX}
                                      y1={toLogY(20)}
                                      x2={startX + chartWidth}
                                      y2={toLogY(20)}
                                      stroke="#10B981"
                                      strokeWidth="1"
                                      strokeDasharray="10,5"
                                    />
                                    <text
                                      x={startX + chartWidth - 140}
                                      y={toLogY(20) - 8}
                                      fontSize="13"
                                      fill="#059669"
                                      fontWeight={600}
                                    >
                                      Correct aim: 20/min
                                    </text>
                                    <line
                                    x1={startX}
                                    y1={toLogY(errorAim)}
                                    x2={startX + chartWidth}
                                    y2={toLogY(errorAim)}
                                    stroke="#EF4444"
                                     strokeWidth="1"
                                     strokeDasharray="10,5"
                                    />
                                     <text
                                       x={startX + chartWidth - 140}
                                       y={toLogY(errorAim) + 20}
                                       fontSize="13"
                                       fill="#EF4444"
                                       fontWeight="600"
                                     >
                                     Incorrect aim: ≤{errorAim}/min
                                     </text>

                                   {Array.from({ length: Math.ceil(daysToShow / 7) }, (_, i) => i + 1).map(week => {
  const x = startX + xOffset + week * 7 * xStep;
  return (
    <g key={week}>
      <line x1={x} y1={startY} x2={x} y2={startY + chartHeight} stroke="#E5E7EB" strokeWidth="1" />
      <text x={x} y={startY + chartHeight + 20} textAnchor="middle" fontSize="11" fill="#6B7280">
        {week}
      </text>
    </g>
  );
})}

      {hasStart && (
  <g>
    <line
      x1={xAt(startT)} y1={startY} x2={xAt(startT)} y2={startY + chartHeight}
      stroke="#10B981" strokeWidth="1" strokeDasharray="4,3"
    />
    <text x={xAt(startT) + 6} y={startY + 14} fontSize="12" fill="#065F46">From here</text>
  </g>
)}
                              

                                    {chartData.map((d, i) => {
  const faded = hasStart && d.t < startT;
  return (
    <g key={`correct-${i}`} opacity={faded ? 0.25 : 1}>
      <circle cx={xAt(d.t)} cy={toLogY(d.fluency)} r="4" fill="url(#blueGradient)" stroke="#fff" strokeWidth="2" />
      <title>{`${d.dateLabel}: ${d.fluency.toFixed(1)} correct/min`}</title>
    </g>
  );
})}


                                    {chartData.map((d, i) => {
  if (d.errorRate <= 0) return null;
  const faded = hasStart && d.t < startT; // dim points before selected date
  return (
    <g key={`error-${i}`} opacity={faded ? 0.25 : 1}>
      <text
        x={xAt(d.t)}
        y={toLogY(d.errorRate) + 4}
        textAnchor="middle"
        fontSize="14"          // keep your current size
        fill="#EF4444"
        fontWeight="bold"
      >
        ×
      </text>
      <title>{`${d.dateLabel}: ${d.errorRate.toFixed(1)} errors/min`}</title>
    </g>
  );
})}


                                  {/* BEFORE (faint, dashed) */}
{hasStart && correctCelBefore && preData.length > 1 && (
  <line
    x1={xAt(preData[0].t)}
    y1={toLogY(Math.pow(10, correctCelBefore.intercept))}
    x2={xAt(preData[preData.length - 1].t)}
    y2={toLogY(Math.pow(
      10,
      correctCelBefore.intercept +
      correctCelBefore.slope *
      ((preData[preData.length - 1].t - preData[0].t) / (7 * dayMs))
    ))}
    stroke="#6B7280"
    strokeWidth="2"
    strokeDasharray="6,4"
    opacity="0.6"
  />
)}

{hasStart && errorCelBefore && preData.length > 1 && (
  <line
    x1={xAt(preData[0].t)}
    y1={toLogY(Math.pow(10, errorCelBefore.intercept))}
    x2={xAt(preData[preData.length - 1].t)}
    y2={toLogY(Math.pow(
      10,
      errorCelBefore.intercept +
      errorCelBefore.slope *
      ((preData[preData.length - 1].t - preData[0].t) / (7 * dayMs))
    ))}
    stroke="#EF4444"
    strokeWidth="2"
    strokeDasharray="6,4"
    opacity="0.6"
  />
)}

{/* AFTER (main, dashed) */}
{correctCelAfter && postData.length > 1 && (
  <line
    x1={xAt(postData[0].t)}
    y1={toLogY(Math.pow(10, correctCelAfter.intercept))}
    x2={xAt(postData[postData.length - 1].t)}
    y2={toLogY(Math.pow(
      10,
      correctCelAfter.intercept +
      correctCelAfter.slope *
      ((postData[postData.length - 1].t - postData[0].t) / (7 * dayMs))
    ))}
    stroke="url(#blueGradient)"
    strokeWidth="2"
    strokeDasharray="5,5"
    opacity="0.9"
  />
)}

{errorCelAfter && postData.length > 1 && (
  <line
    x1={xAt(postData[0].t)}
    y1={toLogY(Math.pow(10, errorCelAfter.intercept))}
    x2={xAt(postData[postData.length - 1].t)}
    y2={toLogY(Math.pow(
      10,
      errorCelAfter.intercept +
      errorCelAfter.slope *
      ((postData[postData.length - 1].t - postData[0].t) / (7 * dayMs))
    ))}
    stroke="#EF4444"
    strokeWidth="2"
    strokeDasharray="5,5"
    opacity="0.9"
  />
)}


                                    <text
                                      x={startX + chartWidth / 2}
                                      y={startY + chartHeight + 55}
                                      textAnchor="middle"
                                      fontSize="14"
                                      fill="#374151"
                                      fontWeight={600}
                                    >
                                      SUCCESSIVE CALENDAR WEEKS
                                    </text>

                                    <text
                                      x={60}
                                      y={startY + chartHeight / 2}
                                      textAnchor="middle"
                                      fontSize="14"
                                      fill="#374151"
                                      fontWeight={600}
                                      transform={`rotate(-90, 60, ${
                                        startY + chartHeight / 2
                                      })`}
                                    >
                                      COUNT PER MINUTE
                                    </text>

                                  <g transform={`translate(${startX + chartWidth - 255}, ${startY +320})`}>
  <rect x="0" y="0" width="250" height={hasStart ? 90 : 70} fill="white" stroke="#E5E7EB" strokeWidth="1" rx="8"/>
  {hasStart ? (
    <>
      {correctCelAfter && (
        <text x="10" y="20" fontSize="12" fill="#3B82F6" fontWeight="500">
          Correct from chosen date: ×{Math.pow(10, correctCelAfter.slope).toFixed(2)}/wk
        </text>
      )}
      {correctCelBefore && (
        <text x="10" y="38" fontSize="12" fill="#6B7280" fontWeight="500">
          Correct before chosen date: ×{Math.pow(10, correctCelBefore.slope).toFixed(2)}/wk
        </text>
      )}
      {errorCelAfter && (
        <text x="10" y="56" fontSize="12" fill="#EF4444" fontWeight="500">
          Errors from chosen date: ×{Math.pow(10, errorCelAfter.slope).toFixed(2)}/wk
        </text>
      )}
      {errorCelBefore && (
        <text x="10" y="74" fontSize="12" fill="#EF4444" fontWeight="500">
          Error before chosen date: ×{Math.pow(10, errorCelBefore.slope).toFixed(2)}/wk
        </text>
      )}
    </>
  ) : (
    <>
      {correctCelAfter && (
        <text x="10" y="20" fontSize="12" fill="#3B82F6" fontWeight="500">
          Overall correct celeration: ×{Math.pow(10, correctCelAfter.slope).toFixed(2)}/wk
        </text>
      )}
      {errorCelAfter && (
        <text x="10" y="38" fontSize="12" fill="#EF4444" fontWeight="500">
          Overall error celeration ×{Math.pow(10, errorCelAfter.slope).toFixed(2)}/wk
        </text>
      )}
    </>
  )}
</g>

                                  </g>
                                );
                              })()}
                            </svg>
                            </div>
                             {/* 👇 PASTE THIS BLOCK *RIGHT AFTER* THE SVG WRAPPER */}
    {(() => {
      // Rebuild the daily SCC data from filteredAttempts (oldest -> newest)
     const daily = new Map<string, { t: number; fluency: number; errorRate: number }>();
  filteredAttempts.slice().reverse().forEach(a => {
    const t = new Date(a.completed_at).getTime();
    const key = new Date(t).toISOString().slice(0, 10);
    if (!daily.has(key)) {
      daily.set(key, {
        t,
        fluency: a.fluency_rate,
        errorRate: (a.total_questions - a.correct_answers) / (a.total_time_minutes || 1),
      });
    }
  });
  const chartData = Array.from(daily.values());

  // same calc you use in the SVG
  const dayMs = 86_400_000;
  const calc = (data: typeof chartData, useErrors = false) => {
    if (data.length < 2) return null;
    const first = data[0].t;
    const xWeeks = data.map(d => (d.t - first) / (7 * dayMs));
    const yVals  = data.map(d => Math.log10(Math.max(0.1, useErrors ? d.errorRate : d.fluency)));
    const n = xWeeks.length;
    let sumX=0,sumY=0,sumXY=0,sumX2=0;
    for (let i=0;i<n;i++){ const x=xWeeks[i], y=yVals[i]; sumX+=x; sumY+=y; sumXY+=x*y; sumX2+=x*x; }
    const denom = n*sumX2 - sumX*sumX;
    if (denom === 0) return null;
    const slope = (n*sumXY - sumX*sumY) / denom;
    const intercept = (sumY - slope*sumX) / n;
    return { slope, intercept };
  };

  const startT = fromDate ? Date.parse(fromDate + 'T00:00:00Z') : NaN;
const hasStart = Number.isFinite(startT);
const preData  = hasStart ? chartData.filter(d => d.t <  startT) : [];
const postData = hasStart ? chartData.filter(d => d.t >= startT) : chartData;

// ⛔ Guard: need at least 3 points to give advice
const MIN_ADVICE_POINTS = 3;
if (postData.length < MIN_ADVICE_POINTS) {
  return (
    <div className="mt-4 p-4 bg-white border border-gray-200 rounded text-gray-700">
      Insufficient data to provide data information about celeration trends
    </div>
  );
}

const correctCeleration = calc(postData);
const errorCeleration   = calc(postData, true);

const { picture, tips } = getPTAdviceForApp({
  chartData: postData,              // ← advice from the selected date onwards
  correctCeleration,
  errorCeleration,
  aimFluency: 25,
  aimError: 1,
});

if (hasStart && postData.length < 2) {
  tips.unshift("Not enough data after the selected date to estimate celeration.");
}

  if (!tips.length) return null;
  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
      {picture && <div className="text-xl font-semibold text-gray-900 mb-1">Pattern: {picture}</div>}
      <div className="text-xl font-semibold text-gray-900 mb-2">Suggested next steps</div>
      <ul className="list-disc pl-5 space-y-2 text-lg text-gray-800">
        {tips.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
})()}
    {/* ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ */}
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Accuracy Chart
                            </h3>
                           
                            {/* responsive wrapper */}
                                <div className="w-full aspect-[1000/550]">
                                    <svg
                                        viewBox="0 0 1000 550"
                                        className="w-full h-full bg-white"
                                        preserveAspectRatio="xMidYMid meet"
                                     >
                              {(() => {
                                const chartData = getProgressChartData();
                                const chartHeight = 420;
                                const chartWidth = 750;
                                const startX = 140;
                                const startY = 40;

                                const xStep =
                                  chartWidth /
                                  Math.max(chartData.length - 1, 1);

                                const toY = (percentage: number): number => {
                                  return (
                                    startY +
                                    chartHeight -
                                    (percentage / 100) * chartHeight
                                  );
                                };

                                return (
                                  <g>
                                    <defs>
                                      <linearGradient
                                        id="accuracyGradient"
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="0%"
                                      >
                                        <stop
                                          offset="0%"
                                          stopColor="#3B82F6"
                                        />
                                        <stop
                                          offset="100%"
                                          stopColor="#8B5CF6"
                                        />
                                      </linearGradient>
                                      <linearGradient
                                        id="greenAccuracyGradient"
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="0%"
                                      >
                                        <stop
                                          offset="0%"
                                          stopColor="#10B981"
                                        />
                                        <stop
                                          offset="100%"
                                          stopColor="#34D399"
                                        />
                                      </linearGradient>
                                      <linearGradient
                                        id="subtle-bg-accuracy"
                                        x1="0%"
                                        y1="0%"
                                        x2="0%"
                                        y2="100%"
                                      >
                                        <stop
                                          offset="0%"
                                          stopColor="#FAFBFC"
                                        />
                                        <stop
                                          offset="100%"
                                          stopColor="#F9FAFB"
                                        />
                                      </linearGradient>
                                    </defs>

                                    <rect
                                      x={startX}
                                      y={startY}
                                      width={chartWidth}
                                      height={chartHeight}
                                      fill="url(#subtle-bg-accuracy)"
                                      stroke="#E5E7EB"
                                      strokeWidth="1"
                                      rx="8"
                                    />

                                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(
                                      (pct) => (
                                        <g key={pct}>
                                          <line
                                            x1={startX}
                                            y1={toY(pct)}
                                            x2={startX + chartWidth}
                                            y2={toY(pct)}
                                            stroke={
                                              pct % 20 === 0
                                                ? '#9CA3AF'
                                                : '#E5E7EB'
                                            }
                                            strokeWidth={
                                              pct % 20 === 0 ? 1 : 0.5
                                            }
                                          />
                                          <text
                                            x={startX - 15}
                                            y={toY(pct) + 4}
                                            textAnchor="end"
                                            fontSize="13"
                                            fill="#374151"
                                            fontWeight={
                                              pct % 20 === 0 ? 600 : 400
                                            }
                                          >
                                            {pct}%
                                          </text>
                                        </g>
                                      ),
                                    )}

                                    <line
                                      x1={startX}
                                      y1={toY(90)}
                                      x2={startX + chartWidth}
                                      y2={toY(90)}
                                      stroke="#10B981"
                                      strokeWidth="2"
                                      strokeDasharray="10,5"
                                    />
                                    <text
                                      x={startX + 15}
                                      y={toY(80) - 8}
                                      fontSize="13"
                                      fill="#059669"
                                      fontWeight={600}
                                    >
                                      Target: 90%
                                    </text>

                                    {chartData.map((_, i) => (
                                      <line
                                        key={i}
                                        x1={startX + i * xStep}
                                        y1={startY}
                                        x2={startX + i * xStep}
                                        y2={startY + chartHeight}
                                        stroke="#F3F4F6"
                                        strokeWidth="0.5"
                                      />
                                    ))}

                                    <polyline
                                      fill="none"
                                      stroke="#000"
                                      strokeWidth="1"
                                      strokeLinejoin="round"
                                      strokeLinecap="round"
                                      points={chartData
                                        .map(
                                          (d, i) =>
                                            `${startX + i * xStep},${toY(
                                              d.accuracy,
                                            )}`,
                                        )
                                        .join(' ')}
                                    />

                                    {chartData.map((d, i) => (
                                      <g key={i}>
                                        <circle
                                          cx={startX + i * xStep}
                                          cy={toY(d.accuracy)}
                                          r="5"
                                          fill={
                                            d.accuracy >= 90
                                              ? '#10B981'
                                              : '#EF4444'
                                          }
                                          stroke="#fff"
                                          strokeWidth="2"
                                        />
                                        <title>{`${d.date}: ${d.accuracy}% accuracy`}</title>
                                      </g>
                                    ))}

                                    <text
                                      x={startX + chartWidth / 2}
                                      y={startY + chartHeight + 55}
                                      textAnchor="middle"
                                      fontSize="14"
                                      fill="#374151"
                                      fontWeight={600}
                                    >
                                      QUIZ ATTEMPTS
                                    </text>

                                    <text
                                      x={60}
                                      y={startY + chartHeight / 2}
                                      textAnchor="middle"
                                      fontSize="14"
                                      fill="#374151"
                                      fontWeight={600}
                                      transform={`rotate(-90, 60, ${
                                        startY + chartHeight / 2
                                      })`}
                                    >
                                      ACCURACY PERCENTAGE
                                    </text>

                                    {(() => {
                                      const WINDOW = 5; // last N attempts
const k = Math.min(WINDOW, chartData.length);
const movingAvg =
  k > 0 ? chartData.slice(-k).reduce((s, d) => s + d.accuracy, 0) / k : 0;

const trend =
  k > 1
    ? chartData[chartData.length - 1].accuracy -
      chartData[chartData.length - k].accuracy
    : 0;

                                      return (
                                        <g
                                          transform={`translate(${
                                            startX + chartWidth - 220
                                          }, ${startY + 340})`}
                                        >
                                          <rect
                                            x="0"
                                            y="0"
                                            width="200"
                                            height="70"
                                            fill="white"
                                            stroke="#E5E7EB"
                                            strokeWidth="1"
                                            rx="8"
                                          />
                                          <text
                                            x="10"
                                            y="20"
                                            fontSize="12"
                                            fill="#6B7280"
                                            fontWeight={500}
                                          >
                                            Moving Avg (last {k}): {movingAvg.toFixed(1)}%
                                          </text>
                                          <text
                                            x="10"
                                            y="38"
                                            fontSize="12"
                                            fill={
                                              trend >= 0
                                                ? '#10B981'
                                                : '#EF4444'
                                            }
                                            fontWeight={500}
                                          >
                                            Trend:{' '}
                                            {trend >= 0 ? '+' : ''}
                                            {trend.toFixed(1)}%
                                          </text>
                                          <text
                                            x="10"
                                            y="56"
                                            fontSize="12"
                                            fill="#6B7280"
                                            fontWeight={500}
                                          >
                                            Attempts: {chartData.length}
                                          </text>
                                        </g>
                                      );
                                    })()}
                                  </g>
                                );
                              })()}
                            </svg>
                          </div>
                        </div>
                        )}


                        <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm">
                          {chartType === 'fluency' ? (
                            <>
                              <h4 className="font-semibold text-sm mb-3 text-gray-800">
                                Standard Celeration Chart Key:
                              </h4>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-sm"></div>
                                    <span className="text-gray-700">
                                      Correct responses
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-red-500 font-bold text-base">
                                      ×
                                    </span>
                                    <span className="text-gray-700">
                                      Error responses
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-0.5 bg-gradient-to-r from-green-500 to-green-400"></div>
                                    <span className="text-gray-700">
                                      Aim line (20/min)
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-0 border-t-2 border-blue-500 border-dashed"></div>
                                    <span className="text-gray-700">
                                      Celeration lines
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full border-2 border-green-500 border-dashed"></div>
                                    <span className="text-gray-700">
                                      Ideal next performance
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-3 italic">
                                Logarithmic scale (0.1-100/min) • One data point recorded per
                                day (first attempt) • ×1.4/week = excellent progress
                              </p>
                            </>
                          ) : (
                            <>
                              <h4 className="font-semibold text-sm mb-3 text-gray-800">
                                Accuracy Chart Key:
                              </h4>
                              <div className="flex flex-wrap gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-400 rounded-full shadow-sm"></div>
                                  <span className="text-gray-700">
                                    ≥90% (Target met)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
                                  <span className="text-gray-700">
                                    &lt;90% (Below target)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-0.5 bg-black"></div>
                                  <span className="text-gray-700">
                                    Performance line
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-3 italic">
                                Linear scale (0-100%) • Shows accuracy trend
                                over attempts
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

