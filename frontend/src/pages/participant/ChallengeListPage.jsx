import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { challengeService } from '../../services/challengeService';

export default function ChallengeListPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    challengeService.getAll({ search, status: 'ACTIVE' })
      .then((d) => setChallenges(d.data.challenges))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">🏆 Available Challenges</h1>
        <p className="page-subtitle">All challenges currently open for participation</p>
      </div>

      <div className="card mb-4">
        <div className="form-group">
          <label htmlFor="challenge-list-search" className="form-label">Search Challenges</label>
          <input id="challenge-list-search" type="text" className="form-input" placeholder="Search by title or description..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner spinner-lg" /></div>
      ) : challenges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <div className="empty-state-title">No challenges available</div>
          <div className="empty-state-desc">Check back later — new challenges will appear here when published.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {challenges.map((c) => (
            <div key={c._id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--color-primary-500), var(--color-accent-500))' }} />
              <div style={{ paddingTop: '0.25rem' }}>
                <h3 style={{ fontSize: '1.0625rem', marginBottom: '0.5rem' }}>{c.title}</h3>
                {c.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', marginBottom: '1rem', lineHeight: 1.6 }}>
                    {c.description.slice(0, 100)}{c.description.length > 100 ? '...' : ''}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span className="badge badge-gray">⏱ {c.duration} min</span>
                  <span className="badge badge-gray">❓ {c.totalQuestions} questions</span>
                  <span className="badge badge-gray">🎯 {c.totalMarks} marks</span>
                  {c.negativeMarking && <span className="badge badge-warning">-ve marking</span>}
                </div>
                <Link to={`/challenge/${c._id}/instructions`} className="btn btn-primary btn-full">
                  Start Challenge →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
