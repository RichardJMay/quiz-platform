'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type LeaderRow = {
  quiz_id: string;
  title: string;
  yourBest: number;
  globalBest: number;
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/'); return; }

    (async () => {
      setLoading(true);
      try {
        // Your attempts (to find quizzes you've actually played)
        const { data: attempts, error } = await supabase
          .from('quiz_attempts')
          .select(`
            quiz_id,
            fluency_rate,
            quizzes!inner(title)
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        // Your best per quiz
        const yourBest = new Map<string, { title: string; best: number }>();
        (attempts || []).forEach(a => {
          const prev = yourBest.get(a.quiz_id)?.best ?? -Infinity;
          if (a.fluency_rate > prev) {
            yourBest.set(a.quiz_id, {
              title: (a as any).quizzes?.title ?? 'Untitled quiz',
              best: a.fluency_rate,
            });
          }
        });

        const quizIds = Array.from(yourBest.keys());
        if (quizIds.length === 0) {
          setRows([]);
          return;
        }

        // Global best per those quizzes (simple & robust: compute on client)
        const { data: allForThese, error: gErr } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, fluency_rate')
          .in('quiz_id', quizIds);

        if (gErr) throw gErr;

        const globalBest = new Map<string, number>();
        (allForThese || []).forEach(r => {
          const prev = globalBest.get(r.quiz_id) ?? -Infinity;
          if (r.fluency_rate > prev) globalBest.set(r.quiz_id, r.fluency_rate);
        });

        const composed: LeaderRow[] = quizIds
          .map(qid => ({
            quiz_id: qid,
            title: yourBest.get(qid)!.title,
            yourBest: Number(yourBest.get(qid)!.best.toFixed(1)),
            globalBest: Number((globalBest.get(qid) ?? yourBest.get(qid)!.best).toFixed(1)),
          }))
          .sort((a, b) => a.title.localeCompare(b.title));

        setRows(composed);
      } catch (e) {
        console.error('Leaderboard error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Leaderboard</h1>
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

      {/* Table */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Your quizzes</h3>
            {loading && <span className="text-sm text-gray-500">Loading…</span>}
          </div>

          {rows.length === 0 ? (
            <p className="text-gray-600">No attempts yet. Complete a quiz to join the leaderboard!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4">Quiz</th>
                    <th className="py-2 px-4">Your best (c/min)</th>
                    <th className="py-2 px-4">Global best (c/min)</th>
                    <th className="py-2 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const youLead = row.yourBest >= row.globalBest;
                    return (
                      <tr key={row.quiz_id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium text-gray-900">{row.title}</td>
                        <td className="py-2 px-4">{row.yourBest.toFixed(1)}</td>
                        <td className="py-2 px-4">{row.globalBest.toFixed(1)}</td>
                        <td className="py-2 pl-4">
                          {youLead ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                              👑 Top score!
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                              🎯 Beat {row.globalBest.toFixed(1)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className="mt-3 text-xs text-gray-500">
                Top scorers are entered into our monthly prize draw. (T&Cs apply)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
