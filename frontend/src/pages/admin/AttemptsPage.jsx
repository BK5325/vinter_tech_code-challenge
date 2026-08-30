import React, { useEffect, useState } from 'react';
import { attemptService } from '../../services/attemptService';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

const statusBadge = { NOT_STARTED: 'gray', IN_PROGRESS: 'warning', SUBMITTED: 'success', AUTO_SUBMITTED: 'info', ABANDONED: 'danger' };

export default function AttemptsPage() {
  const [attempts, setAttempts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [resetConfirm, setResetConfirm] = useState(null);
  const toast = useToast();

  const fetch = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const d = await attemptService.getAll(params);
      setAttempts(d.data.attempts);
      setTotal(d.data.total);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page, statusFilter]);

  const handleReset = async (id) => {
    try {
      await adminService.resetAttempt(id);
      toast.success('Attempt reset. Participant can retake the challenge.');
      setResetConfirm(null);
      fetch();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">📝 Attempts</h1>
        <p className="page-subtitle">{total} total attempts</p>
      </div>
      <div className="card mb-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ minWidth: 180 }}>
          <label className="form-label">Status</label>
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'ABANDONED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={fetch}>Refresh</button>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Participant</th><th>Challenge</th><th>Status</th><th>Score</th><th>Violations</th><th>Submitted</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              : attempts.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-3)' }}>No attempts found.</td></tr>
              : attempts.map((a) => (
                <tr key={a._id}>
                  <td><div style={{ fontWeight: 600 }}>{a.userId?.name}</div><div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{a.userId?.email}</div></td>
                  <td style={{ color: 'var(--color-text-2)' }}>{a.challengeId?.title}</td>
                  <td><span className={`badge badge-${statusBadge[a.status]}`}>{a.status}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary-300)' }}>{['SUBMITTED','AUTO_SUBMITTED'].includes(a.status) ? `${a.score}/${a.totalMarks}` : '—'}</td>
                  <td style={{ color: a.violationCount > 0 ? 'var(--color-warning-500)' : 'var(--color-text-3)' }}>{a.violationCount}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {['SUBMITTED','AUTO_SUBMITTED'].includes(a.status) && (
                        <button className="btn btn-sm btn-danger" onClick={() => setResetConfirm(a)} title="Reset attempt">↺ Reset</button>
                      )}
                    </div>
                  </td>
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
      {resetConfirm && (
        <div className="modal-overlay" onClick={() => setResetConfirm(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">⚠️ Reset Attempt</h2>
              <p style={{ color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                Reset {resetConfirm.userId?.name}'s attempt for "{resetConfirm.challengeId?.title}"? This will delete the attempt and allow a retake.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setResetConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleReset(resetConfirm._id)}>Reset Attempt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
