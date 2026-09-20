'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type LeaderRow = {
  quiz_id: string;
  title: string;
  yourBestRaw: number;     // best fluency (you)
  globalBestRaw: number;   // best fluency (global)
  yourBestStreak: number;  // best daily streak (you, per quiz)
  yourCurrentStreak: number; // current daily streak (you, per quiz)
};

// --- helpers (Europe/London day bucketing + streaks) ---
const toLondonDateKey = (iso: string) => {
  // ISO -> Europe/London local calendar day "YYYY-MM-DD"
  const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Europe/London' }));
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

function computeBestAndCurrentStreak(londonDayKeys: string[]): { best: number; current: number } {
  if (londonDayKeys.length === 0) return { best: 0, current: 0 };

  const uniq = Array.from(new Set(londonDayKeys)).sort(); // de-dupe per day, ascending

  // best streak over the series
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

  // current streak anchored at today if played today, else yesterday if played yesterday
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
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/'); return; }

    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        // 1) Your attempts (quiz-specific scope: only quizzes you've actually played)
        const { data: attempts, error } = await supabase
          .from('quiz_attempts')
          .select(`
            quiz_id,
            fluency_rate,
            completed_at,
            quizzes!inner(title)
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        // 2) Aggregate your best fluency per quiz + collect day keys per quiz for streaks
        type Yours = { title: string; bestFluency: number; days: string[] };
        const yourByQuiz = new Map<string, Yours>();

        (attempts || []).forEach((a: any) => {
          const qid = a.quiz_id as string;
          const quizRelation = Array.isArray(a.quizzes) ? a.quizzes[0] : a.quizzes;
          const title = quizRelation?.title ?? 'Untitled pack';
          const prev = yourByQuiz.get(qid);
          const dayKey = toLondonDateKey(a.completed_at);
          if (!prev) {
            yourByQuiz.set(qid, { title, bestFluency: a.fluency_rate ?? 0, days: [dayKey] });
          } else {
            prev.bestFluency = Math.max(prev.bestFluency, a.fluency_rate ?? 0);
            prev.days.push(dayKey);
          }
        });

        const quizIds = Array.from(yourByQuiz.keys());
        if (quizIds.length === 0) { setRows([]); return; }

        // 3) Global best fluency for these quizzes (keep your existing RPC)
        const { data: gbRows, error: gErr } = await supabase.rpc('get_global_bests', { quiz_ids: quizIds });
        if (gErr) throw gErr;
        const globalBestFluency = new Map<string, number>();
        (gbRows || []).forEach((r: any) => {
          globalBestFluency.set(r.quiz_id, Number(r.global_best) || 0);
        });

        // 4) Compose rows incl. your streaks (no global streaks)
        const composed: LeaderRow[] = quizIds
          .map(qid => {
            const y = yourByQuiz.get(qid)!;
            const { best: yourBestStreak, current: yourCurrentStreak } = computeBestAndCurrentStreak(y.days);
            return {
              quiz_id: qid,
              title: y.title,
              yourBestRaw: y.bestFluency,
              globalBestRaw: globalBestFluency.get(qid) ?? y.bestFluency,
              yourBestStreak,
              yourCurrentStreak
            };
          })
          // 🔽 sort by your best fluency (descending)
          .sort((a, b) => b.yourBestRaw - a.yourBestRaw);

        setRows(composed);
      } catch (e) {
        console.error('Leaderboard error:', e);
        setLoadError(true);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, router]);

  const topSpots = rows.filter(row => row.yourBestRaw >= row.globalBestRaw).length;
  const longestStreak = rows.length ? Math.max(...rows.map(row => row.yourBestStreak)) : 0;
  const activeStreak = rows.length ? Math.max(...rows.map(row => row.yourCurrentStreak)) : 0;

  return (
    <div className="bl-page bl-leaderboard-page">
      <header className="bl-header bl-category-header">
        <div className="bl-container bl-header-inner">
          <Link href="/" className="bl-wordmark" aria-label="BehaviorLingo home">
            <span className="bl-wordmark-mark">BL</span>
            <span>behavior<span>lingo</span></span>
          </Link>
          <nav className="bl-progress-nav" aria-label="Leaderboard navigation">
            <Link href="/progress">Progress</Link>
            <Link href="/">Home</Link>
          </nav>
        </div>
      </header>

      <main className="bl-container bl-leaderboard-main">
        <section className="bl-leaderboard-intro">
          <div>
            <p className="bl-kicker">Performance board</p>
            <h1>Set the pace.</h1>
            <p>Compare your best fluency timings with the strongest recorded performance for each pack—and keep your practice streak moving.</p>
          </div>
          <div className="bl-board-status" aria-label="Leaderboard status">
            <i aria-hidden="true" />
            <span>{loading ? 'Syncing records' : `${rows.length} pack${rows.length === 1 ? '' : 's'} tracked`}</span>
          </div>
        </section>

        {!loading && rows.length > 0 && (
          <section className="bl-leaderboard-summary" aria-label="Leaderboard summary">
            <div>
              <span>Top scores held</span>
              <strong>{String(topSpots).padStart(2, '0')}</strong>
              <p>{topSpots === 1 ? 'One crown currently yours' : `${topSpots} crowns currently yours`}</p>
            </div>
            <div>
              <span>Longest streak</span>
              <strong>{longestStreak}<small> days</small></strong>
              <p>Your best run across all packs</p>
            </div>
            <div className={activeStreak > 0 ? 'is-active' : ''}>
              <span>Active streak</span>
              <strong>{activeStreak}<small> days</small></strong>
              <p>{activeStreak > 0 ? 'Practice chain active' : 'Complete a timing to restart'}</p>
            </div>
          </section>
        )}

        <section className="bl-leaderboard-panel">
          <div className="bl-panel-heading bl-panel-heading-compact">
            <div>
              <p className="bl-kicker">Your fluency packs</p>
              <h2>Personal records</h2>
            </div>
            <span className="bl-board-units">Correct / minute</span>
          </div>

          {loading ? (
            <div className="bl-board-message" aria-live="polite">
              <div className="bl-loader" aria-hidden="true"><span /><span /><span /><span /></div>
              <strong>Reading the performance board…</strong>
              <p>Your personal bests and current streaks are being calculated.</p>
            </div>
          ) : loadError ? (
            <div className="bl-board-message is-error" role="alert">
              <span>BOARD_SYNC_ERROR</span>
              <strong>The leaderboard could not be loaded.</strong>
              <p>Refresh the page to try again. Your recorded attempts have not been changed.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="bl-board-message">
              <span>NO_TIMINGS_RECORDED</span>
              <strong>Your first score starts the board.</strong>
              <p>Complete a fluency pack and its personal best will appear here automatically.</p>
              <Link href="/" className="bl-button">Choose a pack <span>→</span></Link>
            </div>
          ) : (
            <>
              <div className="bl-leaderboard-table-wrap">
                <table className="bl-leaderboard-table">
                  <thead>
                    <tr>
                      <th>Fluency pack</th>
                      <th>Your best</th>
                      <th>Board best</th>
                      <th>Best streak</th>
                      <th>Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const youLeadFluency = row.yourBestRaw >= row.globalBestRaw;
                      return (
                        <tr key={row.quiz_id} className={youLeadFluency ? 'is-leading' : ''}>
                          <td>
                            <span className="bl-board-index">{String(index + 1).padStart(2, '0')}</span>
                            <strong>{row.title}</strong>
                          </td>
                          <td><b>{row.yourBestRaw.toFixed(1)}</b></td>
                          <td>
                            <b>{row.globalBestRaw.toFixed(1)}</b>
                            {youLeadFluency && <span className="bl-crown-badge"><i>♛</i> Top score</span>}
                          </td>
                          <td>{row.yourBestStreak} <small>days</small></td>
                          <td>{row.yourCurrentStreak} <small>days</small></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bl-leaderboard-cards">
                {rows.map((row, index) => {
                  const youLeadFluency = row.yourBestRaw >= row.globalBestRaw;
                  return (
                    <article key={row.quiz_id} className={youLeadFluency ? 'is-leading' : ''}>
                      <header>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <h3>{row.title}</h3>
                        {youLeadFluency && <span className="bl-crown-badge" aria-label="You hold the top score"><i>♛</i> Top</span>}
                      </header>
                      <div className="bl-mobile-scoreline">
                        <div><span>Your best</span><strong>{row.yourBestRaw.toFixed(1)}</strong></div>
                        <div><span>Board best</span><strong>{row.globalBestRaw.toFixed(1)}</strong></div>
                      </div>
                      <footer>
                        <span>Best streak <b>{row.yourBestStreak}d</b></span>
                        <span>Current <b>{row.yourCurrentStreak}d</b></span>
                      </footer>
                    </article>
                  );
                })}
              </div>

              <div className="bl-board-note">
                <span aria-hidden="true">i</span>
                <p>Streaks use Europe/London calendar days; multiple attempts in one day count once. Top scorers are entered into the monthly prize draw. Good times make good times.</p>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
