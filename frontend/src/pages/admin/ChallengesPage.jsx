import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { challengeService } from '../../services/challengeService';
import { useToast } from '../../context/ToastContext';

const statusBadge = { DRAFT: 'gray', ACTIVE: 'success', INACTIVE: 'warning', COMPLETED: 'info', ARCHIVED: 'gray' };

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null); // { type, challenge }
  const toast = useToast();
  const navigate = useNavigate();

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const d = await challengeService.getAll(params);
      setChallenges(d.data.challenges);
      setTotal(d.data.total);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  const handleAction = async (type, id) => {
    try {
      if (type === 'activate') { await challengeService.activate(id); toast.success('Challenge activated.'); }
      else if (type === 'deactivate') { await challengeService.deactivate(id); toast.success('Challenge deactivated.'); }
      else if (type === 'delete') { await challengeService.delete(id); toast.success('Challenge deleted.'); }
      setConfirm(null);
      fetchChallenges();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">Challenges</h1>
          <p className="page-subtitle">{total} challenges total</p>
        </div>
        <Link to="/admin/challenges/new" className="btn btn-primary">➕ New Challenge</Link>
      </div>

      <div className="card mb-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="challenge-search" className="form-label">Search</label>
          <input id="challenge-search" type="text" className="form-input" placeholder="Challenge title..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="form-group" style={{ minWidth: 150 }}>
          <label htmlFor="chal-status-filter" className="form-label">Status</label>
          <select id="chal-status-filter" className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {['DRAFT', 'ACTIVE', 'INACTIVE', 'COMPLETED', 'ARCHIVED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={fetchChallenges}>Refresh</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Duration</th>
              <th>Questions</th>
              <th>Total Marks</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : challenges.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">
                <div className="empty-state">
                  <div className="empty-state-icon">🏆</div>
                  <div className="empty-state-title">No challenges yet</div>
                  <div className="empty-state-desc">Create your first challenge to get started.</div>
                </div>
              </td></tr>
            ) : challenges.map((c) => (
              <tr key={c._id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{c.title}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{c.description?.slice(0, 60)}...</div>
                </td>
                <td>{c.duration} min</td>
                <td>{c.totalQuestions}</td>
                <td>{c.totalMarks}</td>
                <td><span className={`badge badge-${statusBadge[c.status]}`}>{c.status}</span></td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    <Link to={`/admin/challenges/${c._id}/edit`} className="btn btn-sm btn-secondary">✏️ Edit</Link>
                    <Link to={`/admin/challenges/${c._id}/questions`} className="btn btn-sm btn-secondary">❓ Questions</Link>
                    {c.status !== 'ACTIVE' && (
                      <button className="btn btn-sm btn-success" onClick={() => setConfirm({ type: 'activate', challenge: c })}>▶ Activate</button>
                    )}
                    {c.status === 'ACTIVE' && (
                      <button className="btn btn-sm btn-secondary" onClick={() => setConfirm({ type: 'deactivate', challenge: c })}>⏸ Deactivate</button>
                    )}
                    {c.status !== 'ACTIVE' && (
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ type: 'delete', challenge: c })}>🗑</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">Confirm Action</h2>
              <p style={{ color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                {confirm.type === 'delete' && `Delete challenge "${confirm.challenge.title}"? This cannot be undone.`}
                {confirm.type === 'activate' && `Activate challenge "${confirm.challenge.title}"?`}
                {confirm.type === 'deactivate' && `Deactivate challenge "${confirm.challenge.title}"?`}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
              <button className={`btn ${confirm.type === 'delete' ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleAction(confirm.type, confirm.challenge._id)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
