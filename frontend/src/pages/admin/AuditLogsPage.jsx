import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../services/adminService';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (actionFilter) params.action = actionFilter;
      const d = await adminService.getAuditLogs(params);
      setLogs(d.data.logs);
      setTotal(d.data.total);
    } catch {} finally { setLoading(false); }
  }, [page, actionFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const ACTIONS = ['USER_REGISTER', 'USER_LOGIN', 'USER_LOGOUT', 'ROLE_CHANGE', 'CHALLENGE_CREATE', 'CHALLENGE_UPDATE', 'CHALLENGE_DELETE', 'CHALLENGE_ACTIVATE', 'ATTEMPT_START', 'ATTEMPT_SUBMIT', 'ATTEMPT_AUTO_SUBMIT', 'ATTEMPT_RESET', 'EXPORT_DATA'];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">📋 Audit Logs</h1>
        <p className="page-subtitle">Immutable log of all sensitive platform actions — {total} records</p>
      </div>
      <div className="card mb-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ minWidth: 220 }}>
          <label className="form-label">Filter by Action</label>
          <select className="form-select" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={fetch}>Refresh</button>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>User</th><th>Action</th><th>Description</th><th>IP</th><th>Time</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              : logs.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-3)' }}>No logs found.</td></tr>
              : logs.map((log) => (
                <tr key={log._id}>
                  <td><div style={{ fontWeight: 600 }}>{log.userId?.name || log.userEmail || 'System'}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>{log.userEmail}</div></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-primary-300)' }}>{log.action}</span></td>
                  <td style={{ color: 'var(--color-text-2)', fontSize: '0.875rem' }}>{log.description}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{log.ipAddress || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {Math.ceil(total / 30) > 1 && (
        <div className="pagination mt-4" style={{ justifyContent: 'center' }}>
          <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span className="page-info">{page} / {Math.ceil(total / 30)}</span>
          <button className="page-btn" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}
    </div>
  );
}
