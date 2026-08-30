import React, { useEffect, useState, useCallback } from 'react';
import { rankingService } from '../../services/adminService';
import { challengeService } from '../../services/challengeService';

export default function RankingsPage() {
  const [rankings, setRankings] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [challengeId, setChallengeId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    challengeService.getAll({ status: 'ACTIVE' }).then((d) => setChallenges(d.data.challenges)).catch(() => {});
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const d = challengeId ? await rankingService.getByChallenge(challengeId) : await rankingService.getAll();
      setRankings(d.data.rankings);
    } catch {} finally { setLoading(false); }
  }, [challengeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const medalColor = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">🥇 Rankings</h1>
      </div>
      <div className="card mb-4" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ minWidth: 300 }}>
          <label className="form-label">Filter by Challenge</label>
          <select className="form-select" value={challengeId} onChange={(e) => setChallengeId(e.target.value)}>
            <option value="">All Challenges</option>
            {challenges.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={fetch}>Refresh</button>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Rank</th><th>Participant</th><th>Challenge</th><th>Score</th><th>%</th><th>Correct</th><th>Time</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              : rankings.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-3)' }}>No rankings yet.</td></tr>
              : rankings.map((r) => (
                <tr key={r.attemptId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {r.rank <= 3 ? <span style={{ fontSize: '1.25rem' }}>{['🥇','🥈','🥉'][r.rank - 1]}</span> : null}
                      <span style={{ fontWeight: 700, fontSize: r.rank <= 3 ? '1.1rem' : '1rem', color: r.rank <= 3 ? medalColor[r.rank - 1] : 'var(--color-text-2)' }}>#{r.rank}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.participant?.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{r.participant?.institution}</div>
                  </td>
                  <td style={{ color: 'var(--color-text-2)' }}>{r.challenge?.title}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-300)' }}>{r.score} / {r.challenge?.totalMarks}</td>
                  <td><span style={{ color: r.percentage >= 80 ? 'var(--color-success-500)' : r.percentage >= 50 ? 'var(--color-warning-500)' : 'var(--color-danger-500)', fontWeight: 700 }}>{r.percentage?.toFixed(1)}%</span></td>
                  <td style={{ color: 'var(--color-success-500)' }}>{r.correctCount}</td>
                  <td style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>{Math.floor(r.timeTaken / 60)}m {r.timeTaken % 60}s</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
