import React, { useEffect, useState, useCallback } from 'react';
import { securityService } from '../../services/adminService';

const severityBadge = { INFO: 'info', LOW: 'gray', MEDIUM: 'warning', HIGH: 'danger' };

export default function SecurityEventsPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState('');
  const [eventType, setEventType] = useState('');
  const [page, setPage] = useState(1);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (severity) params.severity = severity;
      if (eventType) params.eventType = eventType;
      const d = await securityService.getAll(params);
      setEvents(d.data.events);
      setTotal(d.data.total);
    } catch {} finally { setLoading(false); }
  }, [page, severity, eventType]);

  useEffect(() => { fetch(); }, [fetch]);

  const EVENT_TYPES = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'RIGHT_CLICK', 'KEYBOARD_SHORTCUT', 'PAGE_REFRESH', 'NETWORK_DISCONNECT', 'NETWORK_RECONNECT', 'CHALLENGE_ABANDONED'];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">🛡️ Security Events</h1>
        <p className="page-subtitle">Browser-based assessment security monitoring. These events represent best-effort browser detection and do not constitute confirmed violations.</p>
      </div>
      <div className="alert alert-dark alert-info mb-4">
        <span>ℹ️</span>
        <span>Security events are logged from browser APIs. They indicate potential concerns but cannot confirm intent. Always review context before acting on security data.</span>
      </div>
      <div className="card mb-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ minWidth: 180 }}>
          <label className="form-label">Event Type</label>
          <select className="form-select" value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 140 }}>
          <label className="form-label">Severity</label>
          <select className="form-select" value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {['INFO', 'LOW', 'MEDIUM', 'HIGH'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={fetch}>Refresh</button>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>User</th><th>Event Type</th><th>Severity</th><th>Challenge</th><th>Time</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              : events.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-3)' }}>No security events found.</td></tr>
              : events.map((ev) => (
                <tr key={ev._id}>
                  <td><div style={{ fontWeight: 600 }}>{ev.userId?.name || '—'}</div><div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{ev.userId?.email}</div></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>{ev.eventType}</span></td>
                  <td><span className={`badge badge-${severityBadge[ev.severity]}`}>{ev.severity}</span></td>
                  <td style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>{ev.challengeId?.title || '—'}</td>
                  <td style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>{new Date(ev.timestamp).toLocaleString()}</td>
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
