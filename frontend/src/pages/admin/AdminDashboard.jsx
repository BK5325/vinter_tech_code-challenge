import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';

const StatCard = ({ label, value, icon, colorClass }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value" style={{ color: colorClass }}>{value ?? '—'}</div>
    <div className="stat-icon" aria-hidden="true">{icon}</div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then((d) => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-container">
      <div className="loading-page"><div className="spinner spinner-lg" /><span>Loading dashboard...</span></div>
    </div>
  );

  const s = stats || {};
  const sec = s.scores || {};

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Platform overview and recent activity</p>
      </div>

      {/* User Stats */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '0.75rem' }}>Users</h2>
        <div className="stats-grid">
          <StatCard label="Total Users" value={s.users?.total} icon="👥" colorClass="var(--color-primary-300)" />
          <StatCard label="Participants" value={s.users?.participants} icon="🎓" colorClass="var(--color-accent-400)" />
          <StatCard label="Staff" value={s.users?.staff} icon="👔" colorClass="var(--color-info-500)" />
          <StatCard label="Admins" value={s.users?.admins} icon="🔑" colorClass="var(--color-warning-500)" />
        </div>
      </div>

      {/* Challenge Stats */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '0.75rem' }}>Challenges</h2>
        <div className="stats-grid">
          <StatCard label="Active Challenges" value={s.challenges?.active} icon="⚡" colorClass="var(--color-success-500)" />
          <StatCard label="Completed" value={s.challenges?.completed} icon="✅" colorClass="var(--color-success-600)" />
          <StatCard label="Active Attempts" value={s.attempts?.active} icon="📝" colorClass="var(--color-warning-500)" />
          <StatCard label="Total Submissions" value={s.attempts?.total} icon="📊" colorClass="var(--color-primary-400)" />
        </div>
      </div>

      {/* Score Stats */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '0.75rem' }}>Performance</h2>
        <div className="stats-grid">
          <StatCard label="Average Score (%)" value={sec.avgPercentage ? `${sec.avgPercentage.toFixed(1)}%` : '—'} icon="📈" colorClass="var(--color-success-500)" />
          <StatCard label="Highest Score (%)" value={sec.highestPercentage ? `${sec.highestPercentage.toFixed(1)}%` : '—'} icon="🏆" colorClass="var(--color-warning-500)" />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '0.75rem' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/challenges/new" className="btn btn-primary">➕ New Challenge</Link>
          <Link to="/admin/users" className="btn btn-secondary">👥 Manage Users</Link>
          <Link to="/admin/reports" className="btn btn-secondary">📈 View Reports</Link>
          <Link to="/admin/security" className="btn btn-secondary">🛡️ Security Events</Link>
        </div>
      </div>

      {/* Recent Security Events */}
      {s.recentSecurityEvents?.length > 0 && (
        <div>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '0.75rem' }}>Recent Security Events</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Event</th>
                  <th>Severity</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {s.recentSecurityEvents.map((ev) => (
                  <tr key={ev._id}>
                    <td>{ev.userId?.name || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{ev.eventType}</td>
                    <td>
                      <span className={`badge badge-${ev.severity === 'HIGH' ? 'danger' : ev.severity === 'MEDIUM' ? 'warning' : 'info'}`}>
                        {ev.severity}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{new Date(ev.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <Link to="/admin/security" className="btn btn-ghost btn-sm">View all security events →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
