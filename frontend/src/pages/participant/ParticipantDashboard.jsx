import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { challengeService } from '../../services/challengeService';
import { resultService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [challenges, setChallenges] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      challengeService.getAll({ limit: 5 }),
      resultService.getAll({ limit: 5 }),
    ]).then(([c, r]) => {
      setChallenges(c?.data?.challenges || []);
      setResults(r?.data?.results || []);
    }).catch((err) => {
      console.error(err);
      toast.error(err.message || 'Failed to load dashboard data');
    }).finally(() => setLoading(false));
  }, [toast]);

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'P';

  return (
    <div className="page-container animate-fade-in">
      {/* Welcome */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, var(--color-primary-900) 0%, var(--color-surface-2) 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', color: 'white', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
            <p style={{ color: 'var(--color-text-3)', margin: 0 }}>{user?.institution ? `${user.institution}${user?.course ? ` · ${user.course}` : ''}` : 'Ready to challenge yourself?'}</p>
          </div>
          <Link to="/dashboard/challenges" className="btn btn-primary" style={{ marginLeft: 'auto' }}>View Challenges</Link>
        </div>
      </div>

      {/* Available Challenges */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>🏆 Available Challenges</h2>
          <Link to="/dashboard/challenges" className="btn btn-ghost btn-sm">View all →</Link>
        </div>
        {loading ? <div className="loading-page" style={{ minHeight: 100 }}><div className="spinner" /></div>
          : challenges.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">🏆</div>
              <div className="empty-state-title">No challenges available</div>
              <div className="empty-state-desc">Check back later for new challenges.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {challenges.map((c) => (
                <div key={c._id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--color-primary-500), var(--color-accent-500))' }} />
                  <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{c.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', marginBottom: '1rem', margin: '0 0 1rem' }}>{c.description?.slice(0, 80)}{c.description?.length > 80 ? '...' : ''}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-gray">⏱ {c.duration} min</span>
                    <span className="badge badge-gray">❓ {c.totalQuestions} questions</span>
                    <span className="badge badge-gray">🏆 {c.totalMarks} marks</span>
                  </div>
                  <Link to={`/challenge/${c._id}/instructions`} className="btn btn-primary btn-full">Start Challenge →</Link>
                </div>
              ))}
            </div>
          )}
      </section>

      {/* Recent Results */}
      {results.length > 0 && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>📊 Recent Results</h2>
            <Link to="/dashboard/history" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Challenge</th><th>Score</th><th>%</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600 }}>{r.challengeId?.title}</td>
                    <td>{r.score}/{r.totalMarks}</td>
                    <td><span style={{ fontWeight: 700, color: r.percentage >= 80 ? 'var(--color-success-500)' : r.percentage >= 50 ? 'var(--color-warning-500)' : 'var(--color-danger-500)' }}>{r.percentage?.toFixed(1)}%</span></td>
                    <td><span className={`badge badge-${r.status === 'SUBMITTED' ? 'success' : 'warning'}`}>{r.status === 'AUTO_SUBMITTED' ? 'AUTO' : 'SUBMITTED'}</span></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{new Date(r.submittedAt).toLocaleDateString()}</td>
                    <td><Link to={`/dashboard/result/${r._id}`} className="btn btn-sm btn-secondary">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
