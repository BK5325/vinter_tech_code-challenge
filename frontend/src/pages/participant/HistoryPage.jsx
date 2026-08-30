import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resultService } from '../../services/adminService';

export default function HistoryPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    resultService.getAll({ page, limit: 10 })
      .then((d) => { setResults(d.data.results); setTotal(d.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">📋 My History</h1>
        <p className="page-subtitle">Your past challenge submissions</p>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner spinner-lg" /></div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No submissions yet</div>
          <div className="empty-state-desc">Complete a challenge to see your history here.</div>
          <Link to="/dashboard/challenges" className="btn btn-primary mt-4">Browse Challenges</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {results.map((r) => {
              const pct = r.percentage?.toFixed(1);
              const color = r.percentage >= 80 ? 'var(--color-success-500)' : r.percentage >= 50 ? 'var(--color-warning-500)' : 'var(--color-danger-500)';
              return (
                <div key={r._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{r.challengeId?.title}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}
                      {r.status === 'AUTO_SUBMITTED' && <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>Auto-submitted</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{pct}%</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{r.score}/{r.totalMarks}</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success-500)' }}>{r.correctCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Correct</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-danger-500)' }}>{r.wrongCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Wrong</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-2)' }}>{Math.floor(r.timeTaken / 60)}m {r.timeTaken % 60}s</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Time</div>
                    </div>
                    <Link to={`/dashboard/result/${r._id}`} className="btn btn-sm btn-secondary">View Result →</Link>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="pagination mt-4" style={{ justifyContent: 'center' }}>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
