import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { resultService } from '../../services/adminService';

export default function ScoresPage() {
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const d = await resultService.getAll({ page, limit: 20 });
      setResults(d.data.results);
      setTotal(d.data.total);
    } catch {} finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">🎯 Scores</h1>
        <p className="page-subtitle">{total} submissions total</p>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Participant</th><th>Challenge</th><th>Score</th><th>%</th><th>Correct</th><th>Wrong</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              : results.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-3)' }}>No submissions yet.</td></tr>
              : results.map((r) => (
                <tr key={r._id}>
                  <td><div style={{ fontWeight: 600 }}>{r.userId?.name}</div><div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{r.userId?.email}</div></td>
                  <td style={{ color: 'var(--color-text-2)' }}>{r.challengeId?.title}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-300)' }}>{r.score} / {r.totalMarks}</td>
                  <td><span style={{ color: r.percentage >= 80 ? 'var(--color-success-500)' : r.percentage >= 50 ? 'var(--color-warning-500)' : 'var(--color-danger-500)', fontWeight: 700 }}>{r.percentage?.toFixed(1)}%</span></td>
                  <td style={{ color: 'var(--color-success-500)' }}>{r.correctCount}</td>
                  <td style={{ color: 'var(--color-danger-500)' }}>{r.wrongCount}</td>
                  <td style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>{Math.floor(r.timeTaken / 60)}m {r.timeTaken % 60}s</td>
                  <td><span className={`badge badge-${r.status === 'SUBMITTED' ? 'success' : 'warning'}`}>{r.status === 'AUTO_SUBMITTED' ? 'AUTO' : 'SUBMITTED'}</span></td>
                  <td><Link to={`/dashboard/result/${r._id}`} className="btn btn-sm btn-secondary">View</Link></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {Math.ceil(total / 20) > 1 && (
        <div className="pagination mt-4" style={{ justifyContent: 'center' }}>
          <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span className="page-info">{page} / {Math.ceil(total / 20)}</span>
          <button className="page-btn" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}
    </div>
  );
}
