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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Leaderboard
          </h1>

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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Your quizzes
            </h3>

            {loading && (
              <span className="text-sm text-gray-500">Loading…</span>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="text-gray-600">
              No attempts yet. Complete a quiz to join the leaderboard!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4">Quiz</th>
                    <th className="py-2 px-4">Your best (c/min)</th>
                    <th className="py-2 px-4">Global best (c/min)</th>
                    <th className="py-2 px-4">Your best streak (days)</th>
                    <th className="py-2 pl-4">Current streak (days)</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const youLeadFluency = row.yourBestRaw >= row.globalBestRaw;

                    return (
                      <tr key={row.quiz_id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium text-gray-900">
                          {row.title}
                        </td>

                        <td className="py-2 px-4">
                          {row.yourBestRaw.toFixed(1)}
                        </td>

                        <td className="py-2 px-4">
                          {row.globalBestRaw.toFixed(1)}

                          {youLeadFluency && (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                              👑
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-4">{row.yourBestStreak}</td>

                        <td className="py-2 pl-4">{row.yourCurrentStreak}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className="mt-3 text-xs text-gray-500">
                Streaks are counted by calendar day in Europe/London. Multiple
                attempts in a day count as one day. Top scorers are entered into
                the monthly prize draw. Good times make good times (i.e.,
                prizes!)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
