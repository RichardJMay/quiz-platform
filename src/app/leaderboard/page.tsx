'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type LeaderRow = {
  quiz_id: string;
  title: string;
  yourBestRaw: number;
  globalBestRaw: number;
  yourBestStreak: number;
  yourCurrentStreak: number;
};

const toLondonDateKey = (iso: string) => {
  const d = new Date(
    new Date(iso).toLocaleString('en-US', { timeZone: 'Europe/London' }),
  );
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDaysKey = (yyyyMmDd: string, delta: number) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

function computeBestAndCurrentStreak(
  londonDayKeys: string[],
): { best: number; current: number } {
  if (londonDayKeys.length === 0) return { best: 0, current: 0 };

  const uniq = Array.from(new Set(londonDayKeys)).sort();

  let best = 1;
  let run = 1;

  for (let i = 1; i < uniq.length; i++) {
    const prev = uniq[i - 1];
    const expectedNext = addDaysKey(prev, 1);

    if (uniq[i] === expectedNext) {
      run += 1;
    } else {
      if (run > best) best = run;
      run = 1;
    }
  }

  if (run > best) best = run;

  const todayLDN = toLondonDateKey(new Date().toISOString());
  const playedToday = uniq.includes(todayLDN);
  const yesterdayLDN = addDaysKey(todayLDN, -1);
  const playedYesterday = uniq.includes(yesterdayLDN);

  let anchor: string | null = null;

  if (playedToday) anchor = todayLDN;
  else if (playedYesterday) anchor = yesterdayLDN;

  let current = 0;

  if (anchor) {
    current = 1;
    let nextDay = addDaysKey(anchor, -1);

    while (uniq.includes(nextDay)) {
      current += 1;
      nextDay = addDaysKey(nextDay, -1);
    }
  }

  return { best, current };
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function loadLeaderboard() {
      if (!user) {
        router.push('/');
        return;
      }

      setLoading(true);

      try {
        const { data: participant, error: participantError } = await supabase
          .from('study_participants')
          .select('condition, study_active')
          .eq('user_id', user.id)
          .single();

        if (
          participantError ||
          !participant ||
          participant.study_active !== true ||
          participant.condition !== 'leaderboard'
        ) {
          router.push('/progress');
          return;
        }

        setAllowed(true);
        setAccessChecked(true);

        const { data: attempts, error } = await supabase
          .from('quiz_attempts')
          .select(
            `
            quiz_id,
            fluency_rate,
            completed_at,
            quizzes!inner(title)
          `,
          )
          .eq('user_id', user.id);

        if (error) throw error;

        type Yours = {
          title: string;
          bestFluency: number;
          days: string[];
        };

        const yourByQuiz = new Map<string, Yours>();

        (attempts || []).forEach((a: any) => {
          const qid = a.quiz_id as string;
          const title = a.quizzes?.title ?? 'Untitled quiz';
          const prev = yourByQuiz.get(qid);
          const dayKey = toLondonDateKey(a.completed_at);

          if (!prev) {
            yourByQuiz.set(qid, {
              title,
              bestFluency: a.fluency_rate ?? 0,
              days: [dayKey],
            });
          } else {
            prev.bestFluency = Math.max(prev.bestFluency, a.fluency_rate ?? 0);
            prev.days.push(dayKey);
          }
        });

        const quizIds = Array.from(yourByQuiz.keys());

        if (quizIds.length === 0) {
          setRows([]);
          return;
        }

        const { data: gbRows, error: gErr } = await supabase.rpc(
          'get_global_bests',
          { quiz_ids: quizIds },
        );

        if (gErr) throw gErr;

        const globalBestFluency = new Map<string, number>();

        (gbRows || []).forEach((r: any) => {
          globalBestFluency.set(r.quiz_id, Number(r.global_best) || 0);
        });

        const composed: LeaderRow[] = quizIds
          .map((qid) => {
            const y = yourByQuiz.get(qid)!;
            const { best: yourBestStreak, current: yourCurrentStreak } =
              computeBestAndCurrentStreak(y.days);

            return {
              quiz_id: qid,
              title: y.title,
              yourBestRaw: y.bestFluency,
              globalBestRaw: globalBestFluency.get(qid) ?? y.bestFluency,
              yourBestStreak,
              yourCurrentStreak,
            };
          })
          .sort((a, b) => b.yourBestRaw - a.yourBestRaw);

        setRows(composed);
      } catch (e) {
        console.error('Leaderboard error:', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    void loadLeaderboard();
  }, [user, router]);

  if (!accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-700">Checking access...</div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const leadCount = rows.filter((r) => r.yourBestRaw >= r.globalBestRaw).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* page-load + bar fill animations (subtle, one-shot) */}
      <style jsx>{`
        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes barGrow {
          from {
            width: 0%;
          }
        }
        .rise {
          animation: riseIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .bar-fill {
          animation: barGrow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white text-xl shadow-sm">
              🏆
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Leaderboard
            </h1>
          </div>

          <div className="flex gap-2">
            <Link
              href="/progress"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Progress
            </Link>

            <Link
              href="/"
              className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Explainer */}
        <div className="rise rounded-2xl overflow-hidden border border-amber-200 shadow-sm">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-5 sm:px-6 py-5 border-b border-amber-100">
            <h2 className="text-lg font-bold text-gray-900">
              How the leaderboard works
            </h2>
            <p className="text-sm text-gray-700 mt-1">
              Your quizzes are ranked by <span className="font-semibold">speed with accuracy</span> &mdash; correct
              answers per minute (c/min) &mdash; and your score is measured against{' '}
              <span className="font-semibold">everyone else using the platform</span>. Your strongest quiz sits
              at the top. Close the gap to the platform&rsquo;s best and the crown is yours.
            </p>
          </div>

          <div className="bg-white px-5 sm:px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm text-gray-700">
              <div className="flex gap-3">
                <span className="text-lg leading-none mt-0.5">🎯</span>
                <p>
                  <span className="font-bold text-gray-900">Your best</span> &mdash; your fastest accurate run on
                  a quiz, in correct answers per minute (c/min).
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg leading-none mt-0.5">🌍</span>
                <p>
                  <span className="font-bold text-gray-900">Platform top</span> &mdash; the best c/min recorded by
                  any user on that quiz. Fully anonymous; no names are ever shown.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg leading-none mt-0.5">📊</span>
                <p>
                  <span className="font-bold text-gray-900">Standing</span> &mdash; the bar fills as you close in
                  on the platform top. The number shows how many c/min you are off the top spot.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg leading-none mt-0.5">🔥</span>
                <p>
                  <span className="font-bold text-gray-900">Streaks</span> &mdash; days in a row you&rsquo;ve
                  practised, by London calendar day. Several goes in one day still count as one.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick status strip */}
        {rows.length > 0 && (
          <div className="rise grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{rows.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Quizzes ranked</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-amber-500">{leadCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Top spots held</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">
                {Math.max(0, ...rows.map((r) => r.yourCurrentStreak))}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Longest live streak</div>
            </div>
          </div>
        )}

        {/* Rows */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Your quizzes</h3>
            {loading && <span className="text-sm text-gray-500">Loading…</span>}
          </div>

          {rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
              <div className="text-5xl mb-3">🚀</div>
              <p className="text-gray-700 font-medium">No attempts yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Complete a quiz to claim your place on the leaderboard.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[680px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                      <th className="py-3 pl-5 pr-2 w-10 font-semibold">#</th>
                      <th className="py-3 px-2 font-semibold">Quiz</th>
                      <th className="py-3 px-2 text-right font-semibold whitespace-nowrap">
                        Your best
                      </th>
                      <th className="py-3 px-2 text-right font-semibold whitespace-nowrap">
                        Platform top
                      </th>
                      <th className="py-3 px-2 font-semibold w-[32%]">
                        Standing
                      </th>
                      <th className="py-3 px-2 pr-5 text-right font-semibold whitespace-nowrap">
                        Streak
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row, i) => {
                      const youLead = row.yourBestRaw >= row.globalBestRaw;
                      const pct =
                        row.globalBestRaw > 0
                          ? Math.min(100, (row.yourBestRaw / row.globalBestRaw) * 100)
                          : 100;
                      const gap = Math.max(0, row.globalBestRaw - row.yourBestRaw);

                      return (
                        <tr
                          key={row.quiz_id}
                          className="rise border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors"
                          style={{ animationDelay: `${Math.min(i * 35, 280)}ms` }}
                        >
                          {/* rank */}
                          <td className="py-3 pl-5 pr-2">
                            <span
                              className={`inline-grid place-items-center h-6 w-6 rounded-full text-xs font-bold ${
                                i === 0
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {i + 1}
                            </span>
                          </td>

                          {/* quiz title + crown */}
                          <td className="py-3 px-2 font-medium text-gray-900">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate">{row.title}</span>
                              {youLead && (
                                <span
                                  className="shrink-0"
                                  title="You hold the platform top score"
                                >
                                  👑
                                </span>
                              )}
                            </div>
                          </td>

                          {/* your best */}
                          <td className="py-3 px-2 text-right font-bold text-gray-900 whitespace-nowrap tabular-nums">
                            {row.yourBestRaw.toFixed(1)}
                          </td>

                          {/* platform top */}
                          <td className="py-3 px-2 text-right text-gray-500 whitespace-nowrap tabular-nums">
                            {row.globalBestRaw.toFixed(1)}
                          </td>

                          {/* standing bar */}
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden min-w-[60px]">
                                <div
                                  className={`bar-fill h-full rounded-full ${
                                    youLead
                                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs whitespace-nowrap tabular-nums ${
                                  youLead
                                    ? 'text-amber-600 font-semibold'
                                    : 'text-gray-500'
                                }`}
                              >
                                {youLead ? 'Top 👑' : `−${gap.toFixed(1)}`}
                              </span>
                            </div>
                          </td>

                          {/* streak */}
                          <td className="py-3 px-2 pr-5 text-right whitespace-nowrap">
                            <span className="font-semibold text-gray-900">
                              🔥 {row.yourCurrentStreak}
                            </span>
                            <span className="text-gray-400 text-xs ml-2">
                              best {row.yourBestStreak}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500">
            Scores are correct answers per minute (c/min), measured against all platform users. The standing
            bar fills as you approach the platform top; the figure is how many c/min you are off it. Streaks
            are counted by calendar day in Europe/London &mdash; multiple attempts in a day count as one day. 
          </p>
        </div>
      </div>
    </div>
  );
}
