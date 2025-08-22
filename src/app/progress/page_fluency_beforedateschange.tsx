'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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
  const [showGraph, setShowGraph] = useState(false);
  const [chartType, setChartType] = useState<'fluency' | 'accuracy'>('fluency');
  const { user } = useAuth();
  const router = useRouter();
  const loadingRef = useRef(false);

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
      }
    } catch (err) {
      console.error('Error in loadAttempts:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

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

  const getPerformanceColor = (accuracy: number, fluency: number): string => {
    if (accuracy >= 80 && fluency >= 30) return 'text-green-600 bg-green-50';
    if (accuracy >= 60 && fluency >= 20) return 'text-yellow-600 bg-yellow-50';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Progress History
            </h1>
            <p className="text-gray-600">
              Track your quiz performance over time
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Return Home
          </button>
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
                Filter by Quiz:
              </label>
              <select
                id="quiz-filter"
                value={selectedQuiz}
                onChange={(e) => setSelectedQuiz(e.target.value)}
                className="w-full sm:w-auto px-3 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              >
                <option value="all">All Quizzes Combined</option>
                {getUniqueQuizzes().map(([quizId, title]) => (
                  <option key={quizId} value={quizId}>
                    {title}
                  </option>
                ))}
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
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.avgFluency.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Avg Fluency</div>
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
                    <div className="text-sm text-gray-600">Best Fluency</div>
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
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div
                      className={`text-2xl font-bold ${
                        stats.fluencyImprovement >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {stats.fluencyImprovement > 0 ? '+' : ''}
                      {stats.fluencyImprovement.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Fluency Trend</div>
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
                              Standard Celeration Chart - Fluency
                            </h3>
                            <svg
                              width="100%"
                              height="550"
                              viewBox="0 0 1000 550"
                              className="bg-white"
                            >
                              {(() => {
                                type SCCDatum = {
                                  date: string;
                                  fluency: number;
                                  errors: number;
                                  errorRate: number;
                                };

                                const processDataForSCC = (): SCCDatum[] => {
                                  const dailyData = new Map<string, SCCDatum>();

                                  filteredAttempts
                                    .slice()
                                    .reverse()
                                    .forEach((attempt) => {
                                      const date = new Date(
                                        attempt.completed_at,
                                      ).toLocaleDateString();
                                      if (!dailyData.has(date)) {
                                        dailyData.set(date, {
                                          date,
                                          fluency: attempt.fluency_rate,
                                          errors:
                                            attempt.total_questions -
                                            attempt.correct_answers,
                                          errorRate:
                                            (attempt.total_questions -
                                              attempt.correct_answers) /
                                            (attempt.total_time_minutes || 1),
                                        });
                                      }
                                    });

                                  return Array.from(dailyData.values());
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

                                const daysToShow = 140;
                                const xStep = chartWidth / daysToShow;
                                const xOffset = xStep * 2;

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
                                ):
                                  | { slope: number; intercept: number }
                                  | null => {
                                  if (data.length < 2) return null;

                                  const values = data.map((d) =>
                                    Math.log10(
                                      Math.max(
                                        0.1,
                                        useErrors ? d.errorRate : d.fluency,
                                      ),
                                    ),
                                  );
                                  const n = values.length;

                                  let sumX = 0,
                                    sumY = 0,
                                    sumXY = 0,
                                    sumX2 = 0;
                                  values.forEach((y, x) => {
                                    sumX += x;
                                    sumY += y;
                                    sumXY += x * y;
                                    sumX2 += x * x;
                                  });

                                  const denom = n * sumX2 - sumX * sumX;
                                  if (denom === 0) return null;

                                  const slope =
                                    (n * sumXY - sumX * sumY) / denom;
                                  const intercept = (sumY - slope * sumX) / n;

                                  // scale slope to per-week (×7)
                                  return { slope: slope * 7, intercept };
                                };

                                const correctCeleration =
                                  calculateCeleration(chartData);
                                const errorCeleration =
                                  calculateCeleration(chartData, true);

                                
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
                                      y1={toLogY(25)}
                                      x2={startX + chartWidth}
                                      y2={toLogY(25)}
                                      stroke="#10B981"
                                      strokeWidth="1"
                                      strokeDasharray="10,5"
                                    />
                                    <text
                                      x={startX + chartWidth - 140}
                                      y={toLogY(25) - 8}
                                      fontSize="13"
                                      fill="#059669"
                                      fontWeight={600}
                                    >
                                      Correct aim: 25/min
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

                                    {Array.from(
                                      { length: 20 },
                                      (_unused: unknown, i: number) => i + 1,
                                    ).map((week) => {
                                      const x =
                                        startX + week * 7 * xStep;
                                      return (
                                        <g key={week}>
                                          <line
                                            x1={x}
                                            y1={startY}
                                            x2={x}
                                            y2={startY + chartHeight}
                                            stroke="#E5E7EB"
                                            strokeWidth="1"
                                          />
                                          <text
                                            x={x}
                                            y={startY + chartHeight + 20}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill="#6B7280"
                                          >
                                            {week}
                                          </text>
                                        </g>
                                      );
                                    })}

                                    

                                    {chartData.map((d, i) => (
                                      <g key={`correct-${i}`}>
                                        <circle
                                          cx={
                                            startX + xOffset + i * xStep
                                          }
                                          cy={toLogY(d.fluency)}
                                          r="4"
                                          fill="url(#blueGradient)"
                                          stroke="#fff"
                                          strokeWidth="2"
                                        />
                                        <title>{`${d.date}: ${d.fluency.toFixed(
                                          1,
                                        )} correct/min`}</title>
                                      </g>
                                    ))}

                                    {chartData.map((d, i) => {
                                      if (d.errorRate > 0) {
                                        return (
                                          <g key={`error-${i}`}>
                                            <text
                                              x={
                                                startX +
                                                xOffset +
                                                i * xStep
                                              }
                                              y={
                                                toLogY(d.errorRate) + 4
                                              }
                                              textAnchor="middle"
                                              fontSize="10"
                                              fill="#EF4444"
                                              fontWeight="bold"
                                            >
                                              ×
                                            </text>
                                            <title>{`${d.date}: ${d.errorRate.toFixed(
                                              1,
                                            )} errors/min`}</title>
                                          </g>
                                        );
                                      }
                                      return null;
                                    })}

                                    {correctCeleration &&
                                      chartData.length > 2 && (
                                        <line
                                          x1={startX + xOffset}
                                          y1={toLogY(
                                            Math.pow(
                                              10,
                                              correctCeleration.intercept,
                                            ),
                                          )}
                                          x2={
                                            startX +
                                            xOffset +
                                            (chartData.length - 1) * xStep
                                          }
                                          y2={toLogY(
                                            Math.pow(
                                              10,
                                              correctCeleration.intercept +
                                                (correctCeleration.slope *
                                                  (chartData.length - 1)) /
                                                  7,
                                            ),
                                          )}
                                          stroke="url(#blueGradient)"
                                          strokeWidth="2"
                                          strokeDasharray="5,5"
                                          opacity="0.8"
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

                                    <g transform={`translate(${startX + chartWidth - 210}, ${startY + 340})`}>
                                        <rect x="0" y="0" width="200" height="70" fill="white" stroke="#E5E7EB" strokeWidth="1" rx="8" />
                                    {correctCeleration && (
                                     <text x="10" y="20" fontSize="12" fill="#3B82F6" fontWeight="500">
                                             Correct celeration: ×{Math.pow(10, correctCeleration.slope).toFixed(2)}/week
                                     </text>
                                    )}
                                        {errorCeleration && (
                                     <text x="10" y="38" fontSize="12" fill="#EF4444" fontWeight="500">
                                         Error celeration: ×{Math.pow(10, errorCeleration.slope).toFixed(2)}/week
                                     </text>
                                     )}
                                     <text x="10" y="56" fontSize="12" fill="#111827" fontWeight="500">
                                     Next timing target: {nextTarget ? nextTarget.toFixed(1) : '—'}/min
                                     </text>
                                    </g>

                                  </g>
                                );
                              })()}
                            </svg>
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Accuracy Chart
                            </h3>
                            <svg
                              width="100%"
                              height="550"
                              viewBox="0 0 1000 550"
                              className="bg-white"
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
                                      Aim line (25/min)
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
                                Logarithmic scale (0.1-100/min) • One point per
                                day • ×1.4/week = excellent progress
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
                                    ≥80% (Target met)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
                                  <span className="text-gray-700">
                                    &lt;80% (Below target)
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